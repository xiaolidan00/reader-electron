import { BrowserWindow, app, ipcMain } from 'electron';
import {
  firstLoad,
  openTxt,
  openFiles,
  setCurrentPage,
  getTxt,
  delTxt,
  readedTxt,
  onClose,
  changeRegex
} from './operation';

import { createRequire } from 'node:module';

import { fileURLToPath } from 'node:url';

import path from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

export let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 720,
    // menuBarVisible: false,
    backgroundColor: 'rgb(250, 235, 215)',
    autoHideMenuBar: true,
    // closable: false,
    resizable: false,
    // minimizable: false,
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs')
    }
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', firstLoad);
  //拖入文件
  ipcMain.on('dragTxt', openFiles);
  //打开文件
  ipcMain.on('openTxt', openTxt);

  ipcMain.on('currentPage', setCurrentPage);
  ipcMain.on('readedTxt', readedTxt);
  ipcMain.on('getTxt', getTxt);

  ipcMain.on('chapterRegex', changeRegex);

  ipcMain.on('delTxt', delTxt);
  win.on('close', onClose);

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

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
