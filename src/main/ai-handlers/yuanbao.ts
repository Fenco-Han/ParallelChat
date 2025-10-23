export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const editor = document.querySelector('.ql-editor.ql-blank[contenteditable="true"]')
      || document.querySelector('[contenteditable="true"]');
    if (!editor) { console.warn('未找到输入框元素'); return; }

    try { if (typeof editor.focus === 'function') editor.focus(); } catch {}
    try { editor.innerHTML = '<p><br></p>'; } catch {}

    const text = ${msg};
    try { document.execCommand('insertText', false, text); } catch {}
    try {
      editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    } catch {}

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
        editor.dispatchEvent(enterEvent);
      } catch {}

      setTimeout(() => {
        const sendBtn = document.querySelector('#yuanbao-send-btn:not(.style__send-btn--disabled___CGyAQ)');
        const disabledClass = 'style__send-btn--disabled___CGyAQ';
        const ok = sendBtn && !(sendBtn.classList && sendBtn.classList.contains(disabledClass));
        if (ok && typeof sendBtn.click === 'function') {
          try { sendBtn.click(); } catch {}
        } else {
          console.warn('发送按钮不可用或未找到');
        }
      }, 50);
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
  try {
    const element = document.querySelector('g > rect[rx="1.5"]');
    if (!element) return false;
    return true;
  } catch (_) {
    return false;
  }
})();`;
}

export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      const btn = document.querySelector('#yuanbao-send-btn');
      if (!btn) return false;
      const s = window.getComputedStyle(btn);
      const hidden = s.display === 'none' || s.visibility === 'hidden';
      const visible = !hidden && (btn instanceof HTMLElement ? btn.offsetParent !== null : true);
      const disabled = btn.classList && btn.classList.contains('style__send-btn--disabled___CGyAQ');
      return visible && disabled;
    } catch (_) {
      return false;
    }
  })();`;
}
