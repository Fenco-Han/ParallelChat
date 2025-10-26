import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardAction, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

type Prompt = { id: string; title: string; content: string };

const STORAGE_KEY = 'parallelchat-prompts';

function loadPrompts(): Prompt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((p) => p && typeof p.id === 'string');
    return [];
  } catch {
    return [];
  }
}

function savePrompts(next: Prompt[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export default function PromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');

  useEffect(() => {
    if (!open) return;
    setPrompts(loadPrompts());
  }, [open]);

  // 打开弹窗时隐藏 Workspace 中的网页视图，避免遮挡；关闭后恢复
  useEffect(() => {
    try {
      window.parallelchat?.send('parallelchat/view/visible', !open);
    } catch {}
  }, [open]);

  const startCreate = () => {
    setCreating(true);
    setNewTitle('');
    setNewContent('');
  };
  const cancelCreate = () => {
    setCreating(false);
    setNewTitle('');
    setNewContent('');
  };
  const createPrompt = () => {
    const title = newTitle.trim() || (newContent.trim().split('\n')[0] || t('prompts.untitled'));
    const content = newContent.trim();
    if (!content) {
      toast.error(t('prompts.contentRequired'));
      return;
    }
    const id = `prompt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const next = [...prompts, { id, title, content }];
    setPrompts(next);
    savePrompts(next);
    toast.success(t('prompts.saved'));
    cancelCreate();
  };

  const startEdit = (p: Prompt) => {
    setEditingId(p.id);
    setEditingTitle(p.title);
    setEditingContent(p.content);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
    setEditingContent('');
  };
  const saveEdit = () => {
    if (!editingId) return;
    const title = (editingTitle || '').trim() || (editingContent.trim().split('\n')[0] || t('prompts.untitled'));
    const content = editingContent.trim();
    if (!content) {
      toast.error(t('prompts.contentRequired'));
      return;
    }
    const next = prompts.map((p) => (p.id === editingId ? { ...p, title, content } : p));
    setPrompts(next);
    savePrompts(next);
    toast.success(t('prompts.updated'));
    cancelEdit();
  };

  const deletePrompt = (id: string) => {
    const next = prompts.filter((p) => p.id !== id);
    setPrompts(next);
    savePrompts(next);
    toast.success(t('prompts.deleted'));
    if (editingId === id) cancelEdit();
  };

  const copyPrompt = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t('prompts.copySuccess'));
      onClose();
    } catch {
      toast.error(t('prompts.copyFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[960px] max-w-[95vw] sm:max-w-[95vw] space-y-4 z-[1000]">
        <DialogHeader>
          <DialogTitle>{t('prompts.manageTitle')}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <div className="font-medium">{t('prompts.listTitle')}</div>
          {!creating && (
            <Button size="sm" onClick={startCreate}>{t('prompts.new')}</Button>
          )}
        </div>

        {creating && (
          <Card className="mb-4">
            <CardContent className="px-4 py-3 space-y-3">
              <div>
                <div className="text-sm mb-1">{t('prompts.titleLabel')}</div>
                <input
                  className="w-full h-8 px-2 border rounded-md"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('prompts.titlePlaceholder') as string}
                />
              </div>
              <div>
                <div className="text-sm mb-1">{t('prompts.contentLabel')}</div>
                <Textarea
                  className="h-28"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={t('prompts.contentPlaceholder') as string}
                />
              </div>
              <div className="flex items-center gap-3 justify-end">
                <Button size="sm" onClick={createPrompt}>{t('actions.save')}</Button>
                <Button size="sm" variant="ghost" onClick={cancelCreate}>{t('actions.cancel')}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {prompts.length === 0 && !creating && (
          <div className="text-sm text-muted-foreground">{t('prompts.empty')}</div>
        )}

        <div className="space-y-2">
          {prompts.map((p) => (
            <Card key={p.id}>
              <CardContent className="px-4 py-3">
                {editingId === p.id ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm mb-1">{t('prompts.titleLabel')}</div>
                      <input
                        className="w-full h-8 px-2 border rounded-md"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-sm mb-1">{t('prompts.contentLabel')}</div>
                      <Textarea
                        className="h-28"
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-3 justify-end">
                      <Button size="sm" onClick={saveEdit}>{t('actions.save')}</Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>{t('actions.cancel')}</Button>
                      <Button size="sm" variant="destructive" onClick={() => deletePrompt(p.id)}>{t('actions.delete')}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{p.title}</CardTitle>
                      <div className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap break-words mt-1">
                        {p.content}
                      </div>
                    </div>
                    <CardAction className="flex items-center gap-3 ml-3">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>{t('actions.edit')}</Button>
                      <Button size="sm" onClick={() => copyPrompt(p.content)}>{t('actions.copy')}</Button>
                      <Button size="sm" variant="destructive" onClick={() => deletePrompt(p.id)}>{t('actions.delete')}</Button>
                    </CardAction>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}