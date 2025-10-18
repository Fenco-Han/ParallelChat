export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const input = document.querySelector('div[contenteditable="true"][id="prompt-textarea"]')
      || document.querySelector('textarea[data-testid="prompt-textarea"]')
      || document.querySelector('[contenteditable="true"]')
      || document.querySelector('textarea');
    if (!input) return console.warn('❌ 未找到输入框');

    const text = ${msg};
    try { input.focus(); } catch {}
    try {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, text);
    } catch {}
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch {}

    try {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(enterEvent);
    } catch {}

    setTimeout(() => {
      const sendBtn = document.querySelector('#composer-submit-button')
        || document.querySelector('button[aria-label*="Send" i]')
        || document.querySelector('button[type="submit"]');
      if (sendBtn && typeof sendBtn.click === 'function') {
        sendBtn.click();
      }
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const rectanglePath = "M4.5 5.75C4.5 5.05964 5.05964 4.5 5.75 4.5H14.25C14.9404 4.5 15.5 5.05964 15.5 5.75V14.25C15.5 14.9404 14.9404 15.5 14.25 15.5H5.75C5.05964 15.5 4.5 14.9404 4.5 14.25V5.75Z";
      const paths = document.querySelectorAll('path');
      for (const p of Array.from(paths)) {
        if (p.getAttribute('d') === rectanglePath) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  })();`;
}
