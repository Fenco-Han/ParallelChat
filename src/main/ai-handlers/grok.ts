export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    function sendMessageToGrok(message) {
      // 1. 找到 textarea 输入框
      const textarea = document.querySelector('textarea[aria-label="向 Grok 提任何问题"]');
      if (!textarea) {
        console.error('未找到输入框');
        return false;
      }

      // 2. 先聚焦输入框
      try { textarea.focus(); } catch (_) {}

      // 3. 清空原有内容
      try { textarea.value = ''; } catch (_) {}

      // 4. 使用更接近真实输入的方式设置值
      try {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
        const setter = desc && desc.set;
        if (setter) setter.call(textarea, message);
        else textarea.value = message;
      } catch (_) {
        try { textarea.value = message; } catch (_) {}
      }

      // 5. 触发多个事件以确保 React 检测到变化
      try {
        const events = [
          new Event('input', { bubbles: true, cancelable: true }),
          new Event('change', { bubbles: true, cancelable: true }),
          new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
          new KeyboardEvent('keyup', { bubbles: true, cancelable: true })
        ];
        events.forEach(ev => { try { textarea.dispatchEvent(ev); } catch (_) {} });
      } catch (_) {}

      // 6. 等待一小段时间让 UI 更新
      setTimeout(() => {
        // 7. 找到提交按钮
        const submitButton = document.querySelector('button[type="submit"][aria-label="提交"]');
        if (!submitButton) {
          console.error('未找到提交按钮');
          return false;
        }
        // 8. 点击提交按钮
        try { submitButton.click(); } catch (_) {}
        try { console.log('消息已发送:', message); } catch (_) {}
      }, 100);

      return true;
    }

    return sendMessageToGrok(${msg});
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      // Prefer specific SVG path if present (stop/rectangle icon)
      const rectanglePath = "M4 9.2v5.6c0 1.116 0 1.673.11 2.134a4 4 0 0 0 2.956 2.956c.46.11 1.018.11 2.134.11h5.6c1.116 0 1.673 0 2.134-.11a4 4 0 0 0 2.956-2.956c.11-.46.11-1.018.11-2.134V9.2c0-1.116 0-1.673-.11-2.134a4 4 0 0 0-2.956-2.955C16.474 4 15.916 4 14.8 4H9.2c-1.116 0-1.673 0-2.134.11a4 4 0 0 0-2.955 2.956C4 7.526 4 8.084 4 9.2Z";
      const paths = document.querySelectorAll('path');
      for (const p of Array.from(paths)) {
        if (p.getAttribute('d') === rectanglePath) return true;
      }
      // Fallback: presence of a visible stop/cancel button generally means generating
      const stopBtn = document.querySelector('button[aria-label*="Stop" i]')
        || document.querySelector('button[aria-label*="停止" i]')
        || document.querySelector('button[aria-label*="取消" i]');
      if (stopBtn) {
        const style = window.getComputedStyle(stopBtn as Element);
        const isHidden = style.display === 'none' || style.visibility === 'hidden';
        const disabled = (stopBtn as HTMLButtonElement).disabled || (stopBtn as HTMLElement).getAttribute('disabled') !== null;
        if (!isHidden && !disabled) return true;
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
      const isVisible = (el) => {
        if (!el) return false;
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        return !(el instanceof HTMLElement) || el.offsetParent !== null;
      };

      const voiceBtn = document.querySelector('button[aria-label="进入语音模式"]');
      const disabledSendBtn = document.querySelector('button[type="submit"][aria-label="提交"][disabled], button[type="submit"][aria-label="提交"][aria-disabled="true"]');

      return isVisible(voiceBtn) || isVisible(disabledSendBtn);
    } catch (_) {
      return false;
    }
  })();`;
}