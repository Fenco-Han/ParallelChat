// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
// 预加载脚本：只在此处暴露有限且安全的 API 给渲染器。
// 不直接暴露 ipcRenderer 或 Node 能力，保证 contextIsolation 场景下的安全边界。

// 保留 ERB 示例频道，兼容默认样例
export type ElectronChannels = 'ipc-example';

// ParallelChat IPC 频道（与 TDD 文档对齐）：
// 渲染器只能通过这些白名单频道与主进程交互，避免随意调用。
export type Channels =
  | 'parallelchat/broadcast'
  | 'parallelchat/layout/set'
  | 'parallelchat/layout/active'
  | 'parallelchat/workspace/bounds'
  | 'parallelchat/ai/reload'
  | 'parallelchat/ai/ready'
  | 'parallelchat/message/success'
  | 'parallelchat/message/fail'
  | 'parallelchat/message/sending'
  | 'parallelchat/status/update'
  | 'parallelchat/status/complete'
  | 'parallelchat/store/get'
  | 'parallelchat/store/set'
  | 'parallelchat/cache/clear'
  | 'parallelchat/cache/clear-all'
  | 'parallelchat/view/reload'
  | 'parallelchat/view/visible'
  | 'parallelchat/view/upload-files'
  | 'parallelchat/dialog/open'
  | 'parallelchat/file/save-temp'
  | 'parallelchat/file/read-data-url'
  | 'parallelchat/ai/send-only'
  | 'parallelchat/ai/status-check'
  | 'parallelchat/onboarding/start'
  | 'parallelchat/onboarding/complete'
  | 'parallelchat/session/new'
  | 'parallelchat/session/snapshot'
  | 'parallelchat/session/create'
  | 'parallelchat/session/load'
  | 'parallelchat/session/update-title'
  | 'parallelchat/session/delete'
  | 'parallelchat/session/changed'
  // —— i18n ——
  | 'parallelchat/i18n/get'
  | 'parallelchat/i18n/set'
  | 'parallelchat/i18n/changed'
  // —— 应用版本与更新 ——
  | 'parallelchat/app/version'
  | 'parallelchat/update/check'
  | 'parallelchat/update/install'
  | 'parallelchat/update/available'
  | 'parallelchat/update/downloading'
  | 'parallelchat/update/downloaded'
  | 'parallelchat/update/error';

// 兼容 ERB 原有的 electronHandler，用于示例交互（不建议在业务中扩展它）。
const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: ElectronChannels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: ElectronChannels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once(channel: ElectronChannels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

// 安全、受限的 ParallelChat API，唯一对外暴露的能力入口：
// - invoke: 异步 RPC（有返回值）
// - send: 单向事件
// - on/once: 订阅主进程事件
const parallelchat = {
  invoke(channel: Channels, ...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args);
  },
  send(channel: Channels, ...args: unknown[]) {
    ipcRenderer.send(channel, ...args);
  },
  on(channel: Channels, func: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  once(channel: Channels, func: (...args: unknown[]) => void) {
    ipcRenderer.once(channel, (_event, ...args) => func(...args));
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('parallelchat', parallelchat);

export type ElectronHandler = typeof electronHandler;
export type ParallelChatAPI = typeof parallelchat;
