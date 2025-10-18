# ParallelChat 技术实施文档 (TDD)

**文档版本:** V1.1  
**基于FSD版本:** V1.2  
**创建日期:** 2025年10月13日  
**项目基座:** Electron React Boilerplate (ERB) + TypeScript  
**核心技术栈:** Electron, WebContentsView, React, TypeScript, Node.js, HTML/CSS

## 1. 概述与架构

本文档为 "ParallelChat" V1.2 的技术实现方案，面向当前 ERB + TypeScript 项目结构，提供可执行、可验证的落地细节。

ERB 相关目录与入口：
- 主进程入口: `src/main/main.ts`
- 预加载脚本: `src/main/preload.ts`
- 渲染器入口: `src/renderer/index.tsx`（模板: `src/renderer/index.ejs`）
- 工具函数: `src/main/util.ts`（如 `resolveHtmlPath`）
- 开发/打包脚本: 见 `package.json` 与 `.erb/configs/*`

### 1.1. 核心架构

应用将采用标准的 Electron 主进程-渲染器进程架构。

**主进程 (Main Process):**
- 创建与管理 `BrowserWindow`
- 创建、管理、布局所有 `WebContentsView`（AI 视图），通过 `contentView` 添加/移除子视图
- 处理窗口事件、生命周期管理
- 负责安全的持久化（推荐在主进程使用 `electron-store`）
- 作为 JS 注入的统一调度中心
- 处理 IPC（进程间通信）消息与权限校验

**渲染器进程 (Renderer Process):**
- 负责渲染 UI（主框架、侧边栏、输入栏等）
- 管理 UI 状态与交互
- 通过预加载脚本与主进程安全通信（`contextBridge` 暴露有限 API）
- 不直接访问 Node 能力，避免安全风险

**AI 视图 (WebContentsView):**
- 每个 `WebContentsView` 为独立浏览器上下文，加载一个 AI 官网
- 由主进程控制位置、尺寸与加载内容（作为 `BrowserWindow.contentView` 的子视图）
- 通过独立会话分区（`session.fromPartition('persist:<id>')`）隔离 Cookie 与登录状态

### 1.2. 关键技术点与安全策略

**用户标识 (User-Agent) 与反自动化指纹:**
- 在创建 `WebContentsView` 时关联独立 `session`
- 通过 `session.webRequest.onBeforeSendHeaders` 修改请求头为标准浏览器 UA
- 在 `did-finish-load` 后执行 `delete navigator.webdriver;` 移除自动化指纹

**预加载与安全 (CSP/隔离):**
- 预加载脚本通过 `contextBridge` 暴露有限 API，避免 `nodeIntegration`
- 渲染器启用 CSP（`index.ejs` 已含 `script-src 'self' 'unsafe-inline'`，如需收紧可移除 `unsafe-inline` 并改用事件绑定与外部脚本）
- `WebContentsView.webPreferences` 建议：`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`

**IPC 通道与校验:**
- 统一命名空间：`parallelchat/*`，例如：`parallelchat/broadcast`、`parallelchat/layout/set`
- 主进程校验参数类型与目标权限，避免任意执行

**优雅的 JS 注入:**
- 我们将创建一个 `ai-handlers` 目录，为每个支持的 AI 服务建立一个独立的 JS 模块（例如 `gemini.js`, `kimi.js`）
- 每个模块将导出一个包含特定 CSS 选择器和操作逻辑的对象
- 主进程将动态加载这些模块
- 当需要广播消息时，主进程根据目标AI视图，找到对应的 handler，并将其 `sendMessage` 函数序列化后通过 `webContents.executeJavaScript()` 注入执行

## 2. 组件化实施方案

### 2.1. 组件一: 应用主框架 (App Shell)

**实现:**

**主进程 (TypeScript):** 创建 `BrowserWindow`，加载 `index.ejs`，注册 IPC。

```ts
// src/main/main.ts (片段)
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { resolveHtmlPath } from './util';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app
  .on('ready', createWindow)
  .on('window-all-closed', () => process.platform !== 'darwin' && app.quit())
  .on('activate', () => (mainWindow === null ? createWindow() : undefined));
```

**渲染器 (React):** 使用 CSS Flexbox 构建三段式布局。

```html
<div class="app-shell">
  <div id="session-sidebar" class="sidebar">...</div>
  <div id="main-workspace" class="workspace">...</div>
  <div id="global-input-bar" class="input-bar">...</div>
</div>
```

