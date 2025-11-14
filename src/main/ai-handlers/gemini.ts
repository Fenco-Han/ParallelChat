export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const input = document.querySelector('.ql-editor');
    if (!input) return console.warn('未找到输入框');

    const value = ${msg};
    try { input.focus(); } catch {}
    try {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, value);
    } catch {}
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch {}

    setTimeout(() => {
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
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const stopElement = document.querySelector('.stop-icon');
      return !!stopElement;
    } catch (_) {
      return false;
    }
  })();`;
}

export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      // 麦克风图标存在 或 发送按钮禁用 都视为上传/准备中
      const mic = document.querySelector('.mat-mdc-button-touch-target');
      const disabledSend = document.querySelector('button[aria-disabled="true"][aria-label*="发送" i]')
        || document.querySelector('button[disabled][aria-label*="发送" i]')
        || document.querySelector('button.send-button[aria-disabled="true"]');
      const visible = (el) => {
        if (!el) return false;
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && (el instanceof HTMLElement ? el.offsetParent !== null : true);
      };
      return visible(mic) || visible(disabledSend);
    } catch (_) {
      return false;
    }
  })();`;
}
