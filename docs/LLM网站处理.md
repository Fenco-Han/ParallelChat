# LLM网站处理

## Gemini
1. **网址**：https://gemini.google.com/app
2. **发送消息**：
   ```javascript
   (() => {
     const el = document.querySelector('.ql-editor');
     if (!el) return console.warn('未找到 .ql-editor 元素');
     el.focus();
     document.execCommand('insertText', false, 'xxxxx');
     el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
   })();
   ```
3. 发送消息状态
```
/**
 * 检测页面上是否存在表示“停止状态”的图标。
 * @returns {boolean} - 如果存在则返回 true，否则返回 false。
 */
function detectStopState() {
    // 使用 .stop-icon class 选择器来查找元素
    const stopElement = document.querySelector('.stop-icon');

    if (stopElement) {
        // 如果找到了元素 (stopElement 不为 null)
        console.log('检测到停止状态图标。');
        // (可选) 像您的例子一样，给它一个视觉标记，方便调试
        stopElement.style.outline = '3px solid red';
        return true;
    } else {
        // 如果没有找到元素
        console.log('未找到停止状态图标。');
        return false;
    }
}

// 调用函数来执行检测
detectStopState();
```

## Qwen
1. **网址**：https://chat.qwen.ai/
2. **发送消息**：
   ```javascript
   (() => {
     const t = document.querySelector('textarea#chat-input');
     if (!t) return console.warn('未找到输入框');
     t.value = 'xxxxx';
     t.dispatchEvent(new Event('input', { bubbles: true }));
     t.form?.requestSubmit?.() || t.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
   })();
   ```
3. **判断聊天响应是否结束**：
   ```javascript
  function checkStopIcon() {
    // 使用类选择器查找具有 icon-StopIcon 的 <i> 元素
    const stopIcons = document.querySelectorAll('i.iconfont.icon-StopIcon');
    
    stopIcons.forEach(icon => {
        console.log('找到停止图标');
        // 例如：高亮它（加边框）
        icon.style.outline = '2px solid red';
        // 或者高亮其父容器
        // icon.parentElement.style.outline = '2px solid red';
    });
}

// 运行检查
checkStopIcon();
   ```

## DeepSeek
1. **网址**：https://chat.deepseek.cn/
2. **发送消息**：
   ```javascript
   (() => {
     const t = document.querySelector('textarea._27c9245');
     if (!t) return console.error('未找到输入框');
     const msg = 'xxxxx';
     Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, msg);
     t.dispatchEvent(new Event('input', { bubbles: true }));
     setTimeout(() => {
       t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
       const sendBtn = Array.from(document.querySelectorAll('button')).find(
         btn => !btn.classList.contains('ds-toggle-button') && btn.querySelector('svg') && !btn.innerText.trim()
       );
       sendBtn?.click();
     }, 100);
   })();
   ```
3. 判断聊天响应是否结束
```javascript
function checkSpecificRectangle() {
    // 获取你提供的第一个SVG的路径数据
    const rectanglePath = "M2 4.88006C2 3.68015 2 3.08019 2.30557 2.6596C2.40426 2.52377 2.52371 2.40432 2.65954 2.30563C3.08013 2.00006 3.68009 2.00006 4.88 2.00006H11.12C12.3199 2.00006 12.9199 2.00006 13.3405 2.30563C13.4763 2.40432 13.5957 2.52377 13.6944 2.6596C14 3.08019 14 3.68015 14 4.88006V11.1201C14 12.32 14 12.9199 13.6944 13.3405C13.5957 13.4763 13.4763 13.5958 13.3405 13.6945C12.9199 14.0001 12.3199 14.0001 11.12 14.0001H4.88C3.68009 14.0001 3.08013 14.0001 2.65954 13.6945C2.52371 13.5958 2.40426 13.4763 2.30557 13.3405C2 12.9199 2 12.32 2 11.1201V4.88006Z";
    
    // 检查页面中所有SVG路径是否匹配这个矩形
    const allPaths = document.querySelectorAll('path');
    allPaths.forEach(path => {
        const currentPath = path.getAttribute('d');
        if (currentPath === rectanglePath) {
            console.log('找到目标矩形SVG');
            path.parentElement.parentElement.style.outline = '2px solid blue';
        }
    });
}

// 运行检查
checkSpecificRectangle();
```



