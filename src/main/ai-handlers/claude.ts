export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const editor = document.querySelector('.ProseMirror[contenteditable="true"]')
      || document.querySelector('[contenteditable="true"]');
    if (!editor) return console.warn('未找到输入框');

    try { if (typeof editor.focus === 'function') editor.focus(); } catch {}

    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('delete', false, null);
    } catch {}

    const msg = ${msg};
    try { document.execCommand('insertText', false, msg); } catch {}
    try { editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch {}

    setTimeout(() => {
      const sendBtn = document.querySelector('button[aria-label="Send message"]')
        || document.querySelector('button[aria-label*="Send" i]');
      if (sendBtn && typeof sendBtn.click === 'function') {
        sendBtn.click();
      } else {
        try {
          editor.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          }));
        } catch {}
      }
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const btn = document.querySelector('button[aria-label="Stop response"]')
        || document.querySelector('button[aria-label*="Stop" i]');
      if (!btn) return false;
      const disabled = btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true';
      const style = window.getComputedStyle(btn);
      const hidden = style.display === 'none' || style.visibility === 'hidden' || (btn instanceof HTMLElement && btn.offsetParent === null);
      return !disabled && !hidden;
    } catch (_) {
      return false;
    }
  })();`;
}

export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      const btn = document.querySelector('button[aria-label="Send message"]')
        || document.querySelector('button[aria-label*="Send" i]');
      if (!btn) return false;

      const container = (btn.closest && btn.closest('div[data-state]')) as HTMLElement | null;
      const state = container?.getAttribute('data-state');
      const disabled = btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true';

      const style = window.getComputedStyle(btn);
      const hidden = style.display === 'none' || style.visibility === 'hidden' || (btn instanceof HTMLElement && btn.offsetParent === null);

      // data-state="closed" + 发送按钮禁用，视为上传/准备中
      return state === 'closed' && disabled && !hidden;
    } catch (_) {
      return false;
    }
  })();`;
}
