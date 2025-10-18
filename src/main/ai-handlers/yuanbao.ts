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
      const targetAttributes = {
        x: "7.71448",
        y: "7.71436",
        width: "8.57143",
        height: "8.57143",
        rx: "1.5",
        fill: "currentColor",
      };
      const rects = document.querySelectorAll('rect');
      for (const rect of Array.from(rects)) {
        let isMatch = true;
        for (const key in targetAttributes) {
          if ((rect as any).getAttribute && rect.getAttribute(key) !== (targetAttributes as any)[key]) {
            isMatch = false; break;
          }
        }
        if (isMatch) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  })();`;
}