## kimi
1. **网址**：https://www.kimi.com/
2. **发送消息**：
   ```javascript
(() => {
  const editor = document.querySelector('div.chat-input-editor[contenteditable="true"]');
  if (!editor) return console.warn('未找到输入框');

  /* ---------- 1. 把内容写进去（框架能感知） ---------- */
  editor.focus();
  // 清空旧内容
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);

  // 分段插入，防止被截断
  const text = 'xxxx';
  document.execCommand('insertText', false, text);

  // 再补一个 input 事件，确保框架更新状态
  editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

  /* ---------- 2. 触发发送（走键盘回车） ---------- */
  // 部分站点监听的是 keydown + Enter
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  });
  editor.dispatchEvent(enterEvent);

  /* ---------- 3. 如果回车没生效，再点按钮兜底 ---------- */
  setTimeout(() => {
    const sendBtn =
      document.querySelector('.send-button-container:not(.disabled) .send-button') ||
      document.querySelector('.send-button');   // 降级
    sendBtn?.click();
  }, 80);
})();
   ```
3. 聊天回复结束
```
function checkSpecificRectangle() {
    // 获取你提供的第一个SVG的路径数据
    const rectanglePath = "M331.946667 379.904c-11.946667 23.466667-11.946667 54.186667-11.946667 115.626667v32.938666c0 61.44 0 92.16 11.946667 115.626667 10.538667 20.650667 27.306667 37.418667 47.957333 47.957333 23.466667 11.946667 54.186667 11.946667 115.626667 11.946667h32.938666c61.44 0 92.16 0 115.626667-11.946667 20.650667-10.538667 37.418667-27.306667 47.957333-47.957333 11.946667-23.466667 11.946667-54.186667 11.946667-115.626667v-32.938666c0-61.44 0-92.16-11.946667-115.626667a109.696 109.696 0 0 0-47.957333-47.957333c-23.466667-11.946667-54.186667-11.946667-115.626667-11.946667h-32.938666c-61.44 0-92.16 0-115.626667 11.946667-20.650667 10.538667-37.418667 27.306667-47.957333 47.957333z";
    
    // 检查页面中所有SVG路径是否匹配这个矩形
    const allPaths = document.querySelectorAll('path');
    allPaths.forEach(path => {
        const currentPath = path.getAttribute('d');
        if (currentPath === rectanglePath) {
            console.log('找到目标矩形SVG');
            path.parentElement.parentElement.style.outline = '2px solid blue';
        }
    });
}

// 运行检查
checkSpecificRectangle();
```

## glm
1. **网址**：https://chatglm.cn/
2. **发送消息**：
   ```javascript
(() => {
  // 1. 找到输入框
  const textarea = document.querySelector('textarea.scroll-display-none');
  if (!textarea) return console.warn('未找到输入框');
  
  // 2. 输入文本
  const msg = 'xxxx';
  
  // 方法1：直接设置value并触发input事件
  textarea.value = msg;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  
  // 方法2：使用execCommand（作为备选）
  textarea.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, msg);
  
  // 3. 触发发送
  setTimeout(() => {
    // 方法1：尝试点击发送按钮
    const sendBtn = document.querySelector('.enter.is-main-chat') || 
                   document.querySelector('.enter-icon-container');
    if (sendBtn) {
      sendBtn.click();
    }
    
    // 方法2：模拟回车键
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    textarea.dispatchEvent(enterEvent);
    
    // 方法3：查找表单并提交
    const form = textarea.closest('form');
    if (form) {
      form.requestSubmit?.() || form.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  }, 100);
})();

   ```
