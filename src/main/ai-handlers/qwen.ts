export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const t = document.querySelector('textarea#chat-input');
    if (!t) return console.warn('未找到输入框');

    const msg = ${msg};

    // 使用更底层的方法设置值，确保框架能检测到变化
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (descriptor && typeof descriptor.set === 'function') {
      descriptor.set.call(t, msg);
    } else {
      t.value = msg;
    }

    // 触发完整的事件序列确保框架检测到变化
    const events = ['input', 'change', 'keyup', 'blur', 'focus'];
    events.forEach(eventType => {
      t.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
    });

    // 避免使用表单提交，改用点击发送按钮或模拟回车键
    setTimeout(() => {
      // 首先尝试查找发送按钮
      const sendBtn = document.querySelector('button[type="submit"]') ||
                     document.querySelector('button[aria-label*="发送" i]') ||
                     document.querySelector('button[title*="发送" i]') ||
                     document.querySelector('button:has(svg)');

      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      } else {
        // 如果找不到发送按钮，模拟回车键
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false
        });
        t.dispatchEvent(enterEvent);
      }
    }, 100);
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const stopIcon = document.querySelector('i.iconfont.icon-StopIcon');
      return !!stopIcon;
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

      const voiceBtn = document.querySelector('#open-omni-button');
      return isVisible(voiceBtn);
    } catch (_) {
      return false;
    }
  })();`;
}
