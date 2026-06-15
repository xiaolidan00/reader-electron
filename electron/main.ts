import {BrowserWindow, app, ipcMain, shell} from "electron";
import jschardet from "jschardet";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import fs from "node:fs";
import path from "node:path";
import iconv from "iconv-lite";
import {dataBaseUtil} from "./DataBaseUtil";

// const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 750,
    // menuBarVisible: false,
    backgroundColor: "rgb(250, 235, 215)",
    autoHideMenuBar: true,
    // closable: false,
    resizable: false,
    // minimizable: false,
    icon: path.join(process.env.VITE_PUBLIC, "logo.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    }
  });

  // Test active push message to Renderer-process.

  ipcMain.on("getBookList", async (ev: any, op: any) => {
    try {
      const books = await dataBaseUtil.getList();

      win.webContents.send(op.cb, books);
    } catch (error) {
      console.log("🚀 ~ main.ts ~ createWindow ~ error:", error);
      win.webContents.send(op.cb, []);
    }
  });

  ipcMain.on("deleteBook", (ev: any, op: any) => {
    const delData = op.list as string[];
    for (let i = 0; i < delData.length; i++) {
      dataBaseUtil.delete(delData[i]);
      if (op.isFile && fs.existsSync(delData[i])) {
        fs.unlinkSync(delData[i]);
      }
    }
  });

  ipcMain.on("updateBook", async (ev: any, list: any[]) => {
    try {
      for (let i = 0; i < list.length; i++) {
        await dataBaseUtil.update(list[i]);
      }
    } catch (error) {
      console.log(error);
    }
  });

  ipcMain.on("insertBook", async (ev: any, list: any[]) => {
    try {
      for (let i = 0; i < list.length; i++) {
        await dataBaseUtil.insert(list[i]);
      }
    } catch (error) {
      console.log(error);
    }
  });

  ipcMain.on("openPath", (ev: any, data: any) => {
    if (fs.existsSync(data)) {
      shell.showItemInFolder(data);
    }
  });
  ipcMain.on("getFile", (ev: any, op: any) => {
    const filePath = op.data.filePath;
    const encodeStr = op.data.encodeStr;
    if (fs.existsSync(filePath)) {
      try {
        let content = "";
        if (encodeStr === "auto") {
          let buf = fs.readFileSync(filePath, {encoding: "binary"});
          const {encoding} = jschardet.detect(buf);
          //@ts-ignore
          buf = iconv.decode(buf, encoding);
          content = buf.toString();
        } else if (encodeStr) {
          let buf = fs.readFileSync(filePath, {encoding: "binary"});
          //@ts-ignore
          buf = iconv.decode(buf, encodeStr);
          content = buf.toString();
        } else {
          let buf = fs.readFileSync(filePath);
          content = buf.toString();
        }
        win.webContents.send(op.cb, content);
      } catch (error) {
        win.webContents.send(op.cb, "");
      }
    } else {
      win.webContents.send(op.cb, "");
    }
  });
  // win.webContents.on("did-finish-load", () => {});
  // win.on("close", controller.readedTxt);

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools({mode: "detach"});
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  dataBaseUtil.init();
  createWindow();
});