3. 获取回复状态
```
function findImageBySrc() {
    // 使用属性选择器 [attribute*="value"]
    // 查找所有 img 标签，且其 src 属性值包含 "pause_session" 字符串
    const images = document.querySelectorAll('img[src*="pause_session"]');
    
    // 更新控制台日志信息，使其更准确
    console.log(`通过 src 找到 ${images.length} 个图片`);
    
    // 遍历找到的图片，并添加绿色轮廓
    images.forEach(img => img.style.outline = '3px solid green');
}

// 调用函数来执行查找和高亮
findImageBySrc();
```

## chatgpt
1. **网址**：https://chat.openai.com/
2. **发送消息**：
```javascript

(() => {
  const input = document.querySelector('div[contenteditable="true"][id="prompt-textarea"]');
  if (!input) return console.warn('❌ 未找到输入框');

  // 1️⃣ 输入内容
  const text = 'xxxx';
  input.focus();
  // 清空原内容
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);
  // 插入文本（框架能感知）
  document.execCommand('insertText', false, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));

  // 2️⃣ 发送（优先模拟键盘回车）
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  });
  input.dispatchEvent(enterEvent);

  // 3️⃣ 如果回车没生效，尝试点击发送按钮
  setTimeout(() => {
    const sendBtn = document.querySelector('#composer-submit-button');
    if (sendBtn) {
      sendBtn.click();
      console.log('✅ 已点击发送按钮');
    } else {
      console.warn('⚠️ 未找到发送按钮');
    }
  }, 100);
})();
```
3.获取回复状态
```


function checkSpecificRectangle() {
    // 获取你提供的第一个SVG的路径数据
    const rectanglePath = "M4.5 5.75C4.5 5.05964 5.05964 4.5 5.75 4.5H14.25C14.9404 4.5 15.5 5.05964 15.5 5.75V14.25C15.5 14.9404 14.9404 15.5 14.25 15.5H5.75C5.05964 15.5 4.5 14.9404 4.5 14.25V5.75Z";
    
    // 检查页面中所有SVG路径是否匹配这个矩形
    const allPaths = document.querySelectorAll('path');
    allPaths.forEach(path => {
        const currentPath = path.getAttribute('d');
        if (currentPath === rectanglePath) {
            console.log('找到目标矩形SVG');
            path.parentElement.parentElement.style.outline = '2px solid blue';
        }
    });
}

// 运行检查
checkSpecificRectangle();
```

## claude
1. **网址**：https://claude.ai/
2. **发送消息**：
   ```javascript
(() => {
  // 1. 找到 ProseMirror 编辑器
  const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
  if (!editor) return console.warn('未找到输入框');

  // 2. 聚焦编辑器
  editor.focus();

  // 3. 清空旧内容
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('delete', false, null);

  // 4. 插入新内容
  const msg = 'xxxxx';
  document.execCommand('insertText', false, msg);

  // 5. 触发 input 事件，让框架感知内容变化
  editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

  // 6. 等待一小段时间后点击发送按钮
  setTimeout(() => {
    // 找到发送按钮（带有上箭头 SVG 图标的按钮）
    const sendBtn = document.querySelector('button[aria-label="Send message"]');
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      console.warn('发送按钮未找到或已禁用');
      
      // 兜底：尝试 Enter 键
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      }));
    }
  }, 100);
})();
```

3. 获取回复状态
```
function checkSpecificRectangle() {
    // 获取你提供的第一个SVG的路径数据
    const rectanglePath = "M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm40-112v56a12,12,0,0,1-12,12H100a12,12,0,0,1-12-12V100a12,12,0,0,1,12-12h56A12,12,0,0,1,168,100Z";
    
    // 检查页面中所有SVG路径是否匹配这个矩形
    const allPaths = document.querySelectorAll('path');
    allPaths.forEach(path => {
        const currentPath = path.getAttribute('d');
        if (currentPath === rectanglePath) {
            console.log('找到目标矩形SVG');
            path.parentElement.parentElement.style.outline = '2px solid blue';
        }
    });
}

// 运行检查
checkSpecificRectangle();
```

