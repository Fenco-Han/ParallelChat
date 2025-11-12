import { buildScript as buildGemini, buildStatusScript as statusGemini, buildUploadCheckScript as uploadGemini } from './gemini';
import { buildScript as buildKimi, buildStatusScript as statusKimi, buildUploadCheckScript as uploadKimi } from './kimi';
import { buildScript as buildDeepSeek, buildStatusScript as statusDeepSeek, buildUploadCheckScript as uploadDeepSeek } from './deepseek';
import { buildScript as buildQwen, buildStatusScript as statusQwen, buildUploadCheckScript as uploadQwen } from './qwen';
import { buildScript as buildChatGPT, buildStatusScript as statusChatGPT, buildUploadCheckScript as uploadChatGPT } from './chatgpt';
import { buildScript as buildClaude, buildStatusScript as statusClaude, buildUploadCheckScript as uploadClaude } from './claude';
import { buildScript as buildDoubao, buildStatusScript as statusDoubao, buildUploadCheckScript as uploadDoubao } from './doubao';
import { buildScript as buildYuanbao, buildStatusScript as statusYuanbao, buildUploadCheckScript as uploadYuanbao } from './yuanbao';
import { buildScript as buildGlm, buildStatusScript as statusGlm, buildUploadCheckScript as uploadGlm } from './glm';
import { buildScript as buildGrok, buildStatusScript as statusGrok, buildUploadCheckScript as uploadGrok } from './grok';
import { buildScript as buildCopilot, buildStatusScript as statusCopilot, buildUploadCheckScript as uploadCopilot } from './copilot';
import { buildScript as buildMinimax, buildStatusScript as statusMinimax, buildUploadCheckScript as uploadMinimax } from './minimax';
import { buildScript as buildPerplexity, buildStatusScript as statusPerplexity, buildUploadCheckScript as uploadPerplexity } from './perplexity';
import { buildScript as buildMetaso, buildStatusScript as statusMetaso, buildUploadCheckScript as uploadMetaso } from './metaso';



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
  grok: buildGrok,
  copilot: buildCopilot,
  minimax: buildMinimax,
  perplexity: buildPerplexity,
  metaso: buildMetaso,
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
  grok: statusGrok,
  copilot: statusCopilot,
  minimax: statusMinimax,
  perplexity: statusPerplexity,
  metaso: statusMetaso,
};

export function getStatusCheckScript(id: string): string {
  const fn = statusHandlers[id];
  return fn ? fn() : '';
}

// 新增：上传忙碌检测脚本映射与构造
const uploadHandlers: Record<string, () => string> = {
  chatgpt: uploadChatGPT,
  gemini: uploadGemini,
  kimi: uploadKimi,
  deepseek: uploadDeepSeek,
  qwen: uploadQwen,
  claude: uploadClaude,
  doubao: uploadDoubao,
  yuanbao: uploadYuanbao,
  glm: uploadGlm,
  grok: uploadGrok,
  copilot: uploadCopilot,
  minimax: uploadMinimax,
  perplexity: uploadPerplexity,
  metaso: uploadMetaso,
};

export function getUploadCheckScript(id: string): string {
  const fn = uploadHandlers[id];
  if (fn) return fn();
  // 通用回退：发送按钮处于 disabled 或存在常见上传/进度元素则视为忙碌
  return `(() => {
    try {
      const disabledSelectors = [
        'button[type="submit"][disabled]',
        'button[aria-disabled="true"]',
        'button[aria-label*="发送" i][disabled]',
        'button[aria-label*="Send" i][disabled]',
        '#composer-submit-button[disabled]'
      ];
      for (const sel of disabledSelectors) {
        const el = document.querySelector(sel);
        if (el) return true;
      }
      const progressSelectors = [
        '[role="progressbar"]',
        '.loading',
        '.spinner',
        '.is-loading',
        'svg[aria-busy="true"]',
        '[data-testid*="upload" i]'
      ];
      for (const sel of progressSelectors) {
        const el = document.querySelector(sel);
        if (el) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  })();`;
}
