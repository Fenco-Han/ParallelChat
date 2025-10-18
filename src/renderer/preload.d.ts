import { ElectronHandler, ParallelChatAPI } from '../main/preload';
// 渲染器类型声明：为 window.parallelchat 提供类型提示与约束，避免随意调用未知频道。

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    parallelchat: ParallelChatAPI;
  }
}

export {};