## chatgpt
1. **网址**：https://chat.openai.com/
2. **发送消息**：
```javascript

(() => {
  const input = document.querySelector('div[contenteditable="true"][id="prompt-textarea"]');
  if (!input) return console.warn('❌ 未找到输入框');

  // 1️⃣ 输入内容
  const text = 'xxxx';
  input.focus();
  // 清空原内容
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);
  // 插入文本（框架能感知）
  document.execCommand('insertText', false, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));

  // 2️⃣ 发送（优先模拟键盘回车）
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  });
  input.dispatchEvent(enterEvent);

  // 3️⃣ 如果回车没生效，尝试点击发送按钮
  setTimeout(() => {
    const sendBtn = document.querySelector('#composer-submit-button');
    if (sendBtn) {
      sendBtn.click();
      console.log('✅ 已点击发送按钮');
    } else {
      console.warn('⚠️ 未找到发送按钮');
    }
  }, 100);
})();
```
3.获取回复状态
```


function checkSpecificRectangle() {
    // 获取你提供的第一个SVG的路径数据
    const rectanglePath = "M4.5 5.75C4.5 5.05964 5.05964 4.5 5.75 4.5H14.25C14.9404 4.5 15.5 5.05964 15.5 5.75V14.25C15.5 14.9404 14.9404 15.5 14.25 15.5H5.75C5.05964 15.5 4.5 14.9404 4.5 14.25V5.75Z";
    
    // 检查页面中所有SVG路径是否匹配这个矩形
    const allPaths = document.querySelectorAll('path');
    allPaths.forEach(path => {
        const currentPath = path.getAttribute('d');
        if (currentPath === rectanglePath) {
            console.log('找到目标矩形SVG');
            path.parentElement.parentElement.style.outline = '2px solid blue';
        }
    });
}

// 运行检查
checkSpecificRectangle();
```

## claude
1. **网址**：https://claude.ai/
2. **发送消息**：
   ```javascript
(() => {
  // 1. 找到 ProseMirror 编辑器
  const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
  if (!editor) return console.warn('未找到输入框');

  // 2. 聚焦编辑器
  editor.focus();

  // 3. 清空旧内容
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('delete', false, null);

  // 4. 插入新内容
  const msg = 'xxxxx';
  document.execCommand('insertText', false, msg);

  // 5. 触发 input 事件，让框架感知内容变化
  editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

  // 6. 等待一小段时间后点击发送按钮
  setTimeout(() => {
    // 找到发送按钮（带有上箭头 SVG 图标的按钮）
    const sendBtn = document.querySelector('button[aria-label="Send message"]');
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      console.warn('发送按钮未找到或已禁用');
      
      // 兜底：尝试 Enter 键
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      }));
    }
  }, 100);
})();
```

3. 获取回复状态
```
function checkSpecificRectangle() {
    // 获取你提供的第一个SVG的路径数据
    const rectanglePath = "M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm40-112v56a12,12,0,0,1-12,12H100a12,12,0,0,1-12-12V100a12,12,0,0,1,12-12h56A12,12,0,0,1,168,100Z";
    
    // 检查页面中所有SVG路径是否匹配这个矩形
    const allPaths = document.querySelectorAll('path');
    allPaths.forEach(path => {
        const currentPath = path.getAttribute('d');
        if (currentPath === rectanglePath) {
            console.log('找到目标矩形SVG');
            path.parentElement.parentElement.style.outline = '2px solid blue';
        }
    });
}

// 运行检查
checkSpecificRectangle();
```


