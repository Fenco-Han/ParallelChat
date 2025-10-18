export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const editor = document.querySelector('.ProseMirror[contenteditable="true"]')
      || document.querySelector('[contenteditable="true"]');
    if (!editor) return console.warn('未找到输入框');

    try { if (typeof editor.focus === 'function') editor.focus(); } catch {}

    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('delete', false, null);
    } catch {}

    const msg = ${msg};
    try { document.execCommand('insertText', false, msg); } catch {}
    try { editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch {}

    setTimeout(() => {
      const sendBtn = document.querySelector('button[aria-label="Send message"]')
        || document.querySelector('button[aria-label*="Send" i]');
      if (sendBtn && typeof sendBtn.click === 'function') {
        sendBtn.click();
      } else {
        try {
          editor.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          }));
        } catch {}
      }
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const rectanglePath = "M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm40-112v56a12,12,0,0,1-12,12H100a12,12,0,0,1-12-12V100a12,12,0,0,1,12-12h56A12,12,0,0,1,168,100Z";
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
