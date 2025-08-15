//@ts-ignore
import encodingConvert from "encoding";
import {BrowserWindow, dialog, ipcMain} from "electron";
import {LineNum, chapterRegex} from "../data";

import fs from "node:fs";
import jschardet from "jschardet";
import type {BookType, ChapterType} from "../@types";
import {BOOKLIST} from "./config";
export class ReaderController {
  win: BrowserWindow;
  bookList: BookType[] = [];
  bookIds: {[n: string]: number} = {};
  constructor(win: BrowserWindow) {
    this.win = win;

    //拖入文件
    ipcMain.on("dragTxt", this.dragTxt.bind(this));
    //打开文件
    ipcMain.on("openTxt", this.openTxt.bind(this));

    ipcMain.on("readedTxt", this.readedTxt.bind(this));
    ipcMain.on("getTxt", this.getTxt.bind(this));
    ipcMain.on("chapterRegex", this.changeRegex.bind(this));
    ipcMain.on("delTxt", this.delTxt.bind(this));
  }

  /**读取记录 */
  getList() {
    if (fs.existsSync(BOOKLIST)) {
      const books = fs.readFileSync(BOOKLIST).toString();
      this.bookList = JSON.parse(books) as BookType[];
      this.updateBookIds();
      this.win.webContents.send("listTxt", this.bookList);
    }
  }
  /** 拖入txt文件 */
  dragTxt(ev: any, filePaths: string[]) {
    for (let i = 0; i < filePaths.length; i++) {
      this.createTxt(filePaths[i]);
    }
    this.saveBook();
  }
  /** 打开txt文件 */
  openTxt() {
    dialog
      .showOpenDialog(this.win, {
        properties: ["openFile", "multiSelections"],
        filters: [{name: "txt", extensions: ["txt"]}]
      })
      .then(({canceled, filePaths}: {canceled: boolean; filePaths: string[]}) => {
        if (!canceled && filePaths.length) {
          this.dragTxt(null, filePaths);
        }
      });
  }
  /** 保存阅读进度 */
  readedTxt(
    ev: any,
    op: {
      id: string;
      chapter: number;
      index: number;
      total: number;
    }
  ) {
    const idx = this.bookIds[op.id];
    const pre = this.bookList[idx];
    const data: BookType = {
      ...pre,
      index: op.index,
      chapter: op.chapter,
      total: op.total,
      updateTime: new Date().getTime()
    };
    this.bookList[idx] = data;
    this.saveBook();
  }
  /*获取txt内容 */
  getTxt(ev: any, id: string) {
    const idx = this.bookIds[id];
    const data = this.bookList[idx];

    if (fs.existsSync(data.path)) {
      const txt = this.transformCode(data.path);
      const first3000 = txt.substring(0, 3000);

      const lines = txt.replace(/\r|\t/g, "").split("\n");

      let newTitle = "";
      let title = data.name;
      let content: string[] = [];
      const list: ChapterType[] = [];

      const zhangjie = data.regex ? new RegExp(data.regex, "g") : this.getRegex(first3000);

      lines.forEach((it: string, i: number) => {
        let tag = true;
        let r = it.trim();
        if (zhangjie.test(r)) {
          newTitle = r;
          tag = false;
        }
        if (newTitle && title != newTitle) {
          list.push({
            title: title,
            content: content
          });
          title = newTitle;
          content = [];
        } else if (tag) {
          content.push(...this.sliceContent(it));
        }
      });
      if (content.length) {
        list.push({
          title: title,
          content: content
        });
      }
      if (data.num === 0) {
        data.num = txt.length;
        data.updateTime = new Date().getTime();
        this.bookList[idx] = data;
        this.saveBook();
      }
      this.win.webContents.send("readTxt", list);
    } else {
      //文件找不到，自动删除记录
      this.bookList.splice(idx, 1);
      this.saveBook();
    }
  }
  /** 修改正则表达式 */
  changeRegex(ev: any, {regex, id, regexType}: {regexType: number; regex: string; id: string}) {
    const idx = this.bookIds[id];
    const data = this.bookList[idx];
    data.regexType = regexType;
    if (regexType == -1) {
      data.regex = undefined;
    } else {
      data.regex = regex;
    }

    this.bookList[idx] = data;

    this.getTxt(null, id);
  }
  /** 删除txt文件或记录 */
  delTxt(ev: any, ids: string[]) {
    const obj: {[n: string]: boolean} = {};
    ids.forEach((a) => {
      obj[a] = true;
    });
    this.bookList = this.bookList.filter((a) => !obj[a.id]);
  }

  /** 保存读书记录 */
  saveBook() {
    fs.writeFileSync(BOOKLIST, JSON.stringify(this.bookList));
    this.updateBookIds();
    this.win.webContents.send("listTxt", this.bookList);
  }

  /** 创建单本读书记录 */
  createTxt(item: string) {
    const id = item.toString().replace(/[\.|\:]/g, "_");
    const index = this.bookIds[id];
    if (index >= 0) {
      const pre = this.bookList[index];
      this.bookList[index] = {
        ...pre,
        updateTime: new Date().getTime()
      };
    } else {
      const info = fs.statSync(item);
      const name = item.substring(item.lastIndexOf("\\") + 1, item.lastIndexOf("."));
      const data: BookType = {
        id: id,
        name: name,
        chapter: 0,
        total: 0,
        index: 0,
        size: info.size,
        num: 0,
        updateTime: new Date().getTime(),
        path: item,
        regexType: -1
      };
      this.bookList.push(data);
    }
  }
  /**更新书ID */
  updateBookIds() {
    this.bookList.sort((a, b) => b.updateTime - a.updateTime);
    const map: {[n: string]: number} = {};
    this.bookList.forEach((item, idx) => {
      map[item.id] = idx;
    });
    this.bookIds = map;
  }
  /**自动匹配章节正则类型 */
  getRegex(s: string): RegExp {
    for (let i = 0; i < chapterRegex.length; i++) {
      const r = chapterRegex[i].value;
      const rr = new RegExp(r, "g");
      if (rr.test(s)) {
        return rr;
      }
    }
    return new RegExp(chapterRegex[0].value);
  }
  /**转换GBK*/
  transformCode(path: string) {
    let buf = fs.readFileSync(path);
    const result = jschardet.detect(buf);

    if (result.encoding === "GB2312") {
      const txt = encodingConvert.convert(buf, "UTF8", "GB2312");
      try {
        fs.writeFileSync(path, txt);
      } catch (error) {
        console.log("transformCode write Error", path);
      }

      return txt.toString();
    }

    return buf.toString();
  }
  /**内容划分章节*/
  sliceContent(it: string) {
    it = it.trim();
    //   it = it.replace(/\s+/g, '');
    if (!it) return [];
    const content = [];
    if (it.length + 3 <= LineNum && it) {
      content.push("\t" + it + "\n");
    } else {
      let count = 3;
      let ss = "\t";
      for (let i = 0; i < it.length; i++) {
        const s = it[i];
        count++;
        ss += s;
        if (count == LineNum || i == it.length - 1) {
          content.push(ss);
          count = 0;
          ss = "";
        }
      }
      content[content.length - 1] += "\n";
    }
    return content;
  }
}
