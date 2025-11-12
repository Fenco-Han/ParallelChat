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
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        const path = svg.querySelector('path');
        if (path && path.getAttribute('d')?.startsWith('M0 3C0 1.34315')) {
          // 检查父 div 是否实际可见 (考虑 hidden / display)
          const parentDiv = svg.closest('div');
          if (parentDiv && window.getComputedStyle(parentDiv).display !== 'none') {
            return true;
          }
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  })();`;
}

export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      // 根据新的HTML结构，检查上传状态
      // 检查文件上传输入元素
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        return true;
      }

      // 检查发送按钮是否处于禁用状态（可能是由于文件上传）
      const sendBtn = document.querySelector('#input-send-icon');
      if (sendBtn) {
        const isDisabled = sendBtn.querySelector('.cursor-not-allowed');
        return !!isDisabled;
      }

      // 检查是否有上传中的指示器
      const uploadIndicators = document.querySelectorAll('[class*="upload"], [class*="uploading"]');
      return uploadIndicators && uploadIndicators.length > 0;
    } catch (_) {
      return false;
    }
  })();`;
}