**侧边栏拖拽:**
- 在侧边栏的右边框上监听 `mousedown`, `mousemove`, `mouseup` 事件
- 在 `mousemove` 事件中，通过 IPC 将新的宽度值发送给主进程
- 主进程接收到后，重新计算并设置所有 WebContentsView 的 bounds

### 2.2. 组件二: 会话侧边栏 (Session Sidebar)

**数据持久化:**
推荐在主进程使用 `electron-store`，通过 IPC 暴露读写接口，避免渲染器直接读写磁盘。

依赖安装：
```bash
npm i electron-store
```

**Schema 设计:**

```json
{
  "sessions": [
    {
      "id": "uuid-v4-string",
      "title": "用户的第一次提问",
      "createdAt": "iso-timestamp",
      "aiStates": {
        "gemini": { "url": "https://gemini.google.com/app/convo-id" },
        "kimi": { "url": "https://kimi.ai/chat/chat-id" }
      }
    }
  ],
  "activeSessionId": "uuid-v4-string"
}
```

**逻辑实现 (渲染器进程):**

**新建会话:**
- 点击"+"按钮时，不清空 BrowserView，而是设置一个临时状态 `isNewSession = true`
- 当用户在全局输入栏第一次发送消息后，渲染器进程捕获该事件，生成一个新的会话对象（包含当前所有 BrowserView 的 URL 作为 aiStates），存入 electron-store，然后 `isNewSession` 置为 false 并刷新侧边栏列表

**切换会话:**
- 点击某个会话条目，从 electron-store 读取其 aiStates
- 通过 IPC 将这些 URL 信息发送给主进程，主进程对每个 BrowserView 执行 `webContents.loadURL()`

**删除/重命名:**
- 直接在渲染器进程中操作 electron-store 中的数据，然后重新渲染侧边栏UI
- 删除当前会话后，根据FSD中的焦点切换逻辑，计算出下一个 `activeSessionId` 并更新

**主进程暴露 Store 接口 (示例):**
```ts
// src/main/main.ts (片段)
import Store from 'electron-store';

type StoreSchema = {
  sessions: Array<{ id: string; title: string; createdAt: string; aiStates: Record<string, { url: string }> }>;
  activeSessionId?: string;
  aiProviders?: Array<{ id: string; name: string; url: string; handler: string }>;
  layout?: { mode: 'grid' | 'tabs'; order: string[] };
  hasOnboarded?: boolean;
};

const store = new Store<StoreSchema>({ name: 'parallelchat' });

ipcMain.handle('parallelchat/store/get', (_e, key: keyof StoreSchema) => store.get(key));
ipcMain.handle('parallelchat/store/set', (_e, key: keyof StoreSchema, value: StoreSchema[typeof key]) => store.set(key, value));
```

**渲染器调用 (示例):**
```ts
const sessions = await window.electron.ipcRenderer.invoke('parallelchat/store/get', 'sessions');
await window.electron.ipcRenderer.invoke('parallelchat/store/set', 'activeSessionId', nextId);
```

### 2.3. 组件三: 工作区 (Workspace)

**实现:**
- 工作区本身是渲染器进程中的一个 `<div>` 容器
- `WebContentsView ` 由主进程创建，通过 `win.addBrowserView(view)` 叠加到主窗口之上

**布局切换:**
1. 用户在渲染器UI点击切换按钮
2. 渲染器发送 IPC 消息到主进程，例如 `ipcRenderer.send('set-layout-mode', 'tabs')`
3. 主进程接收消息，并执行相应的布局逻辑：

**网格模式:**
- 根据工作区尺寸和 AI 视图数量，计算每个 `WebContentsView` 的 `bounds` (x, y, width, height)，并循环调用 `view.setBounds()`
- 所有视图都通过 `contentView.addChildView` 叠加

**标签页模式:**
- 先移除所有 `WebContentsView`，仅添加当前激活的视图，并将其 `bounds` 填满工作区

**状态持久化:** 布局模式、视图顺序、尺寸等存入 `electron-store`。

**IPC 事件建议:**
- `parallelchat/layout/set`：切换布局模式（`grid|tabs`）
- `parallelchat/workspace/bounds`：渲染器上报工作区矩形，主进程据此计算 `WebContentsView` 布局

### 2.4. 组件四: AI视图 (AI View)

**创建 (主进程, TypeScript):**

