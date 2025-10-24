export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    // 1. 查找输入框 (使用你原来的选择器)
    const editor = document.querySelector('.ProseMirror[contenteditable="true"]')
      || document.querySelector('[contenteditable="true"]');
    if (!editor) return console.warn('未找到输入框');

    // 2. 设置要发送的固定文本
    const text = ${msg};

    // 3. 填充内容
    try { editor.focus(); } catch {}
    try {
      // 简化清空逻辑：全选 -> 删除
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      // 插入新文本
      document.execCommand('insertText', false, text);
    } catch (e) {
      console.error('填充内容失败:', e);
    }
    // 触发 input 事件，通知框架内容已更改
    try { editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch {}

    // 4. 等待 100 毫秒
    setTimeout(() => {
      // 5. 模拟按下回车键 (去掉按钮点击的逻辑)
      try {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        });
        editor.dispatchEvent(enterEvent);
      } catch (e) {
        console.error('模拟回车失败:', e);
      }
    }, 100); // 100 毫秒的延迟
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    try {
      const btn = document.querySelector('button[aria-label="Stop response"]')
        || document.querySelector('button[aria-label*="Stop" i]');
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

export function buildUploadCheckScript(): string {
  return `(() => {
    try {
      const btn = document.querySelector('button[aria-label="Send message"]')
        || document.querySelector('button[aria-label*="Send" i]');
      if (!btn) return false;

      const container = (btn.closest && btn.closest('div[data-state]')) as HTMLElement | null;
      const state = container?.getAttribute('data-state');
      const disabled = btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true';

      const style = window.getComputedStyle(btn);
      const hidden = style.display === 'none' || style.visibility === 'hidden' || (btn instanceof HTMLElement && btn.offsetParent === null);

      // data-state="closed" + 发送按钮禁用，视为上传/准备中
      return state === 'closed' && disabled && !hidden;
    } catch (_) {
      return false;
    }
  })();`;
}
