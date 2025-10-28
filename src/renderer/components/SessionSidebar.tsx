import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';

type SessionItem = {
  id: string;
  title: string;
  createdAt: string;
  aiStates: Record<string, { url: string }>;
};

// 自定义滚动条样式
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, hsl(30 30% 75%) 0%, hsl(30 25% 70%) 100%);
    border-radius: 3px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, hsl(30 35% 65%) 0%, hsl(30 30% 60%) 100%);
    box-shadow: 0 0 8px hsl(30 30% 60% / 0.3);
  }

  .custom-scrollbar::-webkit-scrollbar-corner {
    background: transparent;
  }
`;

// SVG 图标组件
const EditIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c0-1-1-2-1-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const CancelIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// 新增：官网图标
const GlobeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="官网">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 0 20" />
    <path d="M12 2a15.3 15.3 0 0 0 0 20" />
  </svg>
);

const TrashIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c0-1-1-2-1-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

function SidebarUpdateFooter() {
  const { t } = useTranslation();

  const [appVersion, setAppVersion] = useState<string>('');
  const [availableVersion, setAvailableVersion] = useState<string | undefined>(undefined);
  const [updateProgress, setUpdateProgress] = useState<number | undefined>(undefined);
  const [updateDownloaded, setUpdateDownloaded] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const v = await window.parallelchat?.invoke('parallelchat/app/version');
        setAppVersion(String(v || ''));
      } catch {}
    })();
    const offAvail = window.parallelchat?.on('parallelchat/update/available', (info: any) => {
      const v = (info?.version ?? info?.releaseName ?? '') as string;
      setAvailableVersion(v || undefined);
      setUpdateDownloaded(false);
      setUpdateError(undefined);
    });
    const offProg = window.parallelchat?.on('parallelchat/update/downloading', (p: any) => {
      const percent = Math.round(Number(p?.percent ?? 0));
      setUpdateProgress(percent);
    });
    const offDone = window.parallelchat?.on('parallelchat/update/downloaded', (info: any) => {
      const v = (info?.version ?? info?.releaseName ?? '') as string;
      setAvailableVersion(v || availableVersion);
      setUpdateDownloaded(true);
      setUpdateProgress(100);
    });
    const offErr = window.parallelchat?.on('parallelchat/update/error', (payload: any) => {
      const msg = String(payload?.message || '');
      setUpdateError(msg || undefined);
    });
    return () => {
      offAvail && offAvail();
      offProg && offProg();
      offDone && offDone();
      offErr && offErr();
    };
  }, []);

  const startUpdateCheck = async () => {
    if (!confirm(t('sidebar.confirmUpdateCheck'))) return;
    try {
      await window.parallelchat?.invoke('parallelchat/update/check');
    } catch {}
  };

  const installUpdate = () => {
    if (!confirm(t('sidebar.confirmInstall'))) return;
    try { window.parallelchat?.send('parallelchat/update/install'); } catch {}
  };

  return (
    <div className="px-3 py-3 border-t border-border bg-gradient-subtle backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <a
          href="https://www.parallelchat.top/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
          title="官网"
        >
          <GlobeIcon size={16} />
        </a>
        <div className="flex-1 text-xs text-muted-foreground truncate">
          {t('sidebar.footerVersion', { version: appVersion || '-' })}
        </div>
        <div className="flex items-center gap-2">
          {updateDownloaded ? (
            <button
              onClick={installUpdate}
              className="text-xs font-medium text-green-700 hover:text-green-800 hover:underline transition-colors"
            >
              {t('sidebar.installNow')}
            </button>
          ) : availableVersion ? (
            <button
              onClick={startUpdateCheck}
              className="text-xs font-medium text-primary hover:text-accent hover:underline transition-colors"
              title={t('sidebar.updateAvailable', { version: availableVersion })}
            >
              {t('sidebar.updateAvailable', { version: availableVersion })}
            </button>
          ) : null}
          {typeof updateProgress === 'number' && !updateDownloaded && updateProgress > 0 && (
            <span className="text-[11px] text-muted-foreground font-medium">{t('sidebar.updating')} {updateProgress}%</span>
          )}
          {updateError && (
            <span className="text-[11px] text-red-600" title={updateError}>!</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionSidebar() {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const load = async () => {
    try {
      const list = (await window.parallelchat?.invoke('parallelchat/store/get', 'sessions')) as SessionItem[] | undefined;
      const sorted = (list ?? []).slice().sort((a, b) => {
        const ta = new Date(a?.createdAt || 0).getTime();
        const tb = new Date(b?.createdAt || 0).getTime();
        return tb - ta; // 倒序：新建时间在前
      });
      setSessions(sorted);
    } catch {
      setSessions([]);
    }
    try {
      const id = (await window.parallelchat?.invoke('parallelchat/store/get', 'activeSessionId')) as string | undefined;
      setActiveId(id);
    } catch {}
  };

  useEffect(() => {
    load();
    const off = window.parallelchat?.on('parallelchat/session/changed', () => load());
    return () => { off && off(); };
  }, []);

  const hasSessions = useMemo(() => sessions.length > 0, [sessions]);

  const startNew = () => {
    try { window.parallelchat?.send('parallelchat/session/new'); } catch {}
  };

  const activate = async (id: string) => {
    if (editingId === id) return; // 编辑状态下不允许切换
    try { await window.parallelchat?.invoke('parallelchat/session/load', id); } catch {}
  };

  const beginEdit = (s: SessionItem) => {
    setEditingId(s.id);
    setEditingTitle(s.title || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await window.parallelchat?.invoke('parallelchat/session/update-title', editingId, editingTitle.trim());
    } catch {}
    setEditingId(undefined);
    setEditingTitle('');
  };

  const cancelEdit = () => {
    setEditingId(undefined);
    setEditingTitle('');
  };

  const del = async (id: string) => {
    if (confirm(t('sidebar.confirmDelete'))) {
      try { await window.parallelchat?.invoke('parallelchat/session/delete', id); } catch {}
    }
  };

  const clearAll = async () => {
    if (!hasSessions) return;
    if (confirm(t('sidebar.confirmClearAll'))) {
      try {
        // 删除所有会话
        for (const session of sessions) {
          await window.parallelchat?.invoke('parallelchat/session/delete', session.id);
        }
      } catch {}
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <>
      <style>{scrollbarStyles}</style>
      <aside className="w-56 shrink-0 bg-gradient-subtle backdrop-blur-md flex flex-col border-r border-border/50 shadow-sm">
      {/* 头部 */}
      <div className="px-4 py-3 bg-card/95 backdrop-blur-md flex items-center border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between w-full">
          <h2 className="font-semibold text-foreground text-base">{t('sidebar.history')}</h2>
          <div className="flex items-center gap-2">
            {hasSessions && (
              <button
                onClick={clearAll}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all duration-200 hover:scale-105"
                title={t('sidebar.clearAll')}
              >
                <TrashIcon size={14} />
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={startNew}
              className="h-8 px-3 text-xs tracking-tight font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 border-0 shadow-md hover:shadow-lg transition-all duration-200"
            >

              <span className="ml-0.5">{t('sidebar.newSession')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 会话列表 */}
      <div
        className="flex-1 overflow-auto custom-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 transparent',
        }}
      >
        {!hasSessions && (
          <div className="p-6 text-center">
            <div className="text-sm text-muted-foreground font-medium mb-2">{t('sidebar.noSessions')}</div>
            <div className="text-xs text-muted-foreground/70">{t('sidebar.noSessionsTip')}</div>
          </div>
        )}

        {hasSessions && (
          <div className="py-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group mx-2 mb-2 rounded-xl transition-all duration-300 ${
                  activeId === s.id
                    ? 'bg-gradient-card shadow-md ring-2 ring-primary/20 scale-[1.02]'
                    : 'bg-card/60 hover:bg-card hover:shadow-lg hover:scale-[1.01]'
                }`}
              >
                <div className="p-3">
                  {editingId === s.id ? (
                    // 编辑状态
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                        placeholder={t('sidebar.inputTitle')}
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={saveEdit}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-green-600 hover:bg-green-50 transition-all duration-200 hover:scale-110"
                          title={t('actions.save')}
                        >
                          <CheckIcon size={14} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:bg-muted transition-all duration-200 hover:scale-110"
                          title={t('actions.cancel')}
                        >
                          <CancelIcon size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 正常显示状态
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => activate(s.id)}
                      >
                        <div className={`text-sm font-semibold truncate ${
                          activeId === s.id ? 'text-primary' : 'text-foreground'
                        }`}>
                          {s.title || t('sidebar.untitled')}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1.5 font-medium">
                          {new Date(s.createdAt).toLocaleString(i18n.language, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            beginEdit(s);
                          }}
                          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                          title={t('sidebar.editTitle')}
                        >
                          <EditIcon size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            del(s.id);
                          }}
                          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all duration-200 hover:scale-110"
                          title={t('sidebar.deleteSession')}
                        >
                          <DeleteIcon size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部版本信息与更新入口 */}
      <SidebarUpdateFooter />
    </aside>
    </>
  );
}