```ts
import { WebContentsView, session } from 'electron';

type AiConfig = { id: string; name: string; url: string };

export function createAiView(aiConfig: AiConfig): WebContentsView {
  const partition = `persist:${aiConfig.id}`;
  const s = session.fromPartition(partition);

  s.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = {
      ...details.requestHeaders,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    };
    callback({ cancel: false, requestHeaders: headers });
  });

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
    view.webContents.executeJavaScript('delete navigator.webdriver;').catch(() => {});
  });

  view.webContents.loadURL(aiConfig.url);

  return view;
}
```

**广播接收 (主进程):**
1. 渲染器发送 `parallelchat/broadcast`（文本与目标 AI 列表）
2. 主进程遍历目标，找到对应 `WebContentsView` 并生成注入脚本
3. 注入 JS 并收集执行结果，通过事件通知渲染器

```ts
ipcMain.handle(
  'parallelchat/broadcast',
  async (_e, payload: { text: string; targets?: string[] }) => {
    const text = payload?.text ?? '';
    const targets = payload?.targets && payload.targets.length > 0
      ? payload.targets
      : Array.from(viewsRegistry.keys());

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
    if (allOk) {
      mainWindow?.webContents.send('parallelchat/message/success', { results });
    } else {
      mainWindow?.webContents.send('parallelchat/message/fail', { results, errors });
    }

    return { results, errors };
  },
);
```

### 2.5. 组件五: 全局输入栏 (Global Input Bar)

**实现 (渲染器进程):**

**动态AI选择器:**
- 监听一个全局的布局状态（例如，一个简单的JavaScript变量或状态管理库中的值）
- 当布局状态从 `grid` 变为 `tabs` 时，动态地渲染复选框组或紧凑标签组

**发送逻辑:**
- 监听 Ctrl+Enter 快捷键和发送按钮的点击事件
- 触发时，从UI中收集选中的AI目标ID和输入框文本，通过 `ipcRenderer.send` 发送给主进程
 - 建议使用 `ipcRenderer.invoke('parallelchat/broadcast', payload)`，并监听结果事件 `parallelchat/message/*`

**加载状态:**
- 发送后，立即将按钮设置为加载中状态
- 监听主进程返回的 `message-sent-success/fail` 消息，当所有选中的AI都有返回结果后，将按钮恢复原状
 - 事件名建议：`parallelchat/message/success` 与 `parallelchat/message/fail`

### 2.6 & 2.7. 设置页面 & 添加AI对话框

**实现 (渲染器进程):**
- 作为模态框（Modal）组件实现
- AI模型管理的数据源是 electron-store 中的一个配置项，例如：

```json
{
  "aiProviders": [
    { "id": "gemini", "name": "Gemini", "url": "...", "handler": "gemini.js" },
    { "id": "kimi", "name": "Kimi", "url": "...", "handler": "kimi.js" }
  ]
}
```

- 增删改操作直接修改这个JSON对象，并存回 electron-store
 - 增删改通过主进程 `store` 接口（IPC）执行，渲染器只负责触发与展示

**清除缓存:**
- 点击按钮后，发送IPC消息 `ipcRenderer.send('clear-cache', 'gemini')` 或 `ipcRenderer.send('clear-all-cache')`
- 主进程接收后，调用 `session.fromPartition('persist:gemini').clearStorageData()` 来执行清除
 - 建议事件命名：`parallelchat/cache/clear` 与 `parallelchat/cache/clear-all`

### 2.8. 组件八: 首次启动与引导流程

**实现 (主进程, TypeScript):**

```ts
import Store from 'electron-store';

const store = new Store<{ hasOnboarded?: boolean }>();

app.on('ready', () => {
  const hasOnboarded = store.get('hasOnboarded', false);
  const win = mainWindow!;
  win.webContents.on('did-finish-load', () => {
    if (!hasOnboarded) {
      win.webContents.send('parallelchat/onboarding/start');
    }
  });
});

ipcMain.on('parallelchat/onboarding/complete', () => {
  store.set('hasOnboarded', true);
});
```

**渲染器进程:**
- 监听 `parallelchat/onboarding/start`，按顺序弹出欢迎窗口、添加AI对话框，完成后显示高亮提示
- 完成后调用 `ipcRenderer.send('parallelchat/onboarding/complete')`

---

## 3. 预加载脚本与 IPC 约定

