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
// ウィンドウ位置のキャッシュ
let cachedWindowPosition: { x: number; y: number } | null = null;
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
    width: 1280,
    height: 1080,
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

  // 初期ウィンドウ位置をキャッシュ
  const [x, y] = win.getPosition();
  cachedWindowPosition = { x, y };

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

type MoveWindowPayload = {
  deltaX: number;
  deltaY: number;
};

ipcMain.handle('window:move', (_event, payload: MoveWindowPayload) => {
  if (!win) {
    return;
  }
  // Validate payload
  if (typeof payload !== 'object' || payload === null) {
    console.error('Invalid payload for window:move', payload);
    return;
  }
  const deltaX = Number(payload.deltaX);
  const deltaY = Number(payload.deltaY);
  if (isNaN(deltaX) || isNaN(deltaY)) {
    console.error('Invalid delta values', payload);
    return;
  }

  // キャッシュされた位置がない場合は現在位置を取得
  if (!cachedWindowPosition) {
    const [x, y] = win.getPosition();
    cachedWindowPosition = { x, y };
  }

  // キャッシュされた位置を更新
  const newX = Math.round(cachedWindowPosition.x + deltaX);
  const newY = Math.round(cachedWindowPosition.y + deltaY);

  cachedWindowPosition = { x: newX, y: newY };

  // ウィンドウ位置を設定
  win.setPosition(newX, newY);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
    cachedWindowPosition = null;
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
