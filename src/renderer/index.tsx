import { createRoot } from 'react-dom/client';
import App from './App';
import { initI18nRenderer } from './lib/i18n';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

initI18nRenderer().then(() => {
  root.render(<App />);
});

// calling IPC exposed from preload script
window.electron?.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron?.ipcRenderer.sendMessage('ipc-example', ['ping']);
