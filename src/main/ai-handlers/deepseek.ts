export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    var t = document.querySelector('textarea._27c9245')
      || document.querySelector('textarea')
      || document.querySelector('div[role="textbox"]')
      || document.querySelector('[contenteditable="true"]');
    if (!t) return console.error('未找到输入框');
    var msg = ${msg};
    if (t.tagName && t.tagName.toLowerCase() === 'textarea') {
      try {
        var desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (desc && typeof desc.set === 'function') desc.set.call(t, msg); else t.value = msg;
      } catch (_) {
        t.value = msg;
      }
      t.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      if (t && typeof t.focus === 'function') t.focus();
      try {
        var sel = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(t);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('insertText', false, msg);
      } catch (_) {
        if ('innerText' in t) t.innerText = msg; else t.textContent = msg;
      }
    }
    setTimeout(function() {
      t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      var sendBtn = Array.prototype.slice.call(document.querySelectorAll('button')).find(function(btn) {
        var hasIcon = !!btn.querySelector('svg');
        var noText = !btn.innerText || !btn.innerText.trim();
        var notToggle = !btn.classList.contains('ds-toggle-button');
        return notToggle && hasIcon && noText;
      });
      if (sendBtn && typeof sendBtn.click === 'function') sendBtn.click();
      var form = t.form || (t.closest && t.closest('form'));
      if (form) {
        if (typeof form.requestSubmit === 'function') { form.requestSubmit(); }
        else { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
      }
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const rectanglePath = "M2 4.88006C2 3.68015 2 3.08019 2.30557 2.6596C2.40426 2.52377 2.52371 2.40432 2.65954 2.30563C3.08013 2.00006 3.68009 2.00006 4.88 2.00006H11.12C12.3199 2.00006 12.9199 2.00006 13.3405 2.30563C13.4763 2.40432 13.5957 2.52377 13.6944 2.6596C14 3.08019 14 3.68015 14 4.88006V11.1201C14 12.32 14 12.9199 13.6944 13.3405C13.5957 13.4763 13.4763 13.5958 13.3405 13.6945C12.9199 14.0001 12.3199 14.0001 11.12 14.0001H4.88C3.68009 14.0001 3.08013 14.0001 2.65954 13.6945C2.52371 13.5958 2.40426 13.4763 2.30557 13.3405C2 12.9199 2 12.32 2 11.1201V4.88006Z";
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
