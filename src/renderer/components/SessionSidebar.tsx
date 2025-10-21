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
    background-color: #cbd5e1;
    border-radius: 3px;
    transition: background-color 0.2s ease;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
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

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="GitHub">
    <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.2-3.37-1.2-.45-1.17-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.04 1.53 1.04.9 1.58 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.1 0-1.13.39-2.06 1.02-2.79-.1-.26-.44-1.3.1-2.7 0 0 .83-.27 2.73 1.06.79-.22 1.64-.33 2.49-.33s1.7.11 2.49.33c1.9-1.33 2.73-1.06 2.73-1.06.54 1.4.2 2.44.1 2.7.63.73 1.02 1.66 1.02 2.79 0 3.97-2.34 4.83-4.57 5.08.36.32.68.96.68 1.93 0 1.39-.01 2.51-.01 2.85 0 .27.18.6.69.49A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
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
    <div className="px-3 py-3 border-t border-slate-200 bg-white/80">
      <div className="flex items-center justify-between gap-2">
        <a
          href="https://github.com/woniu9524/ParallelChat"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
          title="GitHub"
        >
          <GithubIcon size={16} />
        </a>
        <div className="flex-1 text-xs text-slate-600 truncate">
          {t('sidebar.footerVersion', { version: appVersion || '-' })}
        </div>
        <div className="flex items-center gap-2">
          {updateDownloaded ? (
            <button
              onClick={installUpdate}
              className="text-xs text-green-700 hover:text-green-800 hover:underline"
            >
              {t('sidebar.installNow')}
            </button>
          ) : availableVersion ? (
            <button
              onClick={startUpdateCheck}
              className="text-xs text-blue-700 hover:text-blue-800 hover:underline"
              title={t('sidebar.updateAvailable', { version: availableVersion })}
            >
              {t('sidebar.updateAvailable', { version: availableVersion })}
            </button>
          ) : null}
          {typeof updateProgress === 'number' && !updateDownloaded && updateProgress > 0 && (
            <span className="text-[11px] text-slate-500">{t('sidebar.updating')} {updateProgress}%</span>
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
      <aside className="w-56 shrink-0 bg-slate-50/80 backdrop-blur-sm flex flex-col">
      {/* 头部 */}
      <div className=" px-4 py-[10px] bg-white/90 backdrop-blur-sm flex items-center">
        <div className="flex items-center justify-between w-full">
          <h2 className="font-semibold text-slate-800">{t('sidebar.history')}</h2>
          <div className="flex items-center gap-2">
            {hasSessions && (
              <button
                onClick={clearAll}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                title={t('sidebar.clearAll')}
              >
                <TrashIcon size={14} />
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={startNew}
              className="h-8 px-3 text-xs font-medium bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
            >
              <PlusIcon size={14} />
              <span className="ml-1">{t('sidebar.newSession')}</span>
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
          <div className="p-4 text-center">
            <div className="text-sm text-slate-500 mb-2">{t('sidebar.noSessions')}</div>
            <div className="text-xs text-slate-400">{t('sidebar.noSessionsTip')}</div>
          </div>
        )}

        {hasSessions && (
          <div className="py-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group mx-2 mb-2 rounded-lg transition-all duration-200 ${
                  activeId === s.id
                    ? 'bg-blue-50/80 shadow-sm ring-1 ring-blue-200/50'
                    : 'bg-white/60 hover:bg-white/80 hover:shadow-sm'
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
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('sidebar.inputTitle')}
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={saveEdit}
                          className="flex items-center justify-center w-6 h-6 rounded text-green-600 hover:bg-green-50 transition-colors"
                          title={t('actions.save')}
                        >
                          <CheckIcon size={14} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center justify-center w-6 h-6 rounded text-slate-500 hover:bg-slate-100 transition-colors"
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
                        <div className={`text-sm font-medium truncate ${
                          activeId === s.id ? 'text-blue-800' : 'text-slate-800'
                        }`}>
                          {s.title || t('sidebar.untitled')}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
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
                          className="flex items-center justify-center w-7 h-7 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors"
                          title={t('sidebar.editTitle')}
                        >
                          <EditIcon size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            del(s.id);
                          }}
                          className="flex items-center justify-center w-7 h-7 rounded hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
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