**预加载 (TypeScript):**
```ts
// src/main/preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels =
  | 'parallelchat/broadcast'
  | 'parallelchat/layout/set'
  | 'parallelchat/workspace/bounds'
  | 'parallelchat/message/success'
  | 'parallelchat/message/fail'
  | 'parallelchat/store/get'
  | 'parallelchat/store/set'
  | 'parallelchat/cache/clear'
  | 'parallelchat/cache/clear-all'
  | 'parallelchat/onboarding/start'
  | 'parallelchat/onboarding/complete';

const api = {
  invoke(channel: Channels, ...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args);
  },
  send(channel: Channels, ...args: unknown[]) {
    ipcRenderer.send(channel, ...args);
  },
  on(channel: Channels, func: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  once(channel: Channels, func: (...args: unknown[]) => void) {
    ipcRenderer.once(channel, (_event, ...args) => func(...args));
  },
};

contextBridge.exposeInMainWorld('parallelchat', api);
export type ParallelChatAPI = typeof api;
```

**渲染器类型声明:**
```ts
// src/renderer/preload.d.ts
export {}; // 使其成为模块
declare global {
  interface Window {
    parallelchat: import('../main/preload').ParallelChatAPI;
  }
}
```

**渲染器使用示例:**
```ts
await window.parallelchat.invoke('parallelchat/broadcast', { text, targets });
window.parallelchat.on('parallelchat/message/success', (id) => { /* 更新UI */ });
```

---

## 4. AI Handlers 注入策略

**目录建议:** `src/main/ai-handlers/` 下为每个 AI 提供独立模块，如 `gemini.ts`, `qwen.ts`, `deepseek.ts`。

**示例 (Gemini):**
```ts
// src/main/ai-handlers/gemini.ts
export const sendMessage = (text: string) => {
  const el = document.querySelector('.ql-editor') as HTMLElement | null;
  if (!el) return console.warn('未找到 .ql-editor 元素');
  el.focus();
  document.execCommand('insertText', false, text);
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
};
```

**示例 (Qwen):**
```ts
export const sendMessage = (text: string) => {
  const t = document.querySelector('textarea#chat-input') as HTMLTextAreaElement | null;
  if (!t) return console.warn('未找到输入框');
  t.value = text;
  t.dispatchEvent(new Event('input', { bubbles: true }));
  t.form?.requestSubmit?.() || t.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
};
```

**示例 (DeepSeek):**
```ts
export const sendMessage = (text: string) => {
  const t = document.querySelector('textarea._27c9245') as HTMLTextAreaElement | null;
  if (!t) return console.error('未找到输入框');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(t, text);
  t.dispatchEvent(new Event('input', { bubbles: true }));
  setTimeout(() => {
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const sendBtn = Array.from(document.querySelectorAll('button')).find(
      (btn) => !btn.classList.contains('ds-toggle-button') && btn.querySelector('svg') && !(btn as HTMLButtonElement).innerText.trim(),
    ) as HTMLButtonElement | undefined;
    sendBtn?.click();
  }, 100);
};
```

> 更多选择器与细节参见 `docs/LLM网站处理.md`

**主进程加载与注入:**
```ts
import { getInjectionScript } from './main/ai-handlers/index';

const script = getInjectionScript(targetId, text);
await viewsRegistry.get(targetId)!.webContents.executeJavaScript(script, true);
```

---

## 5. 开发、测试与验证流程（基于 ERB）

- 开发启动：`npm start`
- 代码质量：`npm run lint` / `npm run lint:fix`
- 单元测试：`npm test`（Jest + React Testing Library）
- 本地打包：`npm run package`

**验证步骤建议：**
- 首次启动流程：清空 `electron-store`，启动应用，验证 Onboarding 事件与 UI 提示
- 添加 AI 视图：通过设置页面添加至少一个 AI，工作区应出现对应视图
- 布局切换：在网格/标签页模式间切换，观察 `WebContentsView` 布局变更
- 广播发送：在全局输入栏输入文本，选择目标 AI，发送并观察各视图成功/失败事件
- 会话侧边栏：新建、切换、重命名、删除会话，并验证焦点切换逻辑与持久化

**注意事项：**
- 所有 IPC 调用需进行参数校验与异常处理
- 为防止站点反爬策略变更导致脚本失效，注入逻辑需可插拔、可热更新（以模块化 `ai-handlers` 为中心）
- `WebContentsView` 的 `bounds` 计算需考虑设备缩放与窗口阴影差异

---

## 6. 后续迭代建议

- 引入队列与重试策略：对注入执行失败进行指数退避重试
- 增加脚本健康检查：定期检测选择器可用性并上报日志
- 更细的权限域：为不同 IPC 通道设定使用场景与调用白名单

---

本 TDD 已与当前 ERB + TypeScript 项目结构对齐，并提供了主进程、预加载、渲染器与 AI 注入的可执行示例。后续开发请严格遵循 IPC 约定与安全策略，确保功能的稳定与可维护性。
