export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const textarea = document.querySelector('textarea[data-testid="chat_input_input"]')
      || document.querySelector('textarea');
    if (!textarea) { console.error('未找到输入框'); return; }

    const message = ${msg};
    try {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (descriptor && typeof descriptor.set === 'function') {
        descriptor.set.call(textarea, message);
      } else {
        textarea.value = message;
      }
    } catch { textarea.value = message; }

    try { if (typeof textarea.focus === 'function') textarea.focus(); } catch {}

    ['input','change','keyup','blur','focus'].forEach((eventType) => {
      try { textarea.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true })); } catch {}
    });

    try {
      if (typeof textarea.select === 'function') textarea.select();
      document.execCommand('insertText', false, message);
    } catch {}

    setTimeout(() => {
      const sendBtn = document.querySelector('button[data-testid="chat_input_send_button"]');
      if (sendBtn && !sendBtn.getAttribute('disabled')) {
        try { if (typeof sendBtn.click === 'function') sendBtn.click(); } catch {}
      } else {
        try {
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          });
          textarea.dispatchEvent(enterEvent);
        } catch {}

        setTimeout(() => {
          const btn = document.querySelector('button[data-testid="chat_input_send_button"]');
          if (btn && !btn.getAttribute('disabled')) {
            try { if (typeof btn.click === 'function') btn.click(); } catch {}
          }
        }, 50);
      }
    }, 200);

    try {
      console.log('输入框当前值:', textarea.value);
      var btn2 = document.querySelector('button[data-testid="chat_input_send_button"]');
      var disabled = btn2 ? (!!btn2.disabled || !!(btn2.getAttribute && btn2.getAttribute('disabled'))) : false;
      console.log('发送按钮状态:', disabled);
    } catch {}
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const el = document.querySelector('[data-testid="chat_input_local_break_button"]');
      return !!(el && !el.classList.contains('!hidden'));
    } catch (_) {
      return false;
    }
  })();`;
}

export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      const btn = document.querySelector('button[data-testid="chat_input_send_button"]');
      if (!btn) return false;
      const disabled = btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true';
      const style = window.getComputedStyle(btn);
      const hidden = style.display === 'none' || style.visibility === 'hidden' || (btn instanceof HTMLElement && btn.offsetParent === null);
      return disabled && !hidden;
    } catch (_) {
      return false;
    }
  })();`;
}
