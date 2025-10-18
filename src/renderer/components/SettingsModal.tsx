import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Card, CardContent, CardAction, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { toast } from 'sonner';

type AiProvider = { id: string; name: string; url: string; handler?: string };

const PRESET_AI: AiProvider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    handler: 'deepseek',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn/',
    handler: 'kimi',
  },
  {
    id: 'qwen',
    name: 'Qwen',
    url: 'https://chat.qwen.ai/',
    handler: 'qwen',
  },
  {
    id: 'doubao',
    name: 'Doubao',
    url: 'https://www.doubao.com/',
    handler: 'doubao',
  },
  {
    id: 'yuanbao',
    name: 'Yuanbao',
    url: 'https://yuanbao.tencent.com/',
    handler: 'yuanbao',
  },
  {
    id: 'glm',
    name: 'GLM',
    url: 'https://chatglm.cn/',
    handler: 'glm',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    handler: 'chatgpt',
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/',
    handler: 'claude',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    handler: 'gemini',
  },
];

export default function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [clearingOne, setClearingOne] = useState<Record<string, boolean>>({});
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const value = (await window.parallelchat?.invoke(
          'parallelchat/store/get',
          'aiProviders',
        )) as AiProvider[] | undefined;
        const current = value ?? [];
        setProviders(current);
        const map: Record<string, boolean> = {};
        PRESET_AI.forEach((p) => {
          map[p.id] = current.some((c) => c.id === p.id);
        });
        setEnabled(map);
      } catch {
        setProviders([]);
        const map: Record<string, boolean> = {};
        PRESET_AI.forEach((p) => {
          map[p.id] = false;
        });
        setEnabled(map);
      }
    })();
  }, [open]);

  const toggleEnable = (id: string) =>
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  const save = async () => {
    setSaving(true);
    const next = PRESET_AI.filter((p) => enabled[p.id]);
    try {
      await window.parallelchat?.invoke(
        'parallelchat/store/set',
        'aiProviders',
        next,
      );
    } catch {
      // Handle error silently
    }
    try {
      window.parallelchat?.send('parallelchat/ai/reload');
    } catch {
      // Handle error silently
    }
    setSaving(false);
    onClose();
  };

  const clearOne = async (id: string) => {
    setClearingOne((prev) => ({ ...prev, [id]: true }));
    try {
      window.parallelchat?.send('parallelchat/cache/clear', id);
      toast.success(`已清除 ${PRESET_AI.find((p) => p.id === id)?.name} 的缓存`);
    } catch {
      toast.error(`清除 ${PRESET_AI.find((p) => p.id === id)?.name} 缓存失败`);
    } finally {
      setClearingOne((prev) => ({ ...prev, [id]: false }));
    }
  };

  const clearAll = async () => {
    setClearingAll(true);
    try {
      window.parallelchat?.send('parallelchat/cache/clear-all');
      toast.success('已清除所有缓存');
    } catch {
      toast.error('清除缓存失败');
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[960px] max-w-[95vw] sm:max-w-[95vw] space-y-4">
        <DialogHeader>
          <DialogTitle>模型管理</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          受安全限制，无法使用 Google 账号登录。如果使用 Qwen、ChatGPT、Claude 必须以非 Google 账号登录；Gemini 无法登录。
        </div>

        <div>
          <div className="font-medium mb-3">AI 管理</div>
          {Object.values(enabled).filter(Boolean).length > 3 && (
            <div className="mb-2 text-xs text-muted-foreground">
              模型超过3个推荐使用标签模式布局
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {PRESET_AI.map((p) => (
              <Card key={p.id} className="py-3">
                <CardContent className="flex items-center justify-between px-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {p.name}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.url}
                    </div>
                  </div>
                  <CardAction className="flex items-center gap-2 ml-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">启用</span>
                      <Switch
                        checked={!!enabled[p.id]}
                        onCheckedChange={() => toggleEnable(p.id)}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => clearOne(p.id)}
                      disabled={!enabled[p.id] || clearingOne[p.id]}
                    >
                      {clearingOne[p.id] ? '清除中...' : '清除缓存'}
                    </Button>
                  </CardAction>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <div className="font-medium mb-2">缓存管理</div>
          <Button
            variant="secondary"
            onClick={clearAll}
            disabled={clearingAll}
          >
            {clearingAll ? '清除中...' : '一键清除所有缓存'}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={save} disabled={saving}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
