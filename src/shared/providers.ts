export type AiProvider = { id: string; name: string; url: string; handler?: string };

export const PROVIDER_CATALOG: AiProvider[] = [
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/', handler: 'deepseek' },
  { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn/', handler: 'kimi' },
  { id: 'qwen', name: 'Qwen', url: 'https://chat.qwen.ai/', handler: 'qwen' },
  { id: 'doubao', name: 'Doubao', url: 'https://www.doubao.com/', handler: 'doubao' },
  { id: 'yuanbao', name: 'Yuanbao', url: 'https://yuanbao.tencent.com/', handler: 'yuanbao' },
  { id: 'glm', name: 'GLM', url: 'https://chatglm.cn/', handler: 'glm' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', handler: 'chatgpt' },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/', handler: 'claude' },
  { id: 'grok', name: 'Grok', url: 'https://grok.com/', handler: 'grok' },
  { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com/', handler: 'copilot' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', handler: 'gemini' },
];
