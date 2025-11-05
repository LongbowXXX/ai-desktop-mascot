import { contextBridge, ipcRenderer } from 'electron';
import type { IgnoreMouseEventsOptions } from 'electron';

type IgnoreMouseEventPayload = {
  ignore: boolean;
  options?: IgnoreMouseEventsOptions;
};

type MoveWindowPayload = {
  deltaX: number;
  deltaY: number;
};

contextBridge.exposeInMainWorld('electron', {
  // Renderer (R3F側) から Electron ウィンドウのマウス透過を切り替えるための API を公開
  setWindowIgnoreMouseEvents: (ignore: boolean, options?: IgnoreMouseEventsOptions) => {
    const payload: IgnoreMouseEventPayload = { ignore, options };
    ipcRenderer.invoke('window:set-ignore-mouse-events', payload);
  },
  // ウィンドウ移動用のAPI
  moveWindow: (deltaX: number, deltaY: number) => {
    const payload: MoveWindowPayload = { deltaX, deltaY };
    ipcRenderer.invoke('window:move', payload);
  },
});

declare global {
  interface Window {
    electron: {
      setWindowIgnoreMouseEvents: (ignore: boolean, options?: IgnoreMouseEventsOptions) => void;
      moveWindow: (deltaX: number, deltaY: number) => void;
    };
  }
}
