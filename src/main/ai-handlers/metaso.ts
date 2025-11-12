export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    // 1. 查找输入框
    const input = document.querySelector('textarea.search-consult-textarea');
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
      // 使用 aria-label 作为选择器，匹配“停止生成”按钮
      const btn = document.querySelector('button[aria-label="停止生成"]');
      if (!btn) return false;

      // 检查按钮是否被禁用
      const disabled = btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true';

      // 检查按钮是否被隐藏
      const style = window.getComputedStyle(btn);
      const hidden = style.display === 'none' || style.visibility === 'hidden' || (btn instanceof HTMLElement && btn.offsetParent === null);

      // 返回按钮是否“可用且可见”
      return !disabled && !hidden;
    } catch (_) {
      return false;
    }
  })();`;
}

// 新增：上传忙碌检测脚本
export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      // 1. 优先检查发送按钮（通过类名）是否处于禁用状态
      const sendButton = document.querySelector('button.send-arrow-button');
      if (sendButton) {
        // 检查 disabled 属性 或 Mui-disabled 类（Material UI 会同时加类和属性）
        const isDisabled = sendButton.hasAttribute('disabled') || sendButton.classList.contains('Mui-disabled');
        if (isDisabled) {
          return true; // 表示“正在上传中”或“尚未准备好提交”
        }
      }

      // 2. 备用：检查是否存在加载指示器
      const spinner = document.querySelector('[data-testid="loading-spinner"]')
        || document.querySelector('svg[aria-busy="true"]')
        || document.querySelector('[role="progressbar"]')
        || document.querySelector('.MuiCircularProgress-root'); // 常见 MUI 加载组件

      return !!spinner;
    } catch (_) {
      return false;
    }
  })();`;
}
