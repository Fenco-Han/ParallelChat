/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, WebContentsView, session } from 'electron';
import { getInjectionScript, getStatusCheckScript } from './ai-handlers/index';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
// Workspace矩形，由渲染器上报，用于计算 WebContentsView 布局
let workspaceBounds: { x: number; y: number; width: number; height: number } | null = null;
// 视图注册表：按 AI id 管理 WebContentsView 实例
const viewsRegistry = new Map<string, WebContentsView>();
// 已设置UA会话分区，避免重复注册拦截器
const patchedPartitions = new Set<string>();
// 工作区顶部安全区高度：避免覆盖工作区内的悬浮控制元素
const WORKSPACE_SAFE_TOP = 0;

type AiProvider = { id: string; name: string; url: string; handler?: string };

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      // 开启隔离与禁用 Node 集成，防止网页内容获得本地能力
      contextIsolation: true,
      nodeIntegration: false,
      // 沙箱提升隔离级别；启用 webSecurity 避免不安全资源加载
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.maximize();
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  // 在主窗口页面加载完成后，同步并创建已配置的 AI 视图
  mainWindow.webContents.on('did-finish-load', () => {
    try {
      syncAiViews();
      mainWindow?.webContents.send('parallelchat/ai/ready', {
        ids: Array.from(viewsRegistry.keys()),
      });

      // 启动时始终新会话：重置视图并清空活动会话
      try {
        resetViewsToDefaults();
        try { store.delete('activeSessionId'); } catch {}
        try { mainWindow?.webContents.send('parallelchat/session/changed', { activeId: undefined }); } catch {}
      } catch {}
    } catch {}
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

/**
 * Electron Store（本地持久化）与 IPC 桥
 * - 所有持久化读写集中在主进程完成；渲染器通过 IPC 调用
 * - 通过键白名单进行基本校验，避免非法键破坏结构
 */
type StoreSchema = {
  /**
   * 会话列表：保存每个对话的元数据与各 AI 视图的网页状态快照
   * - id：会话唯一标识（建议使用 uuid）
   * - title：会话标题（通常为用户的第一条提问摘要）
   * - createdAt：创建时间（ISO 字符串）
   * - aiStates：以 AI id 为键的状态快照，至少包含当前页面 url，用于恢复具体对话页
   */
  sessions?: Array<{
    /** 会话唯一标识（建议 uuid） */ id: string;
    /** 会话标题（通常为首次提问摘要） */ title: string;
    /** 创建时间（ISO 字符串） */ createdAt: string;
    /**
     * 以 AI id 为键的状态快照：
     * - url：该 AI 网站当前对话页地址，用于切换会话时恢复上下文
     */
    aiStates: Record<string, { url: string }>;
  }>;

  /**
   * 当前选中的会话 ID：用于侧边栏焦点与工作区内容同步恢复
   * - 切换会话时更新；删除当前会话时按 FSD 的焦点规则选中相邻项
   */
  activeSessionId?: string;

  /**
   * AI 服务配置列表：设置页管理的数据源
   * - id：AI 标识（如 gemini、qwen），用于 WebContentsView  与 handler 映射
   * - name：展示名称
   * - url：入口或默认聊天地址
   * - handler：注入脚本模块名（如 gemini.ts），主进程按 id 查找并注入
   */
  aiProviders?: Array<{
    /** AI 标识（用于视图与脚本映射） */ id: string;
    /** 展示名称 */ name: string;
    /** 官方入口或默认聊天页面地址 */ url: string;
    /** 注入脚本模块名（与 src/main/ai-handlers/* 对应） */ handler: string;
  }>;

  /**
   * 工作区布局状态：模式与视图顺序
   * - mode：'grid'（并行视图）或 'tabs'（标签聚焦）
   * - order：视图顺序（元素为 AI id），用于网格定位或标签排序
   */
  layout?: {
    /** 布局模式：并行网格或标签页 */ mode: 'grid' | 'tabs';
    /** 视图顺序：与 aiProviders 的 id 对齐 */ order: string[];
  };

  /**
   * 首次启动引导标志：是否已完成 onboarding
   * - 缺省或 false：主进程在页面加载完成后触发 parallelchat/onboarding/start
   * - true：不再触发引导
   */
  hasOnboarded?: boolean;
};

// 指定配置文件名称，默认存储在 app.getPath('userData') 下
const store = new Store<StoreSchema>({ name: 'parallelchat' });

// 允许读写的键集合（白名单）
const allowedKeys: Array<keyof StoreSchema> = [
  'sessions',
  'activeSessionId',
  'aiProviders',
  'layout',
  'hasOnboarded',
];

// 读取：验证键合法后返回存储值
ipcMain.handle('parallelchat/store/get', (_e, key: keyof StoreSchema) => {
  if (!allowedKeys.includes(key)) {
    throw new Error(`Invalid store key: ${String(key)}`);
  }
  return store.get(key);
});

// 写入：验证键合法后执行 set；值结构校验可按需增强
ipcMain.handle(
  'parallelchat/store/set',
  (_e, key: keyof StoreSchema, value: StoreSchema[keyof StoreSchema]) => {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Invalid store key: ${String(key)}`);
    }
    store.set(key, value as any);
  },
);

// —— 缓存清理：支持单个 AI 与全部 ——
ipcMain.on('parallelchat/cache/clear', (_e, id: string) => {
  try {
    const partition = `persist:${id}`;
    session
      .fromPartition(partition)
      .clearStorageData({
        storages: ['cookies', 'localstorage', 'serviceworkers', 'cachestorage'],
      })
      .catch(() => {});
  } catch {}
});

ipcMain.on('parallelchat/cache/clear-all', () => {
  try {
    const aiList = (store.get('aiProviders') || []) as Array<{ id: string }>;
    const ids = new Set<string>(aiList.map((p) => p.id));
    // 也包含所有已打补丁的分区
    for (const part of patchedPartitions) {
      if (part.startsWith('persist:')) ids.add(part.replace('persist:', ''));
    }
    for (const id of ids) {
      const partition = `persist:${id}`;
      session
        .fromPartition(partition)
        .clearStorageData({
          storages: ['cookies', 'localstorage', 'serviceworkers', 'cachestorage'],
        })
        .catch(() => {});
    }
  } catch {}
});

// —— 发送状态轮询：启动/聚合/日志 ——
const POLL_INTERVAL_MS = 1500;
const POLL_STABLE_FALSE_CYCLES = 2;
const POLL_TIMEOUT_MS = 120000;

let currentPollingTargets = new Set<string>();
const pollers = new Map<string, { timer: NodeJS.Timeout; cycles: number; lastReplying: boolean; stableFalse: number; startTs: number }>();

function safeStringify(x: any): string { try { return JSON.stringify(x); } catch { return '[unserializable]'; } }
function clearPoller(id: string) { const p = pollers.get(id); if (p) { try { clearInterval(p.timer); } catch {} pollers.delete(id); } }
function stopAllPolling() { for (const id of Array.from(pollers.keys())) clearPoller(id); currentPollingTargets.clear(); }
function computeAggregate() {
  const status: Record<string, boolean> = {};
  for (const id of currentPollingTargets) {
    status[id] = !!(pollers.get(id)?.lastReplying);
  }
  const isAnyReplying = Object.values(status).some(Boolean);
  try { mainWindow?.webContents.send('parallelchat/status/update', { status, isAnyReplying, targets: Array.from(currentPollingTargets) }); } catch {}
  log.info(`[parallelchat][status][update] any=${isAnyReplying} status=${safeStringify(status)}`);
  if (!isAnyReplying) {
    try { mainWindow?.webContents.send('parallelchat/status/complete', { status, isAnyReplying, targets: Array.from(currentPollingTargets), reason: 'all-complete' }); } catch {}
    stopAllPolling();
  }
}
async function pollOnce(id: string) {
  const view = viewsRegistry.get(id);
  if (!view) { log.warn(`[parallelchat][poll][${id}] view-not-found`); const p = pollers.get(id); if (p) { p.cycles += 1; p.lastReplying = false; p.stableFalse += 1; } computeAggregate(); return; }
  let res: any = undefined; let replying = false;
  try {
    const script = getStatusCheckScript(id);
    res = await view.webContents.executeJavaScript(script, true);
    // 兼容返回布尔值或对象的脚本：true/false 或 { replying: true } / { isReplying: true }
    if (typeof res === 'boolean') {
      replying = res;
    } else {
      replying = !!(res && (res.replying === true || res.isReplying === true || res.generating === true || res.busy === true));
    }
  } catch (err: any) {
    replying = false;
    res = { error: String(err?.message || err) };
    log.warn(`[parallelchat][poll][${id}] exec-error: ${String(err?.message || err)}`);
  }
  const p = pollers.get(id);
  if (!p) return;
  p.cycles += 1;
  p.lastReplying = replying;
  p.stableFalse = replying ? 0 : (p.stableFalse + 1);
  let url = '';
  try { url = view.webContents.getURL(); } catch {}
  log.info(`[parallelchat][poll][${id}] cycle=${p.cycles} replying=${replying} url=${url} payload=${safeStringify(res)}`);
  const now = Date.now();
  const elapsed = now - p.startTs;
  if (!replying && p.stableFalse >= POLL_STABLE_FALSE_CYCLES) {
    clearPoller(id);
    currentPollingTargets.delete(id);
    log.info(`[parallelchat][poll][${id}] stable-false reached; stop.`);
  }
  if (elapsed >= POLL_TIMEOUT_MS) {
    clearPoller(id);
    currentPollingTargets.delete(id);
    log.warn(`[parallelchat][poll][${id}] timeout ${POLL_TIMEOUT_MS}ms; stop.`);
  }
  computeAggregate();
}
function startPolling(targets: string[]) {
  stopAllPolling();
  currentPollingTargets = new Set(targets);
  for (const id of targets) {
    const base = { cycles: 0, lastReplying: true, stableFalse: 0, startTs: Date.now() };
    const timer = setInterval(() => { pollOnce(id).catch(() => {}); }, POLL_INTERVAL_MS);
    pollers.set(id, { ...base, timer });
  }
  computeAggregate();
}

// —— 广播：向选定 AI 视图注入文本并尝试发送 ——
ipcMain.handle(
  'parallelchat/broadcast',
  async (e, payload: { text: string; targets?: string[] }) => {
    const win = mainWindow;
    const text = payload?.text ?? '';
    const targets = payload?.targets && payload.targets.length > 0
      ? payload.targets
      : Array.from(viewsRegistry.keys());

    log.info(`[parallelchat][broadcast] textLen=${text.length} targets=${targets.join(',')}`);
    try { win?.webContents.send('parallelchat/message/sending', { targets }); } catch {}
    startPolling(targets);

    const results: Record<string, { ok: boolean; reason?: string }> = {};
    const errors: Record<string, string> = {};

    await Promise.all(
      targets.map(async (id) => {
        const view = viewsRegistry.get(id);
        if (!view) {
          results[id] = { ok: false, reason: 'view-not-found' };
          return;
        }
        try {
          const script = getInjectionScript(id, text);
          const r = await view.webContents.executeJavaScript(script, true);
          results[id] = r && typeof r === 'object' ? r : { ok: true };
        } catch (err: any) {
          results[id] = { ok: false, reason: 'inject-error' };
          errors[id] = String(err?.message || err);
        }
      })
    );

    const allOk = targets.every((id) => results[id]?.ok);
    try {
      if (allOk) {
        win?.webContents.send('parallelchat/message/success', { results });
      } else {
        win?.webContents.send('parallelchat/message/fail', { results, errors });
      }
    } catch {}

    return { results, errors };
  },
);

/**
 * —— WebContentsView  创建与布局管理 ——
 */

function ensureSessionUA(partition: string) {
  if (patchedPartitions.has(partition)) return;
  const s = session.fromPartition(partition);
  s.webRequest.onBeforeSendHeaders((details, callback) => {
    const chromeVersion = process.versions.chrome || '118.0.0.0';
    const ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    const headers = {
      ...details.requestHeaders,
      'User-Agent': ua,
      // 模拟真实浏览器的语言首选项，减少指纹异常
      'Accept-Language': `${app.getLocale() || 'zh-CN'},en;q=0.9`,
    };
    callback({ cancel: false, requestHeaders: headers });
  });
  patchedPartitions.add(partition);
}

function createAiView(ai: AiProvider): WebContentsView {
  const partition = `persist:${ai.id}`;
  ensureSessionUA(partition);

  const view = new WebContentsView({
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  view.webContents.on('did-finish-load', () => {
    // 移除自动化指纹
    view.webContents.executeJavaScript('delete navigator.webdriver;').catch(() => {});
  });

  // 加载默认入口
  try {
    view.webContents.loadURL(ai.url);
  } catch (e) {
    // 忽略加载异常，后续可上报给渲染器
  }

  // 处理登录弹窗：对 accounts.google.com 使用同分区的原生窗口进行登录
  try {
    view.webContents.setWindowOpenHandler((details) => {
      const url = details?.url || '';
      let host = '';
      try { host = new URL(url).hostname; } catch {}
      if (host.endsWith('accounts.google.com') || host.endsWith('id.google.com')) {
        // 在同分区创建一个模态登录窗口，完成后关闭并回到原视图
        const loginWin = new BrowserWindow({
          parent: mainWindow ?? undefined,
          modal: !!mainWindow,
          show: true,
          width: 900,
          height: 680,
          autoHideMenuBar: true,
          webPreferences: {
            partition,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
          },
        });

        loginWin.webContents.on('did-finish-load', () => {
          // 清理自动化指纹
          loginWin.webContents.executeJavaScript('delete navigator.webdriver;').catch(() => {});
        });

        const maybeClose = (nextUrl: string) => {
          if (!nextUrl) return;
          // 登录完成通常会跳回 gemini.google.com/app 或 google.com
          if (nextUrl.startsWith('https://gemini.google.com') || nextUrl.includes('gemini.google.com/app')) {
            try { loginWin.close(); } catch {}
            // 重新加载原视图，利用同分区下的已设置 Cookie
            try { view.webContents.loadURL(ai.url); } catch {}
          }
        };

        loginWin.webContents.on('will-redirect', (_e, nextUrl) => {
          maybeClose(nextUrl);
        });
        loginWin.webContents.on('did-navigate', (_e, nextUrl) => {
          maybeClose(nextUrl);
        });

        try { loginWin.loadURL(url); } catch {}
        return { action: 'deny' };
      }

      // 其它新窗口统一外部打开，避免遮挡
      try { shell.openExternal(url); } catch {}
      return { action: 'deny' };
    });
  } catch {}

  return view;
}

function syncAiViews() {
  const providers = (store.get('aiProviders') as AiProvider[] | undefined) ?? [];
  const ids = new Set(providers.map((p) => p.id));

  // 移除不再存在的视图
  for (const [id, view] of viewsRegistry.entries()) {
    if (!ids.has(id)) {
      try {
        mainWindow?.contentView.removeChildView(view);
      } catch {}
      viewsRegistry.delete(id);
    }
  }

  // 新增缺失的视图
  for (const p of providers) {
    if (!viewsRegistry.has(p.id)) {
      const v = createAiView(p);
      viewsRegistry.set(p.id, v);
    }
  }

  applyLayout();
}

function applyLayout() {
  if (!mainWindow || !workspaceBounds) return;

  const providers = (store.get('aiProviders') as AiProvider[] | undefined) ?? [];
  const layout = (store.get('layout') as StoreSchema['layout'] | undefined);
  const mode = layout?.mode ?? 'grid';
  const order = layout?.order && layout.order.length > 0
    ? layout.order
    : providers.map((p) => p.id);
  const orderedProviders: AiProvider[] = order
    .map((id) => providers.find((p) => p.id === id))
    .filter((p): p is AiProvider => !!p);

  // 计算安全区域后的可用矩形，避免顶端悬浮按钮被原生视图覆盖
  const safeY = workspaceBounds.y + WORKSPACE_SAFE_TOP;
  const safeHeight = Math.max(0, workspaceBounds.height - WORKSPACE_SAFE_TOP);

  // 先移除注册表中的所有视图，避免重复叠加
  try {
    for (const v of viewsRegistry.values()) {
      try { mainWindow.contentView.removeChildView(v); } catch {}
    }
  } catch {}

  if (mode === 'tabs') {
    const activeId = order[0];
    if (!activeId) return;
    const v = viewsRegistry.get(activeId);
    if (!v) return;
    mainWindow.contentView.addChildView(v);
    v.setBounds({
      x: workspaceBounds.x,
      y: safeY,
      width: workspaceBounds.width,
      height: safeHeight,
    });
    return;
  }

  // grid：简单等分为列
  const count = orderedProviders.length;
  if (count === 0) return;
  const colWidth = Math.floor(workspaceBounds.width / count);
  let x = workspaceBounds.x;
  for (const p of orderedProviders) {
    const v = viewsRegistry.get(p.id);
    if (!v) continue;
    mainWindow.contentView.addChildView(v);
    v.setBounds({
      x,
      y: safeY,
      width: colWidth,
      height: safeHeight,
    });
    x += colWidth;
  }
}

// 渲染器上报工作区矩形
ipcMain.on('parallelchat/workspace/bounds', (_e, bounds: { x: number; y: number; width: number; height: number }) => {
  workspaceBounds = bounds;
  applyLayout();
});

// 切换布局模式
ipcMain.on('parallelchat/layout/set', (_e, mode: 'grid' | 'tabs') => {
  const current = (store.get('layout') as StoreSchema['layout'] | undefined) ?? { order: [] };
  store.set('layout', { ...current, mode });
  applyLayout();
});

// 设置标签模式的激活视图：将目标 id 置于顺序首位
ipcMain.on('parallelchat/layout/active', (_e, id: string) => {
  const providers = (store.get('aiProviders') as AiProvider[] | undefined) ?? [];
  const ids = new Set(providers.map((p) => p.id));
  if (!ids.has(id)) return;
  const current = (store.get('layout') as StoreSchema['layout'] | undefined) ?? {
    mode: 'grid',
    order: providers.map((p) => p.id),
  };
  const nextOrder = [id, ...current.order.filter((x) => x !== id)];
  store.set('layout', { ...current, order: nextOrder });
  applyLayout();
});

// 依据最新 aiProviders 同步视图（供后续设置页使用）
ipcMain.on('parallelchat/ai/reload', () => {
  syncAiViews();
  mainWindow?.webContents.send('parallelchat/ai/ready', { ids: Array.from(viewsRegistry.keys()) });
});

// 刷新指定视图页面：支持默认入口与忽略缓存（可扩展）
ipcMain.on(
  'parallelchat/view/reload',
  (_e, id: string, opts?: { ignoreCache?: boolean; defaultUrl?: boolean }) => {
    try {
      const view = viewsRegistry.get(id);
      if (!view) return;
      if (opts?.defaultUrl) {
        const p = getProviders().find((x) => x.id === id);
        if (p) {
          try { view.webContents.loadURL(p.url); } catch {}
        } else {
          try { view.webContents.reload(); } catch {}
        }
      } else if (opts?.ignoreCache) {
        try { view.webContents.reloadIgnoringCache(); } catch {}
      } else {
        try { view.webContents.reload(); } catch {}
      }
    } catch {}
  }
);

// 视图显隐控制：弹窗出现时隐藏所有 WebContentsView，关闭后恢复布局
ipcMain.on('parallelchat/view/visible', (_e, visible: boolean) => {
  if (!mainWindow) return;
  try {
    if (!visible) {
      for (const v of viewsRegistry.values()) {
        try { mainWindow.contentView.removeChildView(v); } catch {}
      }
    } else {
      applyLayout();
    }
  } catch {}
});

// —— 会话管理：新会话、快照、创建、加载、更新标题、删除 ——

function getProviders(): AiProvider[] {
  return ((store.get('aiProviders') as AiProvider[] | undefined) ?? []);
}

function genId(): string {
  return 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function truncateTitle(title: string): string {
  const t = (title || '').trim();
  return t.length > 10 ? t.slice(0, 10) + '...' : t;
}

function resetViewsToDefaults() {
  try {
    const providers = getProviders();
    syncAiViews();
    for (const p of providers) {
      const v = viewsRegistry.get(p.id);
      if (!v) continue;
      try { v.webContents.loadURL(p.url); } catch {}
    }
    applyLayout();
  } catch {}
}

// 新建会话：重置所有视图到默认入口，并清空活动会话ID
ipcMain.on('parallelchat/session/new', () => {
  try {
    resetViewsToDefaults();
    try { store.delete('activeSessionId'); } catch {}
    try { mainWindow?.webContents.send('parallelchat/session/changed', { activeId: undefined }); } catch {}
  } catch {}
});

// 快照当前各视图URL
ipcMain.handle('parallelchat/session/snapshot', () => {
  const states: Record<string, { url: string }> = {};
  try {
    const providers = getProviders();
    for (const p of providers) {
      const v = viewsRegistry.get(p.id);
      if (!v) continue;
      try {
        const url = v.webContents.getURL();
        if (url) states[p.id] = { url };
      } catch {}
    }
  } catch {}
  return states;
});

// 创建会话：写入 store 并设为活动
ipcMain.handle(
  'parallelchat/session/create',
  (_e, payload: { title: string; aiStates: Record<string, { url: string }> }) => {
    try {
      const id = genId();
      const title = truncateTitle(payload?.title || '');
      const createdAt = new Date().toISOString();
      const sessions = ((store.get('sessions') as StoreSchema['sessions']) ?? []) as NonNullable<StoreSchema['sessions']>;
      const next = [...sessions, { id, title, createdAt, aiStates: payload.aiStates }];
      try { store.set('sessions', next as any); } catch {}
      try { store.set('activeSessionId', id as any); } catch {}
      try { mainWindow?.webContents.send('parallelchat/session/changed', { activeId: id }); } catch {}
      return { id };
    } catch (err) {
      return { error: String((err as any)?.message || err) };
    }
  }
);

// 加载会话：恢复各视图到保存的URL，并设为活动
ipcMain.handle('parallelchat/session/load', async (_e, id: string) => {
  try {
    const sessions = ((store.get('sessions') as StoreSchema['sessions']) ?? []) as NonNullable<StoreSchema['sessions']>;
    const s = sessions.find((x) => x.id === id);
    if (!s) return { ok: false, reason: 'not-found' };
    try { store.set('activeSessionId', id as any); } catch {}

    syncAiViews();
    const providers = getProviders();
    const providerIds = new Set(providers.map((p) => p.id));

    // 加载保存的URL
    for (const [aiId, state] of Object.entries(s.aiStates || {})) {
      const v = viewsRegistry.get(aiId);
      if (!v) continue;
      try { v.webContents.loadURL(state.url); } catch {}
    }
    // 对未出现在会话快照中的提供者，加载默认入口（保持一致性）
    for (const p of providers) {
      if (!s.aiStates || !(p.id in s.aiStates)) {
        const v = viewsRegistry.get(p.id);
        if (!v) continue;
        try { v.webContents.loadURL(p.url); } catch {}
      }
    }
    applyLayout();
    try { mainWindow?.webContents.send('parallelchat/session/changed', { activeId: id }); } catch {}
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String((err as any)?.message || err) };
  }
});

// 更新标题
ipcMain.handle('parallelchat/session/update-title', (_e, id: string, title: string) => {
  try {
    const sessions = ((store.get('sessions') as StoreSchema['sessions']) ?? []) as NonNullable<StoreSchema['sessions']>;
    const idx = sessions.findIndex((x) => x.id === id);
    if (idx < 0) return { ok: false, reason: 'not-found' };
    sessions[idx].title = String(title ?? '');
    try { store.set('sessions', sessions as any); } catch {}
    try { mainWindow?.webContents.send('parallelchat/session/changed', { activeId: store.get('activeSessionId') }); } catch {}
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String((err as any)?.message || err) };
  }
});

// 删除会话：维护活动会话与视图状态
ipcMain.handle('parallelchat/session/delete', async (_e, id: string) => {
  try {
    let sessions = ((store.get('sessions') as StoreSchema['sessions']) ?? []) as NonNullable<StoreSchema['sessions']>;
    const idx = sessions.findIndex((x) => x.id === id);
    if (idx < 0) return { ok: false, reason: 'not-found' };
    const activeId = (store.get('activeSessionId') as string | undefined) ?? undefined;
    sessions = [...sessions.slice(0, idx), ...sessions.slice(idx + 1)];
    try { store.set('sessions', sessions as any); } catch {}

    if (activeId === id) {
      if (sessions.length > 0) {
        const nextIndex = Math.max(0, idx - 1);
        const nextId = sessions[nextIndex].id;
        try { store.set('activeSessionId', nextId as any); } catch {}
        // 加载下一会话
        try {
          const s = sessions[nextIndex];
          syncAiViews();
          const providers = getProviders();
          for (const [aiId, state] of Object.entries(s.aiStates || {})) {
            const v = viewsRegistry.get(aiId);
            if (!v) continue;
            try { v.webContents.loadURL(state.url); } catch {}
          }
          for (const p of providers) {
            if (!s.aiStates || !(p.id in s.aiStates)) {
              const v = viewsRegistry.get(p.id);
              if (!v) continue;
              try { v.webContents.loadURL(p.url); } catch {}
            }
          }
          applyLayout();
        } catch {}
        try { mainWindow?.webContents.send('parallelchat/session/changed', { activeId: nextId }); } catch {}
      } else {
        // 无会话：重置到默认入口
        try { store.delete('activeSessionId'); } catch {}
        resetViewsToDefaults();
        try { mainWindow?.webContents.send('parallelchat/session/changed', { activeId: undefined }); } catch {}
      }
    } else {
      try { mainWindow?.webContents.send('parallelchat/session/changed', { activeId }); } catch {}
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String((err as any)?.message || err) };
  }
});
