export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    var t = document.querySelector('textarea._27c9245')
      || document.querySelector('textarea')
      || document.querySelector('div[role="textbox"]')
      || document.querySelector('[contenteditable="true"]');
    if (!t) return console.error('未找到输入框');

    var text = ${msg};

    if (t.tagName && t.tagName.toLowerCase() === 'textarea') {
      try {
        var desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (desc && typeof desc.set === 'function') desc.set.call(t, text); else t.value = text;
      } catch (_) {
        t.value = text;
      }
      try { t.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
    } else {
      try { t.focus && t.focus(); } catch {}
      try {
        var sel = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(t);
        sel && sel.removeAllRanges();
        sel && sel.addRange(range);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
      } catch (_) {
        if ('innerText' in t) t.innerText = text; else t.textContent = text;
      }
      try { t.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
    }

    setTimeout(function() {
      try {
        t.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        }));
      } catch (e) {
        console.error('模拟回车失败:', e);
      }
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      // 优先靠 aria-label，其次靠 ds-icon-button role=button
      let btn = document.querySelector('[aria-label="Stop response"]')
        || document.querySelector('[aria-label*="Stop" i]')
        || document.querySelector('.ds-icon-button[role="button"][aria-disabled]');

      // 若找到输入框，则在同容器中进一步限定查找范围
      const root = document.querySelector('textarea._27c9245')
        || document.querySelector('textarea')
        || document.querySelector('div[role="textbox"]')
        || document.querySelector('[contenteditable="true"]');
      const container = (root && (root.closest && root.closest('form'))) || (root && root.parentElement);
      if (!btn && container) {
        btn = container.querySelector('.ds-icon-button[role="button"][aria-disabled]');
      }

      if (!btn) return false;
      const disabled = btn.getAttribute('aria-disabled') === 'true' || btn.hasAttribute('disabled');
      const style = window.getComputedStyle(btn as Element);
      const hidden = style.display === 'none' || style.visibility === 'hidden' || ((btn as HTMLElement).offsetParent === null);
      return !disabled && !hidden;
    } catch (_) {
      return false;
    }
  })();`;
}

export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      // 简单：存在被禁用的 ds 图标按钮即视为上传/准备中
      const btn = document.querySelector('.ds-icon-button[role="button"][aria-disabled="true"]');
      return !!btn;
    } catch (_) {
      return false;
    }
  })();`;
}
