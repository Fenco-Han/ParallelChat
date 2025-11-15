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
      // 只检测发送按钮是否禁用来判断是否在上传中
      const disabledSend = document.querySelector('.send-button-container.inner.visible.disabled');
      const visible = (el) => {
        if (!el) return false;
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && (el instanceof HTMLElement ? el.offsetParent !== null : true);
      };
      return visible(disabledSend);
    } catch (_) {
      return false;
    }
  })();`;
}
