import { buildScript as buildGemini, buildStatusScript as statusGemini } from './gemini';
import { buildScript as buildKimi, buildStatusScript as statusKimi } from './kimi';
import { buildScript as buildDeepSeek, buildStatusScript as statusDeepSeek } from './deepseek';
import { buildScript as buildQwen, buildStatusScript as statusQwen } from './qwen';
import { buildScript as buildChatGPT, buildStatusScript as statusChatGPT } from './chatgpt';
import { buildScript as buildClaude, buildStatusScript as statusClaude } from './claude';
import { buildScript as buildDoubao, buildStatusScript as statusDoubao } from './doubao';
import { buildScript as buildYuanbao, buildStatusScript as statusYuanbao } from './yuanbao';
import { buildScript as buildGlm, buildStatusScript as statusGlm } from './glm';

const handlers: Record<string, (text: string) => string> = {
  gemini: buildGemini,
  kimi: buildKimi,
  deepseek: buildDeepSeek,
  qwen: buildQwen,
  chatgpt: buildChatGPT,
  claude: buildClaude,
  doubao: buildDoubao,
  yuanbao: buildYuanbao,
  glm: buildGlm,
};

export function getInjectionScript(id: string, text: string): string {
  const fn = handlers[id];
  return fn ? fn(text) : '';
}

const statusHandlers: Record<string, () => string> = {
  gemini: statusGemini,
  kimi: statusKimi,
  deepseek: statusDeepSeek,
  qwen: statusQwen,
  chatgpt: statusChatGPT,
  claude: statusClaude,
  doubao: statusDoubao,
  yuanbao: statusYuanbao,
  glm: statusGlm,
};

export function getStatusCheckScript(id: string): string {
  const fn = statusHandlers[id];
  return fn ? fn() : '';
}
