export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    // 1. 查找输入框
    const input = document.querySelector('#prompt-textarea');
    if (!input) return console.warn('❌ 未找到输入框');

    // 2. 设置要发送的固定文本
    const text = ${msg};

    // 3. 填充内容
    try { input.focus(); } catch {}
    try {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, text);
    } catch {}
    // 触发 input 事件，通知框架内容已更改
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch {}

    // 4. 【关键改动】等待 100 毫秒
    //    给框架足够的时间来处理 input 事件并更新内部状态
    setTimeout(() => {
      // 5. 在状态更新后，再模拟按下回车键
      try {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        });
        input.dispatchEvent(enterEvent);
      } catch (e) {
        console.error('模拟回车失败:', e);
      }
    }, 100); // 100 毫秒的延迟
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const btn = document.querySelector('[data-testid="stop-button"]');
      if (!btn) return false;
      const disabled = btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true';
      const style = window.getComputedStyle(btn);
      const hidden = style.display === 'none' || style.visibility === 'hidden' || (btn instanceof HTMLElement && btn.offsetParent === null);
      return !disabled && !hidden;
    } catch (_) {
      return false;
    }
  })();`;
}



// 新增：上传忙碌检测脚本（ChatGPT）
export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      // 发送按钮处于禁用，或存在加载标记，则视为上传/准备中
      const disabledButton = document.querySelector('#composer-submit-button[disabled]');
      if (disabledButton) return true;
      const ariaDisabled = document.querySelector('#composer-submit-button[aria-disabled="true"]');
      if (ariaDisabled) return true;
      const spinner = document.querySelector('[data-testid="loading-spinner"]')
        || document.querySelector('svg[aria-busy="true"]')
        || document.querySelector('[role="progressbar"]');
      return !!spinner;
    } catch (_) {
      return false;
    }
  })();`;
}
