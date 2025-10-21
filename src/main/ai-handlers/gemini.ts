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

export function buildSendOnlyScript(): string {
  return `(() => {
    const btn =
      document.querySelector('button[aria-label*="发送" i]')
      || document.querySelector('button[aria-label*="send" i]')
      || document.querySelector('.send-button.submit');
    if (btn && typeof (btn as any).click === 'function') {
      (btn as any).click();
      return true;
    }
    const el =
      document.querySelector('.ql-editor')
      || document.querySelector('[contenteditable="true"][aria-label*="prompt" i]')
      || document.querySelector('div[role="textbox"]')
      || document.querySelector('textarea');
    if (el) {
      try {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        return true;
      } catch {}
    }
    const form = (el as any)?.closest?.('form') || document.querySelector('form');
    if (form && typeof (form as any).requestSubmit === 'function') {
      (form as any).requestSubmit();
      return true;
    }
    return false;
  })();`;
}
