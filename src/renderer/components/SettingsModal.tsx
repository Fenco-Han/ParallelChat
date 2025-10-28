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
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

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
  const [settingsTab, setSettingsTab] = useState<'labels' | 'groups'>('labels');
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [clearingOne, setClearingOne] = useState<Record<string, boolean>>({});

  const clearOne = async (id: string) => {
    setClearingOne((prev) => ({ ...prev, [id]: true }));
    try {
      await window.parallelchat?.invoke('parallelchat/cache/clear', id);
    } catch {}
    setClearingOne((prev) => ({ ...prev, [id]: false }));
  };

  type AiGroup = { id: string; name: string; modelIds: string[]; enabled?: boolean };
  const [groups, setGroups] = useState<AiGroup[]>([]);
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupModels, setNewGroupModels] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingModels, setEditingModels] = useState<Set<string>>(new Set());

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

      try {
        const g = (await window.parallelchat?.invoke('parallelchat/store/get', 'aiGroups')) as AiGroup[] | undefined;
        const list = (g ?? []).map((x) => ({ ...x, enabled: x.enabled !== false }));
        setGroups(list);
      } catch {
        setGroups([]);
      }
    })();
  }, [open]);

  const toggleEnable = (id: string) =>
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  const saveProviders = async () => {
    setSaving(true);
    const next = PRESET_AI.filter((p) => enabled[p.id]);
    try {
      await window.parallelchat?.invoke(
        'parallelchat/store/set',
        'aiProviders',
        next,
      );
    } catch {}
    try {
      window.parallelchat?.send('parallelchat/ai/reload');
    } catch {}
    setSaving(false);
    onClose();
  };

  const startCreate = () => {
    setCreating(true);
    setNewGroupName('');
    setNewGroupModels(new Set());
  };
  const cancelCreate = () => {
    setCreating(false);
    setNewGroupName('');
    setNewGroupModels(new Set());
  };
  const toggleNewGroupModel = (id: string) => {
    setNewGroupModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const createGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      toast.error(t('settings.groups.nameRequired'));
      return;
    }
    const id = `group-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const next: AiGroup[] = [...groups, { id, name, modelIds: Array.from(newGroupModels), enabled: true }];
    try {
      await window.parallelchat?.invoke('parallelchat/store/set', 'aiGroups', next);
      // 同步 layout.disabledGroups：确保新分组默认启用
      try {
        const layout = (await window.parallelchat?.invoke('parallelchat/store/get', 'layout')) as any;
        const disabled = Array.isArray(layout?.disabledGroups) ? layout.disabledGroups : [];
        const nextLayout = { ...layout, disabledGroups: disabled.filter((gid: string) => gid !== id) };
        await window.parallelchat?.invoke('parallelchat/store/set', 'layout', nextLayout);
      } catch {}
      window.parallelchat?.send('parallelchat/groups/reload');
      setGroups(next);
      toast.success(t('settings.groups.saved'));
      cancelCreate();
      onClose();
    } catch {
      toast.error(t('settings.groups.saveFailed'));
    }
  };

  const startEdit = (g: AiGroup) => {
    setEditingId(g.id);
    setEditingName(g.name);
    setEditingModels(new Set(g.modelIds));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingModels(new Set());
  };
  const toggleEditModel = (id: string) => {
    setEditingModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) {
      toast.error(t('settings.groups.nameRequired'));
      return;
    }
    const next = groups.map((g) => g.id === editingId ? { ...g, name, modelIds: Array.from(editingModels) } : g);
    try {
      await window.parallelchat?.invoke('parallelchat/store/set', 'aiGroups', next);
      window.parallelchat?.send('parallelchat/groups/reload');
      setGroups(next);
      toast.success(t('settings.groups.saved'));
      cancelEdit();
      onClose();
    } catch {
      toast.error(t('settings.groups.saveFailed'));
    }
  };
  const deleteGroup = async (id: string) => {
    const next = groups.filter((g) => g.id !== id);
    try {
      await window.parallelchat?.invoke('parallelchat/store/set', 'aiGroups', next);
      try {
        const layout = (await window.parallelchat?.invoke('parallelchat/store/get', 'layout')) as any;
        const disabled = Array.isArray(layout?.disabledGroups) ? layout.disabledGroups : [];
        const nextLayout = { ...layout, disabledGroups: disabled.filter((gid: string) => gid !== id) };
        await window.parallelchat?.invoke('parallelchat/store/set', 'layout', nextLayout);
      } catch {}
      window.parallelchat?.send('parallelchat/groups/reload');
      setGroups(next);
      toast.success(t('settings.groups.deleted'));
      if (editingId === id) cancelEdit();
      onClose();
    } catch {
      toast.error(t('settings.groups.deleteFailed'));
    }
  };

  // 重置为预设分组（覆盖现有分组）：DeepSeek|Qwen|GLM；Kimi|Doubao|Yuanbao；ChatGPT|Claude|Grok
  const createPresetGroups = async () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(t('settings.groups.confirmReset') as string);
      if (!ok) return;
    }
    const presets = [
      { id: 'group-dq', name: 'DeepSeek | Qwen', ids: ['deepseek','qwen'] },
      { id: 'group-gk', name: 'GLM | Kimi', ids: ['glm','kimi'] },
      { id: 'group-dy', name: 'Doubao | Yuanbao', ids: ['doubao','yuanbao'] },
      { id: 'group-cg', name: 'ChatGPT | Grok', ids: ['chatgpt','grok'] },
    ];
    const created = presets.map((c) => ({ id: c.id, name: c.name, modelIds: c.ids, enabled: true }));
    const next = [...created];
    try {
      await window.parallelchat?.invoke('parallelchat/store/set', 'aiGroups', next);
      // 覆盖 groupOrder 为预设分组顺序
      const layout = (await window.parallelchat?.invoke('parallelchat/store/get', 'layout')) as any;
      const order = next.map((g) => g.id);
      await window.parallelchat?.invoke('parallelchat/store/set', 'layout', { ...layout, groupOrder: order, disabledGroups: [] });
      window.parallelchat?.send('parallelchat/groups/reload');
      setGroups(next);
      toast.success(t('settings.groups.saved'));
      onClose();
    } catch {
      toast.error(t('settings.groups.saveFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[960px] max-w-[95vw] sm:max-w-[95vw] space-y-5 bg-gradient-card backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>{t('settings.manageModels')}</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground font-medium backdrop-blur-sm shadow-sm">
          {t('settings.securityNote')}
        </div>

        <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as 'labels' | 'groups')}>
          <TabsList>
            <TabsTrigger value="labels">{t('settings.labelsMode')}</TabsTrigger>
            <TabsTrigger value="groups">{t('settings.groupsMode')}</TabsTrigger>
          </TabsList>

          <TabsContent value="labels">
            <div>
              <div className="font-semibold text-lg mb-4 text-foreground">{t('settings.aiManagement')}</div>
              {Object.values(enabled).filter(Boolean).length > 3 && (
                <div className="mb-3 text-xs text-muted-foreground font-medium bg-muted/20 p-3 rounded-lg">
                  {t('settings.recommendTabsLayout')}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {PRESET_AI.map((p) => (
                  <Card key={p.id} className="py-4 bg-gradient-card hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-border/50">
                    <CardContent className="flex items-center justify-between px-5">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-bold truncate text-foreground">
                          {p.name}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground font-medium truncate mt-1">
                          {p.url}
                        </div>
                      </div>
                      <CardAction className="flex items-center gap-2 ml-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground font-medium">{t('settings.enable')}</span>
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
                          className="font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          {clearingOne[p.id] ? t('settings.clearing') : t('settings.clearCache')}
                        </Button>
                      </CardAction>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groups">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-lg text-foreground">{t('settings.groups.title')}</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={createPresetGroups} className="font-semibold shadow-sm hover:shadow-md transition-all duration-200">{t('settings.groups.createPresets')}</Button>
                  {!creating && (
                    <Button size="sm" onClick={startCreate} className="bg-gradient-primary text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-200">{t('settings.groups.new')}</Button>
                  )}
                </div>
              </div>

              {creating && (
                <Card className="mb-4 bg-gradient-card shadow-md border-border/50">
                  <CardContent className="px-5 py-4 space-y-4">
                    <div>
                      <div className="text-sm font-semibold mb-2 text-foreground">{t('settings.groups.name')}</div>
                      <input
                        className="w-full h-9 px-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring transition-all duration-200 font-medium"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder={t('settings.groups.namePlaceholder') as string}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-2 text-foreground">{t('settings.groups.models')}</div>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                        {PRESET_AI.map((p) => (
                          <label key={p.id} className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={newGroupModels.has(p.id)}
                              onChange={() => toggleNewGroupModel(p.id)}
                            />
                            <span className="truncate">{p.name || p.id}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end pt-2">
                      <Button onClick={createGroup} className="bg-gradient-primary text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-200">{t('actions.save')}</Button>
                      <Button variant="ghost" onClick={cancelCreate}>{t('actions.cancel')}</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {groups.length === 0 && !creating && (
                <div className="text-sm text-muted-foreground font-medium bg-muted/20 p-4 rounded-lg text-center">{t('settings.groups.empty')}</div>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                {groups.map((g) => (
                  <Card key={g.id} className={`${g.enabled === false ? 'opacity-60' : ''} bg-gradient-card hover:shadow-lg transition-all duration-300 border-border/50`}>
                    <CardContent className="px-4 py-3">
                    {editingId === g.id ? (
                        <div className="space-y-3">
                          <div>
                            <div className="text-sm font-semibold mb-2 text-foreground">{t('settings.groups.name')}</div>
                            <input
                              className="w-full h-8 px-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring transition-all duration-200 font-medium"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                            />
                          </div>
                          <div>
                            <div className="text-sm font-semibold mb-2 text-foreground">{t('settings.groups.models')}</div>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                              {PRESET_AI.map((p) => (
                                <label key={p.id} className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={editingModels.has(p.id)}
                                    onChange={() => toggleEditModel(p.id)}
                                  />
                                  <span className="truncate">{p.name || p.id}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end pt-2">
                            <Button size="sm" onClick={saveEdit} className="bg-gradient-primary text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-200">{t('actions.save')}</Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>{t('actions.cancel')}</Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteGroup(g.id)}>{t('actions.delete')}</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-foreground text-sm">{g.name}</div>
                            <div className="text-xs text-muted-foreground font-medium mt-0.5">{t('settings.groups.count', { count: g.modelIds.length })}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-muted-foreground font-medium">{t('settings.enable')}</span>
                              <Switch
                                checked={g.enabled !== false}
                                onCheckedChange={async (checked) => {
                                  const next = groups.map((x) => x.id === g.id ? { ...x, enabled: !!checked } : x);
                                  try {
                                    await window.parallelchat?.invoke('parallelchat/store/set', 'aiGroups', next);
                                    // 同步 layout.disabledGroups
                                    try {
                                      const layout = (await window.parallelchat?.invoke('parallelchat/store/get', 'layout')) as any;
                                      const disabled = Array.isArray(layout?.disabledGroups) ? layout.disabledGroups : [];
                                      const nextDisabled = checked ? disabled.filter((gid: string) => gid !== g.id) : Array.from(new Set([...disabled, g.id]));
                                      await window.parallelchat?.invoke('parallelchat/store/set', 'layout', { ...layout, disabledGroups: nextDisabled });
                                    } catch {}
                                    window.parallelchat?.send('parallelchat/groups/reload');
                                    setGroups(next);
                                  } catch {}
                                }}
                              />
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => startEdit(g)} className="font-semibold shadow-sm hover:shadow-md transition-all duration-200">{t('actions.edit')}</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteGroup(g.id)}>{t('actions.delete')}</Button>
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('actions.cancel')}
          </Button>
          {settingsTab === 'labels' && (
            <Button onClick={saveProviders} disabled={saving}>
              {t('actions.save')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
