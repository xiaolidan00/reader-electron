import type { BookType, ChapterType } from '../@types';
import { BrowserWindow, app, dialog, ipcMain } from 'electron';

import { BOOKLIST } from './config';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import iconv from 'iconv-lite';
import path from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null;
let bookIds: { [n: string]: number } = {};
let bookList: BookType[] = [];

const lineNum = 24;
function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 720,
    backgroundColor: 'rgb(250, 235, 215)',
    autoHideMenuBar: true,

    // icon: path.join(process.env.VITE_PUBLIC, 'logo.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs')
    }
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    if (fs.existsSync(BOOKLIST)) {
      const books = fs.readFileSync(BOOKLIST).toString();
      bookList = JSON.parse(books) as BookType[];
      updateBookIds();
      win?.webContents.send('listTxt', bookList);
    }
  });
  function updateBookIds() {
    bookList.sort((a, b) => b.readTime - a.readTime);
    bookList.forEach((item, idx) => {
      bookIds[item.id] = idx;
    });
  }
  function saveBook() {
    fs.writeFileSync(BOOKLIST, JSON.stringify(bookList));
    updateBookIds();
  }
  function readTxt(id: string, chapter: number, total: number) {
    const data = {
      ...bookList[bookIds[id]],
      chapter,
      total,
      readTime: new Date().getTime()
    };
    bookList[bookIds[id]] = data;
    saveBook();
  }
  function updateTxt(item: string) {
    const id = item.replace(/[\.|\\|\:]/g, '_');
    const info = fs.statSync(item);
    console.log(info);
    const name = item.substring(item.lastIndexOf('\\') + 1, item.lastIndexOf('.'));
    const data = {
      id: id,
      name: name,
      chapter: 0,
      total: 0,
      size: info.size,
      updateTime: info.mtimeMs,
      importTime: new Date().getTime(),
      readTime: new Date().getTime(),
      path: item,
      group: ''
    };
    if (bookIds[id] > 0) {
      const before = bookList[bookIds[id]];
      bookList[bookIds[id]] = { ...data, chapter: before.chapter, total: before.total };
    } else {
      bookIds[id] = bookList.length;
      bookList.push(data);
    }
  }
  ipcMain.on('openTxt', () => {
    dialog
      .showOpenDialog(win!, {
        properties: ['openFile', 'multiSelections'],

        filters: [{ name: 'image', extensions: ['txt'] }]
      })
      .then(({ canceled, filePaths }) => {
        if (!canceled) {
          for (let i = 0; i < filePaths.length; i++) {
            const item = filePaths[i];
            updateTxt(item);
          }
          saveBook();
          win!.webContents.send('listTxt', bookList);
        }
      });
  });

  ipcMain.on('getTxt', (ev, id: string) => {
    const data = bookList[bookIds[id]];
    if (fs.existsSync(data.path)) {
      const txt = iconv.decode(fs.readFileSync(data.path), 'gb2312');
      const lines = txt.replace(/\r/g, '').split('\n');

      let newTitle = '';
      let title = '';
      let content: string[] = [];
      const list: ChapterType[] = [
        {
          title: data.name,
          content: []
        }
      ];
      function sliceContent(it: string) {
        const content = [];
        if (it.length <= lineNum && it) {
          content.push(it);
        } else {
          for (let i = 0; i < it.length; i = i + lineNum) {
            const s = it.substring(i, i + lineNum);
            if (s) {
              content.push(s);
            }
          }
        }
        return content;
      }
      lines.forEach((it) => {
        if (
          /(第{0,1}\s*[0-9一二三四五六七八九十]+\s*[章|节|回])|([0-9一二三四五六七八九十]+[\.|、])/.test(
            it
          )
        ) {
          newTitle = it;
        }

        if (title != newTitle && content.length) {
          const t = title || data.name;

          content.unshift(...sliceContent(t));
          content[0] = `<div class='chapter-title'>${content[0]}</div>`;
          list.push({
            title: t,
            content: content
          });
          title = newTitle;
          content = [];
        } else {
          content.push(...sliceContent(it));
        }
      });
      if (content) {
        list.push({
          title: title,
          content: content
        });
      }
      win!.webContents.send('readTxt', list);
    } else {
      bookList.splice(bookIds[id], 1);
      updateBookIds();
      win!.webContents.send('listTxt', bookList);
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
  win.webContents.openDevTools({ mode: 'detach' });
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
