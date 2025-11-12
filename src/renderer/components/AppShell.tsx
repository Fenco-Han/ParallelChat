import { useEffect, useState } from 'react';
import Workspace from './Workspace';
import GlobalInputBar from './GlobalInputBar';
import SettingsModal from './SettingsModal';
import SessionSidebar from './SessionSidebar';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Toaster } from './ui/sonner';
import { LayoutGridIcon, NotebookTabsIcon, Minus, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AppShell() {
  const { t } = useTranslation();
  const [lang, setLang] = useState<'en' | 'zh-CN'>('en');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providers, setProviders] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [layoutMode, setLayoutMode] = useState<'groups' | 'tabs'>('tabs');
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [completeSet, setCompleteSet] = useState<Set<string>>(new Set());
  const [tabMenu, setTabMenu] = useState<
    { id: string; x: number; y: number; name?: string; type: 'provider' | 'group' }
    | null
  >(null);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; modelIds: string[]; enabled?: boolean }>>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMac = /Macintosh|Mac OS X/i.test(navigator.userAgent);

  // 初始化与订阅语言变化
  useEffect(() => {
    (async () => {
      try {
        const res = (await window.parallelchat?.invoke('parallelchat/i18n/get')) as any;
        const next = (res?.language ?? 'en') as 'en' | 'zh-CN';
        setLang(next);
      } catch {}
    })();
    const off = window.parallelchat?.on('parallelchat/i18n/changed', (next: any) => {
      if (next === 'en' || next === 'zh-CN') setLang(next);
    });
    return () => { off && off(); };
  }, []);

  // 弹窗打开时隐藏 WebContentsView，避免遮挡；关闭后恢复
  useEffect(() => {
    const visible = !settingsOpen;
    try {
      window.parallelchat?.send('parallelchat/view/visible', visible);
    } catch {}
  }, [settingsOpen]);

  // 加载 AI 列表、分组与布局状态，并在主进程同步后刷新
  useEffect(() => {
    const load = async () => {
      try {
        const list = (await window.parallelchat?.invoke('parallelchat/store/get', 'aiProviders')) as
          | Array<{ id: string; name: string; url: string }>
          | undefined;
        const aiList = list ?? [];
        setProviders(aiList);

        const gList = (await window.parallelchat?.invoke('parallelchat/store/get', 'aiGroups')) as
          | Array<{ id: string; name: string; modelIds: string[]; enabled?: boolean }>
          | undefined;
        const groupsData = gList ?? [];
        setGroups(groupsData);

        const layout = (await window.parallelchat?.invoke('parallelchat/store/get', 'layout')) as
          | { mode?: 'groups' | 'tabs'; order?: string[]; groupOrder?: string[]; activeGroupId?: string; disabledGroups?: string[] }
          | undefined;
        const mode = layout?.mode ?? 'tabs';
        setLayoutMode(mode as 'groups' | 'tabs');

        const order = layout?.order && layout.order.length > 0 ? layout.order : aiList.map((p) => p.id);
        setActiveId(order[0]);

        const disabledSet = new Set<string>(Array.isArray(layout?.disabledGroups) ? layout!.disabledGroups! : []);
        const enabledGroups = groupsData.filter((g) => (g.enabled !== false) && !disabledSet.has(g.id));
        const gOrder = (layout?.groupOrder && layout.groupOrder.length > 0)
          ? layout!.groupOrder!.filter((gid) => enabledGroups.some((x) => x.id === gid))
          : enabledGroups.map((g) => g.id);
        setGroupOrder(gOrder);
        const agid = (() => {
          const wanted = layout?.activeGroupId;
          if (wanted && enabledGroups.some((g) => g.id === wanted)) return wanted;
          return gOrder[0];
        })();
        setActiveGroupId(agid);
      } catch {}
    };
    load();
    const offReady = window.parallelchat?.on('parallelchat/ai/ready', () => load());
    const offGroups = window.parallelchat?.on('parallelchat/groups/reload', () => load());
    return () => {
      if (offReady) offReady();
      if (offGroups) offGroups();
    };
  }, []);

  // 全局 Tab 键在 tabs / groups 布局下循环切换（Shift+Tab 反向）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen) return; // 弹窗时不拦截，保留原生导航
      // 仅处理纯 Tab（不含 Ctrl/Alt/Meta），支持 Shift+Tab 反向
      if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;

      if (layoutMode === 'tabs') {
        const ids = providers.map((p) => p.id);
        if (ids.length <= 1) return;

        const currentIndex = activeId ? ids.indexOf(activeId) : 0;
        const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = e.shiftKey
          ? (normalizedIndex - 1 + ids.length) % ids.length
          : (normalizedIndex + 1) % ids.length;

        const nextId = ids[nextIndex];
        e.preventDefault();
        e.stopPropagation();
        activateTab(nextId);
      } else if (layoutMode === 'groups') {
        // 使用与 orderedGroupIds 相同的逻辑计算分组完整顺序
        const fromOrder = (groupOrder || []).filter((gid) => groups.some((x) => x.id === gid));
        const rest = groups.filter((g) => !fromOrder.includes(g.id)).map((g) => g.id);
        const ids = [...fromOrder, ...rest];
        if (ids.length <= 1) return;

        const currentIndex = activeGroupId ? ids.indexOf(activeGroupId) : 0;
        const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = e.shiftKey
          ? (normalizedIndex - 1 + ids.length) % ids.length
          : (normalizedIndex + 1) % ids.length;

        const nextId = ids[nextIndex];
        e.preventDefault();
        e.stopPropagation();
        activateGroup(nextId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [layoutMode, providers, groups, activeId, activeGroupId, groupOrder, settingsOpen]);

  // 监听运行状态并更新 Tab 动效
  useEffect(() => {
    const offSending = window.parallelchat?.on('parallelchat/message/sending', (payload: any) => {
      const ids: string[] = (payload?.targets ?? providers.map((p) => p.id)) as string[];
      setBusyMap((prev) => {
        const next: Record<string, boolean> = { ...prev };
        ids.forEach((id) => { next[id] = true; });
        return next;
      });
    });

    const offUpdate = window.parallelchat?.on('parallelchat/status/update', (payload: any) => {
      const status = (payload?.status ?? {}) as Record<string, boolean>;
      setBusyMap(status);
    });

    const offComplete = window.parallelchat?.on('parallelchat/status/complete', (payload: any) => {
      const ids: string[] = (payload?.targets ?? providers.map((p) => p.id)) as string[];
      setBusyMap({});
      setCompleteSet(new Set(ids));
      setTimeout(() => setCompleteSet(new Set()), 360);
    });

    return () => {
      offSending && offSending();
      offUpdate && offUpdate();
      offComplete && offComplete();
    };
  }, [providers]);

  // 订阅窗口状态变化，用于更新最大化与全屏按钮 UI
  useEffect(() => {
    const off = window.parallelchat?.on('parallelchat/window/state', (payload: any) => {
      if (typeof payload?.maximized === 'boolean') setIsMaximized(!!payload.maximized);
      if (typeof payload?.fullscreen === 'boolean') setIsFullscreen(!!payload.fullscreen);
    });
    return () => { off && off(); };
  }, []);

  // 为 CSS 添加平台标记（macOS 左侧按钮排列）
  useEffect(() => {
    try {
      if (isMac) document.body.classList.add('is-mac');
      else document.body.classList.remove('is-mac');
    } catch {}
  }, [isMac]);

  const toggleLayoutTop = () => {
    const next: 'groups' | 'tabs' = layoutMode === 'groups' ? 'tabs' : 'groups';
    setLayoutMode(next);
    try {
      window.parallelchat?.send('parallelchat/layout/set', next);
    } catch {}
  };

  const setLayoutTopDirect = (mode: 'groups' | 'tabs') => {
    setLayoutMode(mode);
    try {
      window.parallelchat?.send('parallelchat/layout/set', mode);
    } catch {}
  };

  const activateTab = (id: string) => {
    setActiveId(id);
    try {
      window.parallelchat?.send('parallelchat/layout/active', id);
    } catch {}
  };

  const activateGroup = (id: string) => {
    setActiveGroupId(id);
    try {
      window.parallelchat?.send('parallelchat/layout/group/active', id);
    } catch {}
  };

  const openTabContextMenu = (e: React.MouseEvent, id: string, name?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTabMenu({ id, x: e.clientX, y: e.clientY, name, type: 'provider' });
  };

  const openGroupContextMenu = (e: React.MouseEvent, id: string, name?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTabMenu({ id, x: e.clientX, y: e.clientY, name, type: 'group' });
  };

  useEffect(() => {
    const hide = () => setTabMenu(null);
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setTabMenu(null); };
    window.addEventListener('click', hide);
    window.addEventListener('contextmenu', hide);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('click', hide);
      window.removeEventListener('contextmenu', hide);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const doReload = () => {
    if (!tabMenu) return;
    try {
      if (tabMenu.type === 'provider') {
        window.parallelchat?.send('parallelchat/view/reload', tabMenu.id);
      } else if (tabMenu.type === 'group') {
        const g = groups.find((x) => x.id === tabMenu.id);
        const ids = g?.modelIds ?? [];
        for (const id of ids) {
          try {
            window.parallelchat?.send('parallelchat/view/reload', id);
          } catch {}
        }
      }
    } catch {}
    setTabMenu(null);
  };

  // 计算分组标签的完整顺序：优先使用 layout.groupOrder，并补全缺失分组
  const orderedGroupIds = (() => {
    const visibleSet = new Set(groups.filter((g) => g.enabled !== false).map((g) => g.id));
    const fromOrder = (groupOrder || []).filter((gid) => visibleSet.has(gid));
    const rest = groups.filter((g) => !fromOrder.includes(g.id) && visibleSet.has(g.id)).map((g) => g.id);
    return [...fromOrder, ...rest];
  })();
  const currentGroupTabValue = (() => {
    if (activeGroupId && orderedGroupIds.includes(activeGroupId)) return activeGroupId;
    return orderedGroupIds[0];
  })();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* 顶部全宽标题栏 */}
      <div
        className={`pc-titlebar flex items-center justify-between px-2.5 py-1.5 bg-gradient-card backdrop-blur-md shadow-md border-b border-border/50`}
        onDoubleClick={() => window.parallelchat?.send('parallelchat/window/toggle-maximize')}
      >
        <div className={`flex items-center gap-1.5 flex-1 ${isMac ? 'ml-45' : ''}`}>
          {/* macOS 下不显示自绘窗口按钮，保留系统原生 */}
          {layoutMode === 'tabs' && providers.length > 0 && (
            <Tabs value={activeId} onValueChange={activateTab} className="flex-1">
              <TabsList className="pc-no-drag h-7 gap-0.5 p-0.5 bg-muted/40">
                {providers.map((p) => (
                  <TabsTrigger
                    key={p.id}
                    value={p.id}
                    className="pc-no-drag h-6 px-2.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    data-busy={busyMap[p.id] ? 'true' : undefined}
                    aria-busy={busyMap[p.id] ? true : undefined}
                    data-complete={completeSet.has(p.id) ? 'true' : undefined}
                    title={busyMap[p.id] ? t('status.generating') : undefined}
                    onContextMenu={(e) => openTabContextMenu(e, p.id, p.name || p.id)}
                  >
                    {p.name || p.id}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          {layoutMode === 'groups' && groups.length > 0 && (
            <Tabs value={currentGroupTabValue} onValueChange={activateGroup} className="flex-1">
              <TabsList className="pc-no-drag h-7 gap-0.5 p-0.5 bg-muted/40">
                {orderedGroupIds.map((gid) => {
                  const g = groups.find((x) => x.id === gid && (x.enabled !== false));
                  if (!g) return null;
                  return (
                    <TabsTrigger
                      key={g.id}
                      value={g.id}
                      className="pc-no-drag h-6 px-2.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      title={g.name || g.id}
                      onContextMenu={(e) => openGroupContextMenu(e, g.id, g.name || g.id)}
                    >
                      {g.name || g.id}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* 分段选择器：分组 / 标签（含图标） */}
          <Tabs value={layoutMode} onValueChange={(v) => setLayoutTopDirect(v as 'groups' | 'tabs')}>
            <TabsList className="pc-no-drag h-7 gap-0.5 p-0.5 bg-muted/40">
              <TabsTrigger value="tabs" title={t('layout.tabsTitle')} className="pc-no-drag h-6 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <NotebookTabsIcon className="mr-1 size-3.5" aria-hidden />
                {t('layout.tabs')}
              </TabsTrigger>
              <TabsTrigger value="groups" title={t('layout.groupsTitle')} className="pc-no-drag h-6 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <LayoutGridIcon className="mr-1 size-3.5" aria-hidden />
                {t('layout.groups')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="default"
            size="xs"
            onClick={() => setSettingsOpen(true)}
            className="pc-no-drag h-7 px-2.5 text-xs font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 border-0 shadow-sm hover:shadow-md transition-all duration-200"
          >
            {t('settings.manageModels')}
          </Button>
         {/* 语言切换：紧凑分段，不使用下拉，避免遮挡 */}
          <Tabs
            value={lang}
            onValueChange={(v) => {
              const next = v as 'en' | 'zh-CN';
              setLang(next);
              window.parallelchat?.invoke('parallelchat/i18n/set', next);
            }}
           title={t('language.switch')}
          >
            <TabsList className="pc-no-drag h-7 gap-0.5 p-0.5 rounded-lg bg-muted/40">
              <TabsTrigger value="en" className="pc-no-drag h-6 px-2 text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">EN</TabsTrigger>
              <TabsTrigger value="zh-CN" className="pc-no-drag h-6 px-2 text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">中文</TabsTrigger>
            </TabsList>
          </Tabs>

          {!isMac && (
            <div className="pc-window-controls ml-1.5 flex items-center gap-0.5">
              <button
                className="pc-no-drag pc-win-btn pc-win-min"
                aria-label={t('window.minimize')}
                title={t('window.minimize')}
                onClick={() => window.parallelchat?.send('parallelchat/window/minimize')}
              >
                <Minus className="size-3.5" aria-hidden />
              </button>
              <button
                className="pc-no-drag pc-win-btn pc-win-max"
                aria-label={isMaximized ? t('window.restore') : t('window.maximize')}
                title={isMaximized ? t('window.restore') : t('window.maximize')}
                onClick={() => window.parallelchat?.send('parallelchat/window/toggle-maximize')}
              >
                <Square className="size-3.5" aria-hidden />
              </button>
              <button
                className="pc-no-drag pc-win-btn pc-win-close"
                aria-label={t('window.close')}
                title={t('window.close')}
                onClick={() => window.parallelchat?.send('parallelchat/window/close')}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 主体区域：侧边栏 + 内容 */}
      <div className="flex flex-1 overflow-hidden">
        <SessionSidebar />

        <main className="flex-1 flex flex-col min-w-0 bg-card shadow-lg">
          <Workspace />

          <div className="bg-card/95 backdrop-blur-md shadow-xl border-t border-border/50">
            <GlobalInputBar
              layoutMode={layoutMode}
              activeGroupId={currentGroupTabValue}
              providers={providers}
              groups={groups}
            />
          </div>

          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

          {tabMenu && (
            <div
              className="fixed z-50 min-w-[150px] rounded-xl bg-card shadow-2xl ring-2 ring-border/50 backdrop-blur-md"
              style={{ left: tabMenu.x, top: tabMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
             <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 rounded-xl transition-all duration-200 hover:scale-[1.02]" onClick={doReload}>{t('view.reload')}</button>
            </div>
          )}
        </main>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
