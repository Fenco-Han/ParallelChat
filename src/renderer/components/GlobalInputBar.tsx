import { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { useTranslation } from 'react-i18next';

type AiProvider = { id: string; name: string; url: string; handler?: string };

export default function GlobalInputBar() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [readyIds, setReadyIds] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const min = 40;
    const max = 120;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, min), max);
    el.style.height = `${next}px`;
  }, [text]);

  useEffect(() => {
    (async () => {
      try {
        const value = (await window.parallelchat?.invoke('parallelchat/store/get', 'aiProviders')) as
          | AiProvider[]
          | undefined;
        setProviders(value ?? []);
      } catch {
        setProviders([]);
      }
    })();
    // 修改：在 ai/ready 时同时刷新 providers 列表
    const off = window.parallelchat?.on('parallelchat/ai/ready', async (payload: any) => {
      const ids = (payload?.ids ?? []) as string[];
      setReadyIds(ids);
      try {
        const value = (await window.parallelchat?.invoke('parallelchat/store/get', 'aiProviders')) as AiProvider[] | undefined;
        setProviders(value ?? []);
      } catch {
        setProviders([]);
      }
      // 优先从localStorage读取选择状态，没有时才默认全选
      setSelected((prev) => {
        const storedSelected = loadSelectedFromStorage();
        const hasStoredSelection = Object.keys(storedSelected).length > 0;

        if (hasStoredSelection) {
          // 使用localStorage中的选择状态
          return { ...prev, ...storedSelected };
        } else {
          // localStorage为空时，检查当前是否已有选择
          const hasAnySelection = Object.values(prev).some(Boolean);
          if (hasAnySelection) return prev;

          // 默认全选所有已就绪的提供商
          const next = { ...prev };
          for (const id of ids) {
            next[id] = true;
          }
          // 保存默认选择到localStorage
          saveSelectedToStorage(next);
          return next;
        }
      });
    });
    return () => {
      off && off();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const id = (await window.parallelchat?.invoke('parallelchat/store/get', 'activeSessionId')) as string | undefined;
        setActiveSessionId(id);
      } catch {}
    })();
    const off = window.parallelchat?.on('parallelchat/session/changed', async (payload: any) => {
      // 优先使用事件中的 activeId，避免从 store 读取到旧值
      if (payload && 'activeId' in payload) {
        setActiveSessionId(payload.activeId);
      } else {
        // 只有在事件没有 activeId 时才回退到从 store 读取
        try {
          const id = (await window.parallelchat?.invoke('parallelchat/store/get', 'activeSessionId')) as string | undefined;
          setActiveSessionId(id);
        } catch {}
      }
    });
    return () => { off && off(); };
  }, []);

  useEffect(() => {
    const offSending = window.parallelchat?.on('parallelchat/message/sending', () => setLoading(true));
    const offUpdate = window.parallelchat?.on('parallelchat/status/update', (payload: any) => {
      const isAny = !!(payload && 'isAnyReplying' in payload ? payload.isAnyReplying : false);
      setLoading(isAny);
    });
    const offComplete = window.parallelchat?.on('parallelchat/status/complete', () => setLoading(false));
    return () => {
      offSending && offSending();
      offUpdate && offUpdate();
      offComplete && offComplete();
    };
  }, []);

  const existingIds = useMemo(() => new Set(providers.map((p) => p.id)), [providers]);
  const loadedSet = useMemo(() => new Set(readyIds), [readyIds]);
  const hasSelection = useMemo(() => Object.values(selected).some(Boolean), [selected]);
  const hasText = useMemo(() => text.trim().length > 0, [text]);
  const canSend = useMemo(() => hasText && hasSelection && !loading, [hasText, hasSelection, loading]);

  // 计算可用的提供商
  const availableProviders = useMemo(() => providers.filter(p => loadedSet.has(p.id)), [providers, loadedSet]);

  // 检查是否全选
  const isAllSelected = useMemo(() => {
    if (availableProviders.length === 0) return false;
    return availableProviders.every(p => selected[p.id]);
  }, [availableProviders, selected]);

  // 检查是否部分选中
  const isIndeterminate = useMemo(() => {
    if (availableProviders.length === 0) return false;
    const selectedCount = availableProviders.filter(p => selected[p.id]).length;
    return selectedCount > 0 && selectedCount < availableProviders.length;
  }, [availableProviders, selected]);

  // 从localStorage读取提供商选择状态
  const loadSelectedFromStorage = (): Record<string, boolean> => {
    try {
      const stored = localStorage.getItem('parallelchat-selected-providers');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // 保存提供商选择状态到localStorage
  const saveSelectedToStorage = (selected: Record<string, boolean>) => {
    try {
      localStorage.setItem('parallelchat-selected-providers', JSON.stringify(selected));
    } catch {}
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const newSelected = { ...prev, [id]: !prev[id] };
      saveSelectedToStorage(newSelected);
      return newSelected;
    });
  };

  const toggleAll = () => {
    if (isAllSelected) {
      // 取消全选
      setSelected((prev) => {
        const newSelected = { ...prev };
        availableProviders.forEach(p => {
          newSelected[p.id] = false;
        });
        saveSelectedToStorage(newSelected);
        return newSelected;
      });
    } else {
      // 全选
      setSelected((prev) => {
        const newSelected = { ...prev };
        availableProviders.forEach(p => {
          newSelected[p.id] = true;
        });
        saveSelectedToStorage(newSelected);
        return newSelected;
      });
    }
  };

  const send = async () => {
    if (!canSend) return;
    const message = text.trim();
    if (!message) return;
    // 发送后立即清空输入框
    setText('');

    const targets = providers.filter((p) => selected[p.id] && loadedSet.has(p.id)).map((p) => p.id);
    setLoading(true);
    try {
      await window.parallelchat?.invoke('parallelchat/broadcast', { text: message, targets });
    } catch {
      setLoading(false);
    }
    // 首次发送：等待网站生成对话ID并创建会话（保留原消息用于标题）
    try {
      const currentActive = (await window.parallelchat?.invoke('parallelchat/store/get', 'activeSessionId')) as string | undefined;
      const sessions = (await window.parallelchat?.invoke('parallelchat/store/get', 'sessions')) as Array<{ id: string }> | undefined;
      const noSessions = !Array.isArray(sessions) || sessions.length === 0;
      const activeNotExists = !!currentActive && Array.isArray(sessions) && !sessions.some((s) => s.id === currentActive);
      if (!currentActive || noSessions || activeNotExists) {
        // 等待网站生成对话ID
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const states = (await window.parallelchat?.invoke('parallelchat/session/snapshot')) as Record<string, { url: string }>;
        const t = message;
        const title = t.length > 10 ? t.slice(0, 10) + '...' : t;
        await window.parallelchat?.invoke('parallelchat/session/create', { title, aiStates: states });
      }
    } catch {}
  };

  const [isComposing, setIsComposing] = useState(false);
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const native = e.nativeEvent as any;
    const composing =
      isComposing ||
      (native && native.isComposing) ||
      (typeof (e as any).keyCode === 'number' && (e as any).keyCode === 229) ||
      (typeof native?.keyCode === 'number' && native.keyCode === 229);
    if (composing) return;
  
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // 发送图标 SVG
  const SendIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M546.858667 520.405333l-321.365334 53.589334a21.333333 21.333333 0 0 0-16.469333 13.568l-110.848 296.832c-10.581333 27.306667 17.962667 53.333333 44.16 40.234666l768-384a32 32 0 0 0 0-57.258666l-768-384c-26.197333-13.098667-54.741333 12.928-44.16 40.234666L209.066667 436.437333a21.333333 21.333333 0 0 0 16.469333 13.610667l321.365333 53.546667a8.533333 8.533333 0 0 1 0 16.810666z"
        fill="currentColor"
      />
    </svg>
  );
  const RectIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="14" rx="2" fill="currentColor" />
    </svg>
  );

  return (
    <div className="p-2">
      {/* 统一的输入框容器 */}
      <div className="relative border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* 输入区域 */}
        <div className="p-3">
          <Textarea
            ref={textareaRef}
            placeholder={t('input.hint')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={onKeyDown}
            className="min-h-[40px] max-h-[100px] border-0 resize-none overflow-y-auto focus:ring-0 focus:outline-none p-0 text-base"
            style={{ boxShadow: 'none' }}
          />
        </div>

        {/* 底部控制区域 */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-gray-100">
          {/* 模型选择区域 */}
          <div className="flex items-center gap-3 flex-1">
            {availableProviders.length > 0 && (
              <>
                {/* 全选按钮 */}
                <Label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Checkbox
                     checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                     onCheckedChange={toggleAll}
                   />
                  <span>{t('input.selectAll')}</span>
                </Label>

                {/* 分隔线 */}
                <div className="w-px h-4 bg-gray-300"></div>
              </>
            )}

            {/* 各个模型的勾选 */}
            <div className="flex flex-wrap gap-3">
              {providers.map((p) => {
                const disabled = !loadedSet.has(p.id);
                const checked = !!selected[p.id];
                return (
                  <Label
                    key={p.id}
                    className={`inline-flex items-center gap-2 text-sm cursor-pointer ${
                      disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Checkbox
                      disabled={disabled}
                      checked={checked}
                      onCheckedChange={() => toggle(p.id)}
                    />
                    <span>{p.name}</span>
                  </Label>
                );
              })}
              {providers.length === 0 && (
                <span className="text-sm text-gray-500">{t('input.addAiPrompt')}</span>
              )}
            </div>
          </div>

          {/* 圆形发送按钮 */}
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className={`
              ml-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
              ${canSend
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <RectIcon />
            ) : (
              <SendIcon />
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
