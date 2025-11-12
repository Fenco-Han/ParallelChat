export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    // 使用ID查找聊天输入框
    const textarea = document.getElementById('chat-input');
    if (!textarea) return console.warn('未找到输入框');

    const msg = ${msg};

    // 设置输入框的值
    try {
      textarea.value = msg;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {
      console.error('设置输入框值失败:', e);
    }

    // 确保输入框获得焦点
    try {
      textarea.focus();
    } catch (e) {
      console.error('聚焦输入框失败:', e);
    }

    // 短暂延迟后尝试发送消息
    setTimeout(() => {
      // 尝试点击发送按钮
      const sendBtn = document.getElementById('send-message-button');
      if (sendBtn && typeof sendBtn.click === 'function' && !sendBtn.disabled) {
        sendBtn.click();
        return;
      }

      // 如果按钮点击失败，尝试提交表单
      const form = (textarea.closest && textarea.closest('form')) || textarea.form;
      if (form) {
        try {
          if (typeof form.requestSubmit === 'function') form.requestSubmit();
        } catch (e) {
          console.error('表单提交失败:', e);
        }

        try {
          form.dispatchEvent && form.dispatchEvent(new Event('submit', { bubbles: true }));
        } catch (e) {
          console.error('触发提交事件失败:', e);
        }
      }

      // 最后尝试模拟回车键
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
      } catch (e) {
        console.error('模拟回车键失败:', e);
      }
    }, 100);
  })();`;
}


export function buildStatusScript(): string {
  return `(() => {
    try {
      // 组合选择器：找到一个带 aria-label 属性的元素，然后深入查找其内部的停止图标
      // 这样即使 aria-label 的文字变化，只要属性存在，就能定位到
      const stopIcon = document.querySelectorAll('div[aria-label] span.size-3.rounded-xs.bg-white.dark\\:bg-black');
      return stopIcon && stopIcon.length > 0;
    } catch (_) {
      return false;
    }
  })();`;
}

export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      // 1. 通过ID找到发送按钮
      const button = document.querySelector('#send-message-button');

      // 2. 检查按钮是否存在，并且其 'disabled' 属性被设置为 true
      //    button.hasAttribute('disabled') 也能工作，但 button.disabled 更直接
      return !!(button && button.disabled);
    } catch (_) {
      // 如果在执行过程中发生任何错误（例如，document.querySelector不可用），则返回false
      return false;
    }
  })();`;
}
