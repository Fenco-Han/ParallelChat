import { useEffect, useState } from 'react';
import Workspace from './Workspace';
import GlobalInputBar from './GlobalInputBar';
import SettingsModal from './SettingsModal';
import SessionSidebar from './SessionSidebar';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Toaster } from './ui/sonner';
import { LayoutGridIcon, NotebookTabsIcon } from 'lucide-react';

export default function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providers, setProviders] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'tabs'>('tabs');
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [completeSet, setCompleteSet] = useState<Set<string>>(new Set());
  const [tabMenu, setTabMenu] = useState<{ id: string; x: number; y: number; name?: string } | null>(null);

  // 弹窗打开时隐藏 WebContentsView，避免遮挡；关闭后恢复
  useEffect(() => {
    const visible = !settingsOpen;
    try {
      window.parallelchat?.send('parallelchat/view/visible', visible);
    } catch {}
  }, [settingsOpen]);

  // 加载 AI 列表与布局状态，并在主进程同步后刷新
  useEffect(() => {
    const load = async () => {
      try {
        const list = (await window.parallelchat?.invoke('parallelchat/store/get', 'aiProviders')) as
          | Array<{ id: string; name: string; url: string }>
          | undefined;
        const aiList = list ?? [];
        setProviders(aiList);
        const layout = (await window.parallelchat?.invoke('parallelchat/store/get', 'layout')) as
          | { mode?: 'grid' | 'tabs'; order?: string[] }
          | undefined;
        const mode = layout?.mode ?? 'tabs';
        setLayoutMode(mode);
        const order = layout?.order && layout.order.length > 0 ? layout.order : aiList.map((p) => p.id);
        setActiveId(order[0]);
      } catch {}
    };
    load();
    const off = window.parallelchat?.on('parallelchat/ai/ready', () => load());
    return () => {
      if (off) off();
    };
  }, []);

  // 全局 Tab 键在 tabs 布局下循环切换标签（Shift+Tab 反向）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen) return; // 弹窗时不拦截，保留原生导航
      if (layoutMode !== 'tabs') return;
      // 仅处理纯 Tab（不含 Ctrl/Alt/Meta），支持 Shift+Tab 反向
      if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;

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
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [layoutMode, providers, activeId, settingsOpen]);

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

  const toggleLayoutTop = () => {
    const next: 'grid' | 'tabs' = layoutMode === 'grid' ? 'tabs' : 'grid';
    setLayoutMode(next);
    try {
      window.parallelchat?.send('parallelchat/layout/set', next);
    } catch {}
  };

  const setLayoutTopDirect = (mode: 'grid' | 'tabs') => {
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

  const openTabContextMenu = (e: React.MouseEvent, id: string, name?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTabMenu({ id, x: e.clientX, y: e.clientY, name });
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
      window.parallelchat?.send('parallelchat/view/reload', tabMenu.id);
    } catch {}
    setTabMenu(null);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50 text-foreground">
      <SessionSidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-100">
          <div className="flex items-center gap-2 flex-1">
            {layoutMode === 'tabs' && providers.length > 0 && (
              <Tabs value={activeId} onValueChange={activateTab} className="flex-1">
                <TabsList>
                  {providers.map((p) => (
                    <TabsTrigger
                      key={p.id}
                      value={p.id}
                      data-busy={busyMap[p.id] ? 'true' : undefined}
                      aria-busy={busyMap[p.id] ? true : undefined}
                      data-complete={completeSet.has(p.id) ? 'true' : undefined}
                      title={busyMap[p.id] ? '生成中' : undefined}
                      onContextMenu={(e) => openTabContextMenu(e, p.id, p.name || p.id)}
                    >
                      {p.name || p.id}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 分段选择器：网格 / 标签（含图标） */}
            <Tabs value={layoutMode} onValueChange={(v) => setLayoutTopDirect(v as 'grid' | 'tabs')}>
              <TabsList>
                <TabsTrigger value="tabs" title="标签视图">
                  <NotebookTabsIcon className="mr-1 size-4" aria-hidden />
                  标签
                </TabsTrigger>
                <TabsTrigger value="grid" title="网格视图">
                  <LayoutGridIcon className="mr-1 size-4" aria-hidden />
                  网格
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
              模型管理
            </Button>
          </div>
        </div>

        <Workspace />

        <div className="bg-white shadow-lg border-t border-slate-100">
          <GlobalInputBar />
        </div>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {tabMenu && (
          <div
            className="fixed z-50 min-w-[140px] rounded-lg bg-white shadow-xl ring-1 ring-slate-200 text-slate-700"
            style={{ left: tabMenu.x, top: tabMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors" onClick={doReload}>刷新</button>
          </div>
        )}
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
