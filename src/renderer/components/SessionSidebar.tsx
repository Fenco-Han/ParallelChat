import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';

type SessionItem = { id: string; title: string; createdAt: string; aiStates: Record<string, { url: string }> };

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

export default function SessionSidebar() {
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
    if (confirm('确定要删除这个会话吗？')) {
      try { await window.parallelchat?.invoke('parallelchat/session/delete', id); } catch {}
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
    <aside className="w-64 shrink-0 border-r bg-slate-50/50 flex flex-col">
      {/* 头部 */}
      <div className=" px-4 py-[10px] border-b bg-white/80 backdrop-blur-sm flex items-center">
        <div className="flex items-center justify-between w-full">
          <h2 className="font-semibold text-slate-800">会话历史</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={startNew}
            className="h-8 px-3 text-xs font-medium bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
          >
            <PlusIcon size={14} />
            <span className="ml-1">新会话</span>
          </Button>
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-auto">
        {!hasSessions && (
          <div className="p-4 text-center">
            <div className="text-sm text-slate-500 mb-2">暂无会话记录</div>
            <div className="text-xs text-slate-400">开始对话后会自动创建会话</div>
          </div>
        )}

        {hasSessions && (
          <div className="py-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group mx-2 mb-2 rounded-lg border transition-all duration-200 ${
                  activeId === s.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
                        placeholder="输入会话标题"
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={saveEdit}
                          className="flex items-center justify-center w-6 h-6 rounded text-green-600 hover:bg-green-50 transition-colors"
                          title="保存"
                        >
                          <CheckIcon size={14} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center justify-center w-6 h-6 rounded text-slate-500 hover:bg-slate-100 transition-colors"
                          title="取消"
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
                          {s.title || '未命名会话'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(s.createdAt).toLocaleString('zh-CN', {
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
                          title="编辑标题"
                        >
                          <EditIcon size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            del(s.id);
                          }}
                          className="flex items-center justify-center w-7 h-7 rounded hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                          title="删除会话"
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
    </aside>
  );
}
