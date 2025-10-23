export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    var el = document.querySelector('.ql-editor')
      || document.querySelector('[contenteditable="true"][aria-label*="prompt" i]')
      || document.querySelector('div[role="textbox"]')
      || document.querySelector('textarea');
    if (!el) return console.warn('未找到输入框');
    var msg = ${msg};
    if (el.tagName && el.tagName.toLowerCase() === 'textarea') {
      try {
        var desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (desc && typeof desc.set === 'function') desc.set.call(el, msg); else el.value = msg;
      } catch (_) {
        el.value = msg;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      var form = el.form || el.closest('form');
      if (form && typeof form.requestSubmit === 'function') { form.requestSubmit(); }
      else if (form) { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
      else { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); }
    } else {
      if (el && typeof el.focus === 'function') el.focus();
      try {
        var sel = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('insertText', false, msg);
      } catch (_) {
        if ('innerText' in el) el.innerText = msg; else el.textContent = msg;
      }
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    }
    var btn = document.querySelector('button[aria-label*="send" i]') || document.querySelector('button[title*="send" i]');
    if (btn && typeof btn.click === 'function') btn.click();
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
