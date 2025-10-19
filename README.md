# ParallelChat

一次提问，多端响应，在一个窗口并行对比多个主流 AI 的回答。

## 简介
ParallelChat 是一个基于 Electron + React + TypeScript 的桌面应用，支持在同一工作区并行使用多个 AI（Gemini、DeepSeek、Kimi、ChatGPT、Qwen、Claude、豆包、元宝、GLM 等）。它提供广播输入、网格/标签布局切换、会话管理、缓存隔离与清理、国际化，以及安全的 IPC 能力。

## 主要特性
- 并行对比多个 AI 回复：支持网格/瀑布与标签页布局切换
- 全局输入栏广播：选择目标视图，一键发送；`Cmd+Enter` 快捷键
- 会话侧边栏：新建/重命名/删除；切换自动恢复各 AI 页面的状态
- 独立会话分区与缓存隔离：支持一键清除所有缓存与登录信息
- 状态轮询与发送反馈：展示发送中、成功、失败的状态
- 多语言：英文/中文（`i18next` + `react-i18next`）
- 安全：`contextIsolation`、白名单 IPC、外部链接自动在系统浏览器打开
- 自动更新：集成 `electron-updater`

## 环境要求
- `Node >= 14.x`
- `npm >= 7.x`

## 安装与启动
```bash
npm install
npm start
```
- 开发模式会启动渲染进程与主进程并打开应用窗口

## 构建与发布
```bash
# 本地打包（根据当前平台生成安装包）
npm run package

# 原生模块重建（如依赖了 native 模块）
npm run rebuild

# 代码质量与测试
npm run lint
npm run test
```
- 打包目标：
  - `macOS`: `dmg` / `zip`（`arm64`、`x64`）
  - `Windows`: `nsis`
  - `Linux`: `AppImage`
- `electron-builder` 配置位于 `package.json` 的 `build` 字段，图标与权限清单在 `assets/`

## 使用指南
- 添加 AI：在工作区右上角点击 `+`（添加 AI 对话框），或在设置页进行管理
- 广播提问：在底部全局输入框输入内容，选择要接收广播的 AI，点击发送或按 `Cmd+Enter`
- 布局切换：工作区右上角布局按钮在 网格/瀑布 与 标签页 间切换
- 会话管理：首次发送后自动生成会话；侧边栏支持重命名与删除，并在切换时恢复各 AI 对话页
- 清除缓存：设置页支持清除单个或全部 AI 的缓存与登录信息

## 扩展新的 AI（脚本注入）
要支持新的站点，请在主进程的 `ai-handlers` 中新增一个脚本模块，并在索引中注册：

```ts
// src/main/ai-handlers/yourai.ts
export function buildScript(text: string): string {
  const msg = JSON.stringify(text ?? '');
  return `(() => {
    const t = document.querySelector('textarea')
      || document.querySelector('div[role="textbox"]')
      || document.querySelector('[contenteditable="true"]');
    if (!t) return console.error('未找到输入框');
    // 写入文本并触发发送（根据站点 DOM 调整）
  })();`;
}

export function buildStatusScript(): string {
  return `(() => {
    // 返回 true 表示正在回复；否则返回 false
    // 通过选择器或页面状态判断
    return false;
  })();`;
}
```

```ts
// src/main/ai-handlers/index.ts
import { buildScript as buildYourAI, buildStatusScript as statusYourAI } from './yourai';

const handlers = { /* 其他已注册 */ yourai: buildYourAI };
const statusHandlers = { /* 其他已注册 */ yourai: statusYourAI };
```

然后在设置页或初始化数据中新增 Provider（`id/name/url/handler`），即可在工作区中添加与使用。

> 提示：不同站点的输入框与发送按钮结构差异较大，脚本需根据目标站点的 DOM 做适配，并确保触发 `input`/`submit`/`click` 等事件。

## 目录结构
- `src/main`：Electron 主进程、窗口/视图管理、`ai-handlers`、IPC 与持久化
- `src/renderer`：React 前端（`AppShell`、组件、样式）
- `src/shared/locales`：国际化文案与菜单
- `assets`：应用图标与 macOS 权限（`entitlements.mac.plist`）
- `.erb`：Webpack 配置与脚本（基于 Electron React Boilerplate）

## 致谢与许可
- 基于并扩展自 Electron React Boilerplate
- License: MIT