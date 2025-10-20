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
import { useTranslation } from 'react-i18next';

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
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com/',
    handler: 'grok',
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
  const { t } = useTranslation();
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [clearingOne, setClearingOne] = useState<Record<string, boolean>>({});

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
      toast.success(t('settings.cacheCleared', { name: PRESET_AI.find((p) => p.id === id)?.name }));
    } catch {
      toast.error(t('settings.cacheClearFailed', { name: PRESET_AI.find((p) => p.id === id)?.name }));
    } finally {
      setClearingOne((prev) => ({ ...prev, [id]: false }));
    }
  };



  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[960px] max-w-[95vw] sm:max-w-[95vw] space-y-4">
        <DialogHeader>
          <DialogTitle>{t('settings.manageModels')}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          {t('settings.securityNote')}
        </div>

        <div>
          <div className="font-medium mb-3">{t('settings.aiManagement')}</div>
          {Object.values(enabled).filter(Boolean).length > 3 && (
            <div className="mb-2 text-xs text-muted-foreground">
              {t('settings.recommendTabsLayout')}
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
                      <span className="text-sm text-muted-foreground">{t('settings.enable')}</span>
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
                      {clearingOne[p.id] ? t('settings.clearing') : t('settings.clearCache')}
                    </Button>
                  </CardAction>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>


        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
