import { contextBridge, ipcRenderer } from 'electron';
import type { IgnoreMouseEventsOptions } from 'electron';

type IgnoreMouseEventPayload = {
  ignore: boolean;
  options?: IgnoreMouseEventsOptions;
};

contextBridge.exposeInMainWorld('electron', {
  // Renderer (R3F側) から Electron ウィンドウのマウス透過を切り替えるための API を公開
  setWindowIgnoreMouseEvents: (ignore: boolean, options?: IgnoreMouseEventsOptions) => {
    const payload: IgnoreMouseEventPayload = { ignore, options };
    ipcRenderer.invoke('window:set-ignore-mouse-events', payload);
  },
});

declare global {
  interface Window {
    electron: {
      setWindowIgnoreMouseEvents: (ignore: boolean, options?: IgnoreMouseEventsOptions) => void;
    };
  }
}
