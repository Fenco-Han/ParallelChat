export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const editor = document.querySelector('div.chat-input-editor[contenteditable="true"]')
      || document.querySelector('[contenteditable="true"][aria-label*="输入" i]')
      || document.querySelector('[contenteditable="true"]');
    if (!editor) return console.warn('未找到输入框');

    const text = ${msg};
    try { if (editor && typeof editor.focus === 'function') editor.focus(); } catch {}
    try {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, text);
    } catch {}
    try { editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch {}

    try {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      editor.dispatchEvent(enterEvent);
    } catch {}

    setTimeout(() => {
      const sendBtn = document.querySelector('.send-button-container:not(.disabled) .send-button')
        || document.querySelector('.send-button')
        || document.querySelector('button[aria-label*="发送" i]');
      try { if (sendBtn && typeof sendBtn.click === 'function') sendBtn.click(); } catch {}
    }, 80);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const rectanglePath = "M331.946667 379.904c-11.946667 23.466667-11.946667 54.186667-11.946667 115.626667v32.938666c0 61.44 0 92.16 11.946667 115.626667 10.538667 20.650667 27.306667 37.418667 47.957333 47.957333 23.466667 11.946667 54.186667 11.946667 115.626667 11.946667h32.938666c61.44 0 92.16 0 115.626667-11.946667 20.650667-10.538667 37.418667-27.306667 47.957333-47.957333 11.946667-23.466667 11.946667-54.186667 11.946667-115.626667v-32.938666c0-61.44 0-92.16-11.946667-115.626667a109.696 109.696 0 0 0-47.957333-47.957333c-23.466667-11.946667-54.186667-11.946667-115.626667-11.946667h-32.938666c-61.44 0-92.16 0-115.626667 11.946667-20.650667 10.538667-37.418667 27.306667-47.957333 47.957333z";
      const allPaths = document.querySelectorAll('path');
      for (const path of Array.from(allPaths)) {
        if (path.getAttribute('d') === rectanglePath) {
          return true;
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  })();`;
}

export function buildSendOnlyScript(): string {
  return `(() => {
    const btn =
      document.querySelector('.send-button-container:not(.disabled) .send-button')
      || document.querySelector('.send-button')
      || document.querySelector('button[aria-label*="发送" i]');
    if (btn && typeof (btn as any).click === 'function') {
      (btn as any).click();
      return true;
    }

    const editor =
      document.querySelector('div.chat-input-editor[contenteditable="true"]')
      || document.querySelector('[contenteditable="true"][aria-label*="输入" i]')
      || document.querySelector('[contenteditable="true"]')
      || document.querySelector('div[role="textbox"]');

    if (editor) {
      try {
        editor.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        }));
        return true;
      } catch {}
    }

    const form = (editor as any)?.closest?.('form') || document.querySelector('form');
    if (form && typeof (form as any).requestSubmit === 'function') {
      (form as any).requestSubmit();
      return true;
    }

    return false;
  })();`;
}