## doubao
1. **网址**：https://www.doubao.com/
2. **发送消息**：
   ```javascript
(() => {
  // 1. 定位输入框
  const textarea = document.querySelector('textarea[data-testid="chat_input_input"]');
  if (!textarea) {
    console.error('未找到输入框');
    return;
  }

  // 2. 使用更底层的方法设置值
  const message = 'xxxx';
  
  // 方法1：使用描述符设置值（绕过框架监听）
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
  if (descriptor && descriptor.set) {
    descriptor.set.call(textarea, message);
  } else {
    textarea.value = message;
  }

  // 3. 聚焦并触发完整的事件序列
  textarea.focus();
  
  // 触发多种事件确保框架检测到变化
  const events = [
    'input',
    'change', 
    'keyup',
    'blur',
    'focus'
  ];
  
  events.forEach(eventType => {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);
  });

  // 4. 模拟真实用户输入（使用execCommand）
  try {
    textarea.select();
    document.execCommand('insertText', false, message);
  } catch (e) {
    console.log('execCommand方法失败:', e);
  }

  // 5. 等待UI更新后尝试发送
  setTimeout(() => {
    // 检查发送按钮是否可用
    const sendBtn = document.querySelector('button[data-testid="chat_input_send_button"]');
    
    if (sendBtn && !sendBtn.disabled) {
      console.log('点击发送按钮');
      sendBtn.click();
    } else {
      // 如果按钮不可用，尝试回车发送
      console.log('尝试回车发送');
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
      textarea.dispatchEvent(enterEvent);
      
      // 再次检查按钮状态
      setTimeout(() => {
        const btn = document.querySelector('button[data-testid="chat_input_send_button"]');
        if (btn && !btn.disabled) {
          btn.click();
        }
      }, 50);
    }
  }, 200);

  // 6. 调试信息
  console.log('输入框当前值:', textarea.value);
  console.log('发送按钮状态:', document.querySelector('button[data-testid="chat_input_send_button"]')?.disabled);
})();
```
3. 获取回复状态
```
const el = document.querySelector('[data-testid="chat_input_local_break_button"]');

if (el && !el.classList.contains('!hidden')) {
  console.log('元素存在且可见');
}
```


## yuanbao
1. **网址**：https://yuanbao.tencent.com/
2. **发送消息**：
   ```javascript
(() => {
    // 查找输入框元素
    const editor = document.querySelector('.ql-editor.ql-blank[contenteditable="true"]');
    if (!editor) {
        console.warn('未找到输入框元素');
        return;
    }

    // 聚焦输入框
    editor.focus();
    
    // 清空现有内容（如果有）
    editor.innerHTML = '<p><br></p>';
    
    // 插入文本
    const text = 'xxxx';
    document.execCommand('insertText', false, text);
    
    // 触发输入事件确保框架能感知到内容变化
    editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    
    // 短暂延迟后发送
    setTimeout(() => {
        // 方法1: 尝试通过回车键发送
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        editor.dispatchEvent(enterEvent);
        
        // 方法2: 如果回车无效，尝试点击发送按钮
        setTimeout(() => {
            const sendBtn = document.querySelector('#yuanbao-send-btn:not(.style__send-btn--disabled___CGyAQ)');
            if (sendBtn && !sendBtn.classList.contains('style__send-btn--disabled___CGyAQ')) {
                sendBtn.click();
            } else {
                console.warn('发送按钮不可用或未找到');
            }
        }, 50);
    }, 100);
})();
```
3. 获取回复状态
```
function checkSpecificRectangle() {
    // 定义要查找的矩形属性
    const targetAttributes = {
        x: "7.71448",
        y: "7.71436",
        width: "8.57143",
        height: "8.57143",
        rx: "1.5",
        fill: "currentColor"
    };
    
    // 检查页面中所有SVG矩形元素
    const allRects = document.querySelectorAll('rect');
    allRects.forEach(rect => {
        let isMatch = true;
        
        // 检查每个属性是否匹配
        for (const [attr, value] of Object.entries(targetAttributes)) {
            if (rect.getAttribute(attr) !== value) {
                isMatch = false;
                break;
            }
        }
        
        if (isMatch) {
            console.log('找到目标矩形');
            rect.style.outline = '2px solid blue';
            // 如果需要也可以高亮父元素
            // rect.parentElement.style.outline = '2px solid red';
        }
    });
}

// 运行检查
checkSpecificRectangle();
```
    

