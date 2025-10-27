import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { PROVIDER_CATALOG } from '../../shared/providers';
import PromptModal from './PromptModal';

type AiProvider = { id: string; name: string; url: string; handler?: string };
type AiGroup = { id: string; name: string; modelIds: string[]; enabled?: boolean };

export default function GlobalInputBar({
  layoutMode,
  activeGroupId,
  providers,
  groups,
}: {
  layoutMode: 'groups' | 'tabs';
  activeGroupId?: string;
  providers: AiProvider[];
  groups: AiGroup[];
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [readyIds, setReadyIds] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  type Attachment = { id: string; filePath: string; mime: string; name: string; dataUrl?: string; kind: 'image' | 'file' };
  const [attachments, setAttachments] = useState<Attachment[]>([]);


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
    const off = window.parallelchat?.on('parallelchat/ai/ready', async (payload: any) => {
      const ids = (payload?.ids ?? []) as string[];
      console.debug('[inputbar][ai/ready]', { ids, layoutMode });
      setReadyIds(ids);
      if (layoutMode === 'tabs') {
        setSelected((prev) => {
          const storedSelected = loadSelectedFromStorage();
          const hasStored = Object.keys(storedSelected).length > 0;
          if (hasStored) return { ...prev, ...storedSelected };
          const next: Record<string, boolean> = { ...prev };
          for (const id of ids) next[id] = true;
          saveSelectedToStorage(next);
          return next;
        });
      }
    });
    return () => { off && off(); };
  }, [layoutMode]);


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

  const loadedSet = useMemo(() => new Set(readyIds), [readyIds]);

  const hasSelection = useMemo(() => Object.values(selected).some(Boolean), [selected]);
  const hasText = useMemo(() => text.trim().length > 0, [text]);
  const canSend = useMemo(() => hasText && hasSelection && !loading, [hasText, hasSelection, loading]);

  // 计算可用的提供商
  const availableProviders = useMemo(() => {
    const toProvider = (id: string) => providers.find((p) => p.id === id) || PROVIDER_CATALOG.find((p) => p.id === id);
    if (layoutMode === 'groups') {
      // 仅显示启用分组的并集（不再根据 loadedSet 过滤显示）。
      const unionIds = Array.from(new Set(groups.filter((g) => g.enabled !== false).flatMap((g) => g.modelIds)));
      return unionIds.map(toProvider).filter((p): p is AiProvider => !!p);
    }
    return providers.filter((p) => loadedSet.has(p.id));
  }, [layoutMode, groups, providers, loadedSet]);

  useEffect(() => {
    try {
      console.debug('[inputbar][availableProviders]', {
        mode: layoutMode,
        activeGroupId,
        readyIds,
        available: availableProviders.map(p => p.id),
      });
    } catch {}
  }, [layoutMode, activeGroupId, readyIds, availableProviders]);

  // 已移除：分组模式下自动覆盖选择的 effect，保留用户手动选择

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
      if (layoutMode === 'tabs') {
        saveSelectedToStorage(newSelected);
      }
      return newSelected;
    });
  };

  const toggleAll = () => {
    if (isAllSelected) {
      setSelected((prev) => {
        const newSelected = { ...prev };
        availableProviders.forEach(p => {
          newSelected[p.id] = false;
        });
        if (layoutMode === 'tabs') {
          saveSelectedToStorage(newSelected);
        }
        return newSelected;
      });
    } else {
      setSelected((prev) => {
        const newSelected = { ...prev };
        availableProviders.forEach(p => {
          newSelected[p.id] = true;
        });
        if (layoutMode === 'tabs') {
          saveSelectedToStorage(newSelected);
        }
        return newSelected;
      });
    }
  };

  const send = async () => {
    if (!canSend) return;
    const message = text.trim();

    const targets = Object.keys(selected).filter((id) => selected[id] && loadedSet.has(id));
    console.debug('[inputbar][send]', { targets, attachments: attachments.length, textLen: message.length });
    if (targets.length === 0) return;

    setLoading(true);

    // 1) 仅上传附件（并行上传到各AI，提高速度）
    if (attachments.length > 0) {
      try {
        const filePaths = attachments.map(a => a.filePath);

        const waitForUploadIdle = async (id: string, timeoutMs = 20000, intervalMs = 500) => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            let uploading = false;
            try {
              const res = await window.parallelchat?.invoke('parallelchat/ai/uploading-check', id) as any;
              uploading = !!(res && (res.uploading === true));
            } catch {}
            if (!uploading) break;
            await new Promise((r) => setTimeout(r, intervalMs));
          }
        };

        // 并行设置文件到所有目标视图
        await Promise.allSettled(
          targets.map((id) =>
            window.parallelchat?.invoke('parallelchat/view/upload-files', { id, selector: 'input[type="file"]', filePaths })
          )
        );

        // 并行等待所有站点处理完上传
        await Promise.allSettled(
          targets.map((id) => waitForUploadIdle(id, 18000, 600))
        );

        // 清空附件
        setAttachments([]);
      } catch {}
    }

    // 2) 再发送文本
    if (message) {
      setText('');
      try {
        await window.parallelchat?.invoke('parallelchat/broadcast', { text: message, targets });
      } catch {}
    }

    // 首次发送：等待网站生成对话ID并创建会话（保留原消息用于标题）
    try {
      const currentActive = (await window.parallelchat?.invoke('parallelchat/store/get', 'activeSessionId')) as string | undefined;
      const sessions = (await window.parallelchat?.invoke('parallelchat/store/get', 'sessions')) as Array<{ id: string }> | undefined;
      const noSessions = !Array.isArray(sessions) || sessions.length === 0;
      const activeNotExists = !!currentActive && Array.isArray(sessions) && !sessions.some((s) => s.id === currentActive);
      const baseTitle = message || (attachments.length > 0 ? (attachments[0]?.name || 'files') : '');
      if (!currentActive || noSessions || activeNotExists) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const states = (await window.parallelchat?.invoke('parallelchat/session/snapshot')) as Record<string, { url: string }>;
        const title = baseTitle.length > 10 ? baseTitle.slice(0, 10) + '...' : baseTitle;
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

  // 新增：添加按钮图标
  const AddIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );

  const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M546.858667 520.405333l-321.365334 53.589334a21.333333 21.333333 0 0 0-16.469333 13.568l-110.848 296.832c-10.581333 27.306667 17.962667 53.333333 44.16 40.234666l768-384a32 32 0 0 0 0-57.258666l-768-384c-26.197333-13.098667-54.741333 12.928-44.16 40.234666L209.066667 436.437333a21.333333 21.333333 0 0 0 16.469333 13.610667l321.365333 53.546667a8.533333 8.533333 0 0 1 0 16.810666z" fill="currentColor" />
    </svg>
  );

  const RectIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="14" rx="2" fill="currentColor" />
    </svg>
  );


  const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      {collapsed ? (
        <path d="M5 12l5-5 5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );

  const PromptIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9 18h6M12 2a7 7 0 0 1 7 7c0 2.386-1.21 4.495-3.04 5.71-.608.414-.96 1.105-.96 1.839V17H9v-.451c0-.734-.352-1.425-.96-1.839A7.001 7.001 0 0 1 5 9a7 7 0 0 1 7-7z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // 移动到组件内部的附件相关函数
  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter(a => a.id !== id));
  };

  const addFiles = async (filePaths: string[], kind: 'image' | 'file') => {
    const next: Attachment[] = [];
    for (const fp of filePaths) {
      const name = fp.split(/[/\\]/).pop() || 'file';
      if (kind === 'image') {
        const res = await window.parallelchat?.invoke('parallelchat/file/read-data-url', fp) as any;
        next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, filePath: fp, mime: res?.mime || 'image/*', name, dataUrl: res?.dataUrl, kind });
      } else {
        next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, filePath: fp, mime: 'application/octet-stream', name, kind });
      }
    }
    setAttachments(prev => [...prev, ...next]);
  };

  // 统一的文件选择对话框：点击添加后直接打开
  const openSelectDialog = async () => {
    const r = await window.parallelchat?.invoke('parallelchat/dialog/open', { mode: 'file', multi: true }) as any;
    if (r && !r.canceled && Array.isArray(r.filePaths)) {
      const exts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.heic']);
      const toExt = (p: string) => {
        const dot = p.lastIndexOf('.');
        return dot >= 0 ? p.slice(dot).toLowerCase() : '';
      };
      const images = r.filePaths.filter((p: string) => exts.has(toExt(p)));
      const others = r.filePaths.filter((p: string) => !exts.has(toExt(p)));
      if (images.length) await addFiles(images, 'image');
      if (others.length) await addFiles(others, 'file');
    }
  };
  const openImageDialog = async () => {
    const r = await window.parallelchat?.invoke('parallelchat/dialog/open', { mode: 'image', multi: true }) as any;
    if (r && !r.canceled && Array.isArray(r.filePaths)) {
      await addFiles(r.filePaths, 'image');
    }
  };
  const openFileDialog = async () => {
    const r = await window.parallelchat?.invoke('parallelchat/dialog/open', { mode: 'file', multi: true }) as any;
    if (r && !r.canceled && Array.isArray(r.filePaths)) {
      await addFiles(r.filePaths, 'file');
    }
  };

  // 拖拽上传事件处理
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (!files.length) return;

    const exts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.heic']);
    const toExt = (p: string) => {
      const dot = p.lastIndexOf('.');
      return dot >= 0 ? p.slice(dot).toLowerCase() : '';
    };

    const paths: string[] = [];
    for (const f of files) {
      const p = (f as any)?.path as string | undefined;
      if (p && typeof p === 'string' && p.length > 0) {
        paths.push(p);
      } else {
        try {
          const buf = await (f as any).arrayBuffer();
          const res = (await window.parallelchat?.invoke('parallelchat/file/save-temp', { name: f.name, buffer: buf })) as any;
          if (res?.ok && typeof res?.filePath === 'string') paths.push(res.filePath);
        } catch {}
      }
    }

    if (!paths.length) return;
    const images = paths.filter((p) => exts.has(toExt(p)));
    const others = paths.filter((p) => !exts.has(toExt(p)));
    if (images.length) await addFiles(images, 'image');
    if (others.length) await addFiles(others, 'file');
  };

  // 粘贴文件/图片上传：检测剪贴板中的文件并保存为临时文件（支持 image 与其他类型，如 .md/.pdf）
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const fileItems = items.filter((i) => i.kind === 'file');
    if (fileItems.length === 0) return;
    e.preventDefault();

    const imagePaths: string[] = [];
    const otherPaths: string[] = [];

    for (const item of fileItems) {
      const file = item.getAsFile();
      if (!file) continue;
      try {
        const buf = await file.arrayBuffer();
        // 优先使用文件名的扩展名；若没有则根据 MIME 推断
        const nameFromClipboard = (file.name || '').trim();
        const inferExtFromMime = (mime: string) => {
          const m = mime.toLowerCase();
          if (m.includes('png')) return '.png';
          if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
          if (m.includes('webp')) return '.webp';
          if (m.includes('gif')) return '.gif';
          if (m.includes('bmp')) return '.bmp';
          if (m.includes('svg')) return '.svg';
          if (m.includes('heic')) return '.heic';
          if (m.includes('pdf')) return '.pdf';
          if (m.includes('markdown')) return '.md';
          if (m.includes('plain')) return '.txt';
          if (m.includes('application/msword')) return '.doc';
          if (m.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) return '.docx';
          if (m.includes('application/vnd.ms-excel')) return '.xls';
          if (m.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) return '.xlsx';
          if (m.includes('application/vnd.ms-powerpoint')) return '.ppt';
          if (m.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation')) return '.pptx';
          return '.bin';
        };
        let ext = '.bin';
        const dot = nameFromClipboard.lastIndexOf('.');
        if (dot >= 0) {
          ext = nameFromClipboard.slice(dot).toLowerCase();
        } else {
          ext = inferExtFromMime(file.type || '');
        }
        const baseName = nameFromClipboard.length > 0 ? nameFromClipboard : `pasted-${Date.now()}${ext}`;
        const res = (await window.parallelchat?.invoke('parallelchat/file/save-temp', { name: baseName, buffer: buf })) as any;
        if (res?.ok && typeof res?.filePath === 'string') {
          const isImage = (file.type || '').toLowerCase().startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.heic'].includes(ext);
          if (isImage) imagePaths.push(res.filePath);
          else otherPaths.push(res.filePath);
        }
      } catch {}
    }

    if (imagePaths.length) await addFiles(imagePaths, 'image');
    if (otherPaths.length) await addFiles(otherPaths, 'file');
  };

  return (
    <div className="p-2">
      {/* 统一的输入框容器 */}
      <div
          className={`relative border ${isDragging ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'} rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        {/* 输入区域 */}
        {!collapsed && (
          <div className="p-3">
            {/* 附件预览区 */}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="relative border rounded-md p-2 flex items-center gap-2 bg-gray-50">
                    {att.kind === 'image' && att.dataUrl ? (
                      <img src={att.dataUrl} alt={att.name} className="w-12 h-12 object-cover rounded-sm" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-sm flex items-center justify-center text-gray-600 text-xs">FILE</div>
                    )}
                    <div className="max-w-[200px] truncate text-sm">{att.name}</div>
                    <button className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center" onClick={() => removeAttachment(att.id)} aria-label="移除附件">×</button>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              ref={textareaRef}
              placeholder={t('input.hint')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={onKeyDown}
              onPaste={handlePaste}
              className="min-h-[40px] max-h-[100px] border-0 resize-none overflow-y-auto focus:ring-0 focus:outline-none p-0 text-base"
              style={{ boxShadow: 'none' }}
            />
          </div>
        )}

        {/* 底部控制区域 */}
        <div className="flex items-center justify-between px-2 py-1 border-t border-gray-100">
          {/* 模型选择区域 */}
          <div className="flex items-center gap-3 flex-1">
            {availableProviders.length > 0 && (
              <>
                {/* 添加按钮（在全选左侧） */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={openSelectDialog}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-gray-100 hover:bg-gray-200 text-gray-700"
                    aria-label="添加附件"
                  >
                    <AddIcon />
                  </button>
                </div>

                {/* 分隔线 */}
                <div className="w-px h-5 bg-gray-200" />

                {/* 全选复选框 */}
                <div className="flex items-center gap-1">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleAll}
                    aria-checked={isIndeterminate ? 'mixed' : isAllSelected}
                  />
                  <Label className="text-xs text-gray-600">{t('input.selectAll')}</Label>
                </div>

                {/* 具体模型复选框列表 */}
                <div className="flex items-center gap-2 flex-wrap">
                  {availableProviders.map((p) => (
                    <label key={p.id} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                      <Checkbox checked={!!selected[p.id]} onCheckedChange={() => toggle(p.id)} />
                      <span className="truncate max-w-[120px]">{p.name || p.id}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 右侧发送与折叠 */}
          <div className="flex items-center gap-2">
            {/* 提示词按钮（在折叠按钮左侧） */}
            <button
              type="button"
              onClick={() => setPromptOpen(true)}
              className="h-8 w-8 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              aria-label="提示词"
              title="提示词"
            >
              <PromptIcon />
            </button>

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              aria-label={collapsed ? t('input.expand') : t('input.collapse')}
            >
              <CollapseIcon collapsed={collapsed} />
            </button>

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
      {/* 提示词管理弹窗 */}
      <PromptModal open={promptOpen} onClose={() => setPromptOpen(false)} />
    </div>
  );
}
