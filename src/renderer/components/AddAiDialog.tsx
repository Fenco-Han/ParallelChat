import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useTranslation } from 'react-i18next';

type AiProvider = { id: string; name: string; url: string; handler?: string };

const PRESET_AI: AiProvider[] = [
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
    id: 'copilot',
    name: 'Copilot',
    url: 'https://copilot.microsoft.com/',
    handler: 'copilot',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    handler: 'deepseek',
  },
  {
    id: 'doubao',
    name: 'Doubao',
    url: 'https://www.doubao.com/',
    handler: 'doubao',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    handler: 'gemini',
  },
  {
    id: 'glm',
    name: 'GLM',
    url: 'https://chatglm.cn/',
    handler: 'glm',
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com/',
    handler: 'grok',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn/',
    handler: 'kimi',
  },
  {
    id: 'mimo',
    name: 'MiMo',
    url: 'https://aistudio.xiaomimimo.com/#/',
    handler: 'mimo',
  },
  {
    id: 'minimax',
    name: 'Minimax',
    url: 'https://agent.minimaxi.com/',
    handler: 'minimax',
  },
  {
    id: 'metaso',
    name: 'Metaso',
    url: 'https://metaso.cn/',
    handler: 'metaso',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/',
    handler: 'perplexity',
  },
  {
    id: 'qwen',
    name: 'Qwen',
    url: 'https://chat.qwen.ai/',
    handler: 'qwen',
  },
  {
    id: 'yuanbao',
    name: 'Yuanbao',
    url: 'https://yuanbao.tencent.com/',
    handler: 'yuanbao',
  },
];

export default function AddAiDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [existing, setExisting] = useState<AiProvider[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const value = await window.parallelchat?.invoke(
          'parallelchat/store/get',
          'aiProviders',
        );
        const typed = value as AiProvider[] | undefined;
        setExisting(typed ?? []);
        setSelected({});
      } catch {
        setExisting([]);
      }
    })();
  }, [open]);

  const existingIds = useMemo(
    () => new Set(existing.map((p) => p.id)),
    [existing],
  );
  const hasSelection = useMemo(
    () => Object.values(selected).some(Boolean),
    [selected],
  );

  const toggle = (id: string) => {
    if (existingIds.has(id)) return;
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addSelected = async () => {
    if (!hasSelection) return;
    const toAdd = PRESET_AI.filter(
      (p) => selected[p.id] && !existingIds.has(p.id),
    );
    if (toAdd.length === 0) {
      onClose();
      return;
    }
    const next: AiProvider[] = [...existing, ...toAdd];
    try {
      await window.parallelchat?.invoke('parallelchat/store/set', 'aiProviders', next);
    } catch {}
    try {
      window.parallelchat?.send('parallelchat/ai/reload');
    } catch {}
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[720px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>{t('addAi.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PRESET_AI.map((p) => {
            const isExisting = existingIds.has(p.id);
            const isSelected = !!selected[p.id];
            return (
              <Button
                key={p.id}
                type="button"
                variant="outline"
                className={`justify-start p-3 h-auto text-left hover:bg-accent/50 ${
                  isExisting
                    ? 'opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'ring-2 ring-primary'
                    : ''
                }`}
                onClick={() => toggle(p.id)}
                disabled={isExisting}
                title={isExisting ? t('addAi.added') : t('addAi.clickToSelect')}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.url}</div>
              </Button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button>
          <Button onClick={addSelected} disabled={!hasSelection}>{t('actions.add')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
