import type { BookType, ChapterType } from '../@types';
import { BrowserWindow, app, dialog, ipcMain } from 'electron';

import { BOOKLIST } from './config';
import { createRequire } from 'node:module';
import encodingConvert from 'encoding';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import jschardet from 'jschardet';
import path from 'node:path';

// import { spawn } from 'child_process';

// import iconv from 'iconv-lite';

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

    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
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
    }
    win?.webContents.send('listTxt', bookList);
  });

  // function speedTxt(str: string) {
  //   const child = spawn('powershell.exe', [
  //     '-command',
  //     `Add-Type -AssemblyName System.speech; $synth = New-Object -TypeName System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('${str}');`
  //   ]);
  //   child.on('message', (msg) => {
  //     console.log(msg);
  //   });
  //   child.on('error', (err) => {
  //     console.error(err);
  //   });

  //   child.on('close', (code) => {
  //     console.log(`子进程已退出，返回代码 ${code}`);
  //   });
  // }
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

  function updateTxt(item: string) {
    const id = item.toString().replace(/[\.|\\|\:]/g, '_');

    const info = fs.statSync(item);

    const name = item.substring(item.lastIndexOf('\\') + 1, item.lastIndexOf('.'));
    const data = {
      id: id,
      name: name,
      chapter: 0,
      total: 0,
      index: 0,
      size: info.size,
      updateTime: info.mtimeMs,
      importTime: new Date().getTime(),
      readTime: new Date().getTime(),
      path: item,
      group: ''
    };
    if (bookIds[id] > 0) {
      const before = bookList[bookIds[id]];
      bookList[bookIds[id]] = {
        ...data,
        chapter: before.chapter,
        index: before.index,
        total: before.total
      };
    } else {
      bookIds[id] = bookList.length;
      bookList.push(data);
    }
  }
  // ipcMain.on('speedTxt', (ev, str: string) => {
  //   speedTxt(str);
  // });
  ipcMain.on('openTxt', () => {
    dialog
      .showOpenDialog(win!, {
        properties: ['openFile', 'multiSelections'],

        filters: [{ name: 'txt', extensions: ['txt'] }]
      })
      .then(({ canceled, filePaths }) => {
        if (!canceled && filePaths.length) {
          for (let i = 0; i < filePaths.length; i++) {
            const item = filePaths[i];
            updateTxt(item);
          }
          saveBook();
          win!.webContents.send('listTxt', bookList);
        }
      });
  });
  function transformCode(path: string) {
    let buf = fs.readFileSync(path);
    const result = jschardet.detect(buf);

    if (result.encoding == 'GB2312') {
      const txt = encodingConvert.convert(buf, 'UTF8', 'GB2312');
      fs.writeFileSync(path, txt);
      return txt.toString();
    }

    return buf.toString();
  }
  ipcMain.on('readedTxt', (ev, { id, chapter, index, total }) => {
    const data = {
      ...bookList[bookIds[id]],
      index,
      chapter,
      total,
      readTime: new Date().getTime()
    };
    bookList[bookIds[id]] = data;
    saveBook();
    setTimeout(() => {
      win!.webContents.send('listTxt', bookList);
    }, 500);
  });
  ipcMain.on('getTxt', (ev, id: string) => {
    const data = bookList[bookIds[id]];

    if (fs.existsSync(data.path)) {
      const txt = transformCode(data.path);
      //iconv.decode(fs.readFileSync(data.path), 'gb2312');
      const lines = txt.replace(/\r/g, '').split('\n');

      let newTitle = '';
      let title = data.name;
      let content: string[] = [];
      const list: ChapterType[] = [];
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
      lines.forEach((it: string) => {
        let tag = true;
        if (
          /(第{0,1}\s*[0-9一二三四五六七八九十]+\s*章)|(第\s*[0-9一二三四五六七八九十]+\s*[节|回])|([0-9一二三四五六七八九十]+[\.|、])/.test(
            it
          )
        ) {
          newTitle = it;
          tag = false;
        }

        if (newTitle && title != newTitle && content.length) {
          const t = title || data.name;
          content.unshift(...sliceContent(t));
          content[0] = `<div class='chapter-title'>${content[0].replace(/\s+/g, '')}</div>`;
          list.push({
            title: t,
            content: content
          });
          title = newTitle;
          content = [];
        } else if (tag) {
          content.push(...sliceContent(it));
        }
      });
      if (content.length) {
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

  ipcMain.on('delTxt', (ev, { map, type }) => {
    let delData: BookType[] = [];
    let newList: BookType[] = [];
    bookList.forEach((item) => {
      if (map[item.id]) {
        delData.push(item);
      } else {
        newList.push(item);
      }
    });

    if (type === 'file') {
      for (let i = 0; i < delData.length; i++) {
        fs.unlinkSync(delData[i].path);
      }
    }
    bookList = newList;
    saveBook();
    win!.webContents.send('listTxt', bookList);
  });

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
