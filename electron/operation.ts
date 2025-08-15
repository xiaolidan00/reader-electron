import {BOOKLIST} from "./config";
import type {BookType, ChapterType} from "../@types";
import {dialog, ipcMain} from "electron";
//@ts-ignore
import encodingConvert from "encoding";
import fs from "node:fs";
import jschardet from "jschardet";
import {win} from "./main";
import {LineNum, chapterRegex} from "../data";
let bookIds: {[n: string]: number} = {};
let bookList: BookType[] = [];

let currentPage = "list";

function updateBookIds() {
  bookList.sort((a, b) => b.readTime - a.readTime);
  const map: {[n: string]: number} = {};
  bookList.forEach((item, idx) => {
    map[item.id] = idx;
  });
  bookIds = map;
}
function saveBook() {
  fs.writeFileSync(BOOKLIST, JSON.stringify(bookList));
  updateBookIds();
}

function updateTxt(item: string) {
  const id = item.toString().replace(/[\.|\:]/g, "_");

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
    updateTime: info.mtimeMs,
    path: item,
    regexType: -1
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
let isLock = false;
const sendList = () => {
  if (isLock) return;
  isLock = true;
  win!.webContents.send("listTxt", bookList);
  setTimeout(() => {
    isLock = false;
  }, 1000);
};

export function openFiles(ev: any, filePaths: string[]) {
  for (let i = 0; i < filePaths.length; i++) {
    const item = filePaths[i];
    updateTxt(item);
  }
  saveBook();
  sendList();
}

export const firstLoad = () => {
  if (fs.existsSync(BOOKLIST)) {
    const books = fs.readFileSync(BOOKLIST).toString();
    bookList = JSON.parse(books) as BookType[];
    updateBookIds();
  }
  sendList();
};
export const openTxt = () => {
  dialog
    .showOpenDialog(win!, {
      properties: ["openFile", "multiSelections"],
      filters: [{name: "txt", extensions: ["txt"]}]
    })
    .then(({canceled, filePaths}) => {
      if (!canceled && filePaths.length) {
        openFiles(null, filePaths);
      }
    });
};
function transformCode(path: string) {
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
function readedBook({
  id,
  chapter,
  index,
  total,
  num
}: {
  id: string;
  chapter: number;
  index: number;
  total: number;
  num: number;
}) {
  const data = {
    ...bookList[bookIds[id]],
    index,
    chapter,
    total,
    readTime: new Date().getTime(),
    num
  };
  bookList[bookIds[id]] = data;
  saveBook();
}

export const onClose = (ev: any) => {
  if (currentPage === "book") {
    ev.preventDefault();
    win!.webContents.send("closeBook");
    ipcMain.once("closedBook", (ev, {id, chapter, index, total, num}) => {
      readedBook({id, chapter, index, total, num});
      setTimeout(() => {
        win!.destroy();
      }, 500);
    });
  }
};

export const setCurrentPage = (ev: any, page: string) => {
  currentPage = page;
};
function getRegex(s: string): RegExp {
  for (let i = 0; i < chapterRegex.length; i++) {
    const r = chapterRegex[i].value;
    const rr = new RegExp(r, "g");
    if (rr.test(s)) {
      return rr;
    }
  }
  return new RegExp(chapterRegex[0].value);
}

function sliceContent(it: string) {
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
export const changeRegex = (ev: any, {regex, id, regexType}: {regexType: number; regex: string; id: string}) => {
  const data = bookList[bookIds[id]];
  data.regexType = regexType;
  if (regexType == -1) {
    data.regex = undefined;
  } else {
    data.regex = regex;
  }
  console.log(regex);
  bookList[bookIds[id]] = data;
  fs.writeFileSync(BOOKLIST, JSON.stringify(bookList));
  getTxt(null, id);
};
const delOneTxt = (id: string) => {
  console.log("delOneTxt");
  bookList.splice(bookIds[id], 1);
  updateBookIds();
  win!.webContents.send("backList");
  currentPage = "list";
  sendList();
};
export const getTxt = (ev: any, id: string) => {
  const data = bookList[bookIds[id]];

  if (fs.existsSync(data.path)) {
    const txt = transformCode(data.path);
    const first3000 = txt.substring(0, 3000);

    const lines = txt.replace(/\r|\t/g, "").split("\n");

    let newTitle = "";
    let title = data.name;
    let content: string[] = [];
    const list: ChapterType[] = [];

    const zhangjie = data.regex ? new RegExp(data.regex, "g") : getRegex(first3000);

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
        content.push(...sliceContent(it));
      }
    });
    if (content.length) {
      list.push({
        title: title,
        content: content
      });
    }
    data.num = txt.length;
    console.log(" getTxt ~ data.num:", data.num);
    readedBook(data);
    sendList();

    win!.webContents.send("readTxt", list);
  } else {
    delOneTxt(id);
  }
};
export const delTxt = (ev: any, {map, type}: {map: {[n: string]: boolean}; type: string}) => {
  let delData: BookType[] = [];
  let newList: BookType[] = [];
  bookList.forEach((item) => {
    if (map[item.id]) {
      delData.push(item);
    } else {
      newList.push(item);
    }
  });

  if (type === "file") {
    for (let i = 0; i < delData.length; i++) {
      fs.unlinkSync(delData[i].path);
    }
  }
  bookList = newList;
  saveBook();
  sendList();
};

export const readedTxt = (
  ev: any,
  {id, chapter, index, total}: {id: string; chapter: number; index: number; total: number}
) => {
  const data = bookList[bookIds[id]];
  readedBook({id, chapter, index, total, num: data.num});
  setTimeout(() => {
    sendList();
  }, 500);
};
