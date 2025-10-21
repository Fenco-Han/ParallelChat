export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const textarea = document.querySelector('textarea.scroll-display-none')
      || document.querySelector('textarea');
    if (!textarea) return console.warn('未找到输入框');

    const msg = ${msg};

    try { textarea.value = msg; } catch {}
    try { textarea.dispatchEvent(new Event('input', { bubbles: true })); } catch {}

    try {
      textarea.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, msg);
    } catch {}

    setTimeout(() => {
      const sendBtn = document.querySelector('.enter.is-main-chat')
        || document.querySelector('.enter-icon-container');
      if (sendBtn && typeof sendBtn.click === 'function') {
        sendBtn.click();
      }

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

      const form = (textarea.closest && textarea.closest('form')) || textarea.form;
      if (form) {
        try { if (typeof form.requestSubmit === 'function') form.requestSubmit(); } catch {}
        try { form.dispatchEvent && form.dispatchEvent(new Event('submit', { bubbles: true })); } catch {}
      }
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      // Presence of the 'enter_icon' image denotes generating/stop button visible
      const imgs = document.querySelectorAll('img[src*="pause_session"]');
      return imgs && imgs.length > 0;
    } catch (_) {
      return false;
    }
  })();`;
}

export function buildSendOnlyScript(): string {
  return `(() => {
    try {
      const textarea = document.querySelector('textarea.scroll-display-none')
        || document.querySelector('textarea');

      const sendBtn = document.querySelector('.enter.is-main-chat')
        || document.querySelector('.enter-icon-container');
      if (sendBtn && typeof sendBtn.click === 'function') {
        try { sendBtn.click(); } catch {}
      }

      if (textarea) {
        try { textarea.focus(); } catch {}
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

        const form = (textarea.closest && textarea.closest('form')) || textarea.form;
        if (form) {
          try { if (typeof form.requestSubmit === 'function') form.requestSubmit(); } catch {}
          try { form.dispatchEvent && form.dispatchEvent(new Event('submit', { bubbles: true })); } catch {}
        }
      }
    } catch (_) {}
  })();`;
}
