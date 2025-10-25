import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IgnoreMouseEventsOptions } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The built directory structure
//
// ├─┬─ dist
// │ └─── main.js
// │ └─── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

const resolvePreloadPath = () => {
  const preloadMjs = path.join(__dirname, 'preload.mjs');
  if (fs.existsSync(preloadMjs)) {
    return preloadMjs;
  }

  const preloadJs = path.join(__dirname, 'preload.js');
  return preloadJs;
};

const consoleLevelMap: Record<number, 'log' | 'info' | 'warn' | 'error'> = {
  0: 'log',
  1: 'info',
  2: 'warn',
  3: 'error',
};

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, 'electron-vite.svg'),
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
    },
  });

  win.setBackgroundColor('#00000000');
  win.setAlwaysOnTop(true, 'screen-saver');

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelName = consoleLevelMap[level] ?? 'log';
    const location = sourceId ? `${sourceId}:${line}` : 'renderer';
    console[levelName](`[renderer] ${message} (${location})`);
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST!, 'index.html'));
  }
}

type IgnoreMouseEventPayload = {
  ignore: boolean;
  options?: IgnoreMouseEventsOptions;
};

ipcMain.handle('window:set-ignore-mouse-events', (_event, payload: IgnoreMouseEventPayload) => {
  if (!win) {
    return;
  }
  const { ignore, options } = payload;
  // forward オプションを明示して hover / drag を透過状態でも拾えるようにする
  const finalOptions = options ?? (ignore ? { forward: true } : undefined);
  win.setIgnoreMouseEvents(ignore, finalOptions);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
