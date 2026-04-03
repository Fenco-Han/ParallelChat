export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    var t = document.querySelector('textarea')
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
        // MiMo 发送按钮：button.rounded-full.bg-black/90 或包含特定 SVG
        var btn = document.querySelector('button.rounded-full.bg-black\\\\/90')
          || document.querySelector('button.rounded-full.dark\\\\:bg-white\\\\/90')
          || document.querySelector('button:has(svg[viewBox="0 0 19 16"])');
        
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          t.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          }));
        }
      } catch (e) {
        console.error('模拟发送失败:', e);
      }
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      // MiMo 停止按钮通常包含 square (rect)
      let btn = document.querySelector('button:has(svg rect)')
        || document.querySelector('button:has(svg path[d*="M5 5h6v6H5z"])');

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
      // 忙碌状态：发送按钮禁用或存在正在输入的指示器
      const btn = document.querySelector('button.rounded-full[disabled]');
      const typing = document.querySelector('.mimo-cursor-blinking');
      return !!(btn || typing);
    } catch (_) {
      return false;
    }
  })();`;
}