## grok
1. **网址**：https://grok.com/
2. **发送消息**：
   ```javascript
// 自动输入并发送消息到 Grok 聊天框

function sendMessageToGrok(message) {
  // 1. 找到输入框
  const textarea = document.querySelector('textarea[aria-label="向 Grok 提任何问题"]');
  if (!textarea) {
    console.error('未找到输入框');
    return false;
  }

  // 2. 写入内容（优先使用属性描述符）
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (setter) setter.call(textarea, message);
  else textarea.value = message;

  // 3. 聚焦并触发完整事件序列（确保框架检测到变化）
  textarea.focus();
  ['input', 'change'].forEach(type => {
    textarea.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  });

  // 4. 优先模拟回车发送
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
    bubbles: true, cancelable: true
  });
  textarea.dispatchEvent(enterEvent);

  // 5. 兜底：点击发送按钮（多选择器策略）
  setTimeout(() => {
    const submitButton =
      document.querySelector('button[type="submit"][aria-label="提交"]') ||
      document.querySelector('button:has(svg path[d*="M4 9.2"])');

    // 兼容不支持 :has 的环境
    let iconButton = null;
    if (!submitButton) {
      const svgPath = document.querySelector('button svg path[d*="M4 9.2"]');
      iconButton = svgPath ? svgPath.closest('button') : null;
    }

    const button = (submitButton || iconButton) as HTMLButtonElement | null;
    if (button && !button.disabled) {
      button.click();
      console.log('消息已发送:', message);
    } else {
      console.warn('未找到可用的发送按钮');
    }
  }, 100);

  return true;
}

// 使用示例
// sendMessageToGrok('你好，这是一条测试消息');

// 如果需要延迟发送（等待页面加载完成）
function sendMessageWithDelay(message, delayMs = 1000) {
  setTimeout(() => {
    sendMessageToGrok(message);
  }, delayMs);
}

// 批量发送多条消息（每条消息之间有间隔）
function sendMultipleMessages(messages, intervalMs = 3000) {
  messages.forEach((message, index) => {
    setTimeout(() => {
      sendMessageToGrok(message);
    }, index * intervalMs);
  });
}

// 使用示例：
// sendMessageWithDelay('你好！', 1000);
// sendMultipleMessages(['第一条消息', '第二条消息', '第三条消息'], 5000);
```
3. 判断回复状态
```
function checkSpecificRectangle() {
    // 获取你提供的第一个SVG的路径数据
    const rectanglePath = "M4 9.2v5.6c0 1.116 0 1.673.11 2.134a4 4 0 0 0 2.956 2.956c.46.11 1.018.11 2.134.11h5.6c1.116 0 1.673 0 2.134-.11a4 4 0 0 0 2.956-2.956c.11-.46.11-1.018.11-2.134V9.2c0-1.116 0-1.673-.11-2.134a4 4 0 0 0-2.956-2.955C16.474 4 15.916 4 14.8 4H9.2c-1.116 0-1.673 0-2.134.11a4 4 0 0 0-2.955 2.956C4 7.526 4 8.084 4 9.2Z";
    
    // 检查页面中所有SVG路径是否匹配这个矩形
    const allPaths = document.querySelectorAll('path');
    allPaths.forEach(path => {
        const currentPath = path.getAttribute('d');
        if (currentPath === rectanglePath) {
            console.log('找到目标矩形SVG');
            path.parentElement.parentElement.style.outline = '2px solid blue';
        }
    });
}

// 运行检查
checkSpecificRectangle();
```


