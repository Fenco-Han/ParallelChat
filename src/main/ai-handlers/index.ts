import { buildScript as buildGemini, buildStatusScript as statusGemini } from './gemini';
import { buildScript as buildKimi, buildStatusScript as statusKimi, buildSendOnlyScript as sendKimi } from './kimi';
import { buildScript as buildDeepSeek, buildStatusScript as statusDeepSeek, buildSendOnlyScript as sendDeepSeek } from './deepseek';
import { buildScript as buildQwen, buildStatusScript as statusQwen } from './qwen';
import { buildScript as buildChatGPT, buildStatusScript as statusChatGPT, buildSendOnlyScript as sendChatGPT } from './chatgpt';
import { buildScript as buildClaude, buildStatusScript as statusClaude, buildSendOnlyScript as sendClaude } from './claude';
import { buildScript as buildDoubao, buildStatusScript as statusDoubao, buildSendOnlyScript as sendDoubao } from './doubao';
import { buildScript as buildYuanbao, buildStatusScript as statusYuanbao, buildSendOnlyScript as sendYuanbao } from './yuanbao';
import { buildScript as buildGlm, buildStatusScript as statusGlm, buildSendOnlyScript as sendGlm } from './glm';
import { buildScript as buildGrok, buildStatusScript as statusGrok, buildSendOnlyScript as sendGrok } from './grok';
import { buildSendOnlyScript as sendQwen } from './qwen';
import { buildSendOnlyScript as sendGemini } from './gemini';

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
};

export function getStatusCheckScript(id: string): string {
  const fn = statusHandlers[id];
  return fn ? fn() : '';
}

export function getSendOnlyScript(id: string): string {
  switch (id) {
    case 'deepseek':
      return sendDeepSeek();
    case 'qwen':
      return sendQwen();
    case 'glm':
      return sendGlm();
    case 'chatgpt':
      return sendChatGPT();
    case 'doubao':
      return sendDoubao();
    case 'yuanbao':
      return sendYuanbao();
    case 'claude': return sendClaude();
    case 'gemini': return sendGemini();
    case 'kimi': return sendKimi();
    case 'grok': return sendGrok();
    default:
      return `(() => {
        try {
          const candidates = [
            'button[type="submit"]',
            'button[aria-label*="Send" i]',
            'button[aria-label*="发送" i]',
            'button[title*="Send" i]',
            'button:has(svg)'
          ];
          let btn = null;
          for (const sel of candidates) {
            const el = document.querySelector(sel);
            if (el) { btn = el; break; }
          }
          if (btn && typeof (btn as any).click === 'function') { (btn as any).click(); return true; }
          const t = document.querySelector('textarea') || document.querySelector('[contenteditable="true"]');
          if (t) {
            t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
            return true;
          }
          return false;
        } catch (_) { return false; }
      })();`;
  }
}
