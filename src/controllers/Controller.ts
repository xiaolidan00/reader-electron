import {BookType, ChapterType} from "../../@types";
import {EventBus} from "../utils/EventEmitter";
import {chapterRegex} from "../data";
import {isElectron} from "../utils/utils";
import {convertPinyin} from "../utils/pingyinUtil";

export const waitAction = (sendAction: {eventName: string; data?: any}, receive?: boolean) => {
  return new Promise<any>((resolve, reject) => {
    const cbId = "action" + new Date().getTime();

    if (receive) {
      const t = setTimeout(() => {
        reject("timeout");
      }, 10000);
      window.ipcRenderer.once(cbId, (_event: any, data: any) => {
        // console.log("🚀 ~ Controller.ts ~ waitAction", sendAction.eventName, sendAction.data, data);
        clearTimeout(t);
        resolve(data);
      });
      window.ipcRenderer.send(sendAction.eventName, {
        cb: cbId,
        data: sendAction.data
      });
    } else {
      window.ipcRenderer.send(sendAction.eventName, sendAction.data);
    }
    // console.log("sendAction.eventName", sendAction.eventName, sendAction.data);

    if (!receive) resolve("");
  });
};
export const formatName = (n: string) => {
  return n.substring(n.lastIndexOf("/") + 1, n.lastIndexOf("."));
};
export const fileMap: Record<string, File> = {};
export default {
  waitAction,
  dataList: [] as BookType[],

  bookItem: {} as BookType,
  setBook(book: BookType) {
    this.bookItem = book;
  },
  LineNum: 20,
  PageNum: 20,
  setLinePageNum(line: number, page: number) {
    this.LineNum = line;
    this.PageNum = page;
  },
  isFirst: true,
  async getData() {
    if (!this.isFirst) {
      return this.dataList;
    }
    let d = [];
    if (isElectron()) {
      d = await waitAction(
        {
          eventName: "getBookList"
        },
        true
      );
      this.dataList = d;
    } else {
      const list = localStorage.getItem("BOOK_LIST");
      if (list) {
        try {
          d = JSON.parse(list);
          this.dataList = d;
        } catch (error) {
          d = [];
        }
      } else {
        d = [];
      }
    }
    this.isFirst = false;
    return d;
  },
  async save(data: BookType[]) {
    if (!isElectron()) {
      localStorage.setItem("BOOK_LIST", JSON.stringify(data));
    }
  },
  async openPath(filePath: string) {
    // console.log("openPath", filePath);
    await waitAction({
      eventName: "openPath",
      data: filePath
    });
  },
  //打开txt文件
  openTxt() {
    return new Promise<any>((resolve) => {
      let upload = document.getElementById("uploadFile") as HTMLInputElement;
      if (!upload) {
        upload = document.createElement("input") as HTMLInputElement;
        upload.id = "uploadFile";
        upload.type = "file";
        upload.accept = ".txt,.md";
        upload.style.position = "fixed";
        upload.style.opacity = "0";
        upload.multiple = true;
        upload.style.display = "none";
      }

      upload.onchange = () => {
        if (upload.files) this.openTxtInfo(upload.files);

        resolve("");
      };

      setTimeout(() => {
        resolve("");
      }, 5000);
      document.body.appendChild(upload);
      upload.click();
    });
  },
  async openTxtInfo(files: File[] | FileList) {
    if (files?.length) {
      const addList: BookType[] = [],
        updateList: Partial<BookType>[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        let id;
        if (!isElectron()) {
          fileMap[f.name] = f;
          id = f.name;
        } else {
          id = f.path;
        }

        let data: BookType;
        const pping = f.name.substring(0, f.name.lastIndexOf("."));
        const idx = this.dataList.findIndex((a) => a.filePath === id);
        if (idx >= 0) {
          data = this.dataList[idx];
          this.dataList[idx] = {
            ...data,
            fileSize: f.size,
            updateTime: new Date().getTime()
          };
          updateList.push({
            filePath: id,
            fileSize: f.size,
            updateTime: new Date().getTime()
          });
        } else {
          data = {
            fileName: pping,
            currentChapter: 0,
            pageIndex: 0,
            totalChapter: 0,
            textNum: 0,
            updateTime: new Date().getTime(),
            fileSize: f.size,
            regexType: -1,
            regexStr: "",
            filePath: id,
            encodeStr: "auto",
            pinyinStr: convertPinyin(pping).toLowerCase()
          } as BookType;
          this.dataList.unshift(data);
          addList.push(data);
        }
      }
      if (isElectron()) {
        if (updateList.length) {
          await waitAction({
            eventName: "updateBook",
            data: updateList
          });
        }
        if (addList.length) {
          await waitAction({
            eventName: "insertBook",
            data: addList
          });
        }
      } else {
        this.save(this.dataList);
      }
      EventBus.emit("refreshList", this.dataList);
    }
  },

  //删除记录或删除文件
  async delTxt(delBooks: Record<string, boolean>, isFile?: boolean) {
    const files: string[] = [];
    this.dataList = this.dataList.filter((a) => {
      if (delBooks[a.filePath]) {
        if (!isElectron()) {
          delete fileMap[a.filePath];
        } else {
          files.push(a.filePath);
        }
        return false;
      }

      return true;
    });

    if (isElectron()) {
      await waitAction({
        eventName: "deleteBook",
        data: {
          list: files,
          isFile
        }
      });
    } else {
      this.save(this.dataList);
    }
    EventBus.emit("refreshList", this.dataList);
  },

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
  },

  /**内容划分章节*/
  sliceContent(it: string) {
    it = it.trim();
    //   it = it.replace(/\s+/g, '');
    if (!it) return [];
    const content = [];
    if (it.length + 3 <= this.LineNum && it) {
      content.push("\t" + it + "\n");
    } else {
      let count = 3;
      let ss = "\t";
      for (let i = 0; i < it.length; i++) {
        const s = it[i];
        count++;
        ss += s;
        if (count == this.LineNum || i == it.length - 1) {
          content.push(ss);
          count = 0;
          ss = "";
        }
      }
      content[content.length - 1] += "\n";
    }
    return content;
  },

  /** 修改正则表达式 */
  async changeRegex({regexStr, regexType}: {regexType: number; regexStr: string}) {
    const idx = this.dataList.findIndex((a) => a.filePath === this.bookItem.filePath);
    if (idx < 0) return;
    const data = this.dataList[idx];
    data.regexType = regexType;
    if (regexType == -1) {
      data.regexStr = "";
    } else {
      data.regexStr = regexStr;
    }

    this.dataList[idx] = data;

    await waitAction({
      eventName: "updateBook",
      data: [
        {
          filePath: data.filePath,
          regexType: data.regexType,
          regexStr: data.regexStr
        }
      ]
    });

    this.readTxt();
  },
  async changeEncode(encode: string) {
    const idx = this.dataList.findIndex((a) => a.filePath === this.bookItem.filePath);
    if (idx < 0) return;
    const data = this.dataList[idx];
    data.encodeStr = encode;
    this.dataList[idx] = data;
    await waitAction({
      eventName: "updateBook",
      data: [
        {
          filePath: data.filePath,
          encodeStr: encode
        }
      ]
    });
    this.readTxt();
  },
  //获取内容
  async readTxt() {
    const idx = this.dataList.findIndex((a) => a.filePath === this.bookItem.filePath);
    if (idx < 0) return;
    const data = this.dataList[idx];
    // console.log("readTxt", data);
    if (!isElectron()) {
      EventBus.emit("loading", true);

      const reader = new FileReader();
      reader.onload = () => {
        this.readTxtContent(reader.result!.toString());
      };
      reader.onerror = (err) => {
        console.log("🚀 ~ Controller.ts ~ err:", err);
        EventBus.emit("loading", false);
      };
      reader.readAsText(fileMap[this.bookItem.filePath]!, data.encodeStr || "UTF-8");
    } else {
      try {
        const buf = await this.waitAction(
          {
            eventName: "getFile",
            data: {
              filePath: data!.filePath,
              encodeStr: data!.encodeStr
            }
          },
          true
        );

        this.readTxtContent(buf);
      } catch (error) {}
    }
  },
  async readTxtContent(result: string) {
    if (!result) {
      alert("读取txt失败");
      // EventBus.emit("backTxt");
      EventBus.emit("loading", false);
      return;
    }
    const idx = this.dataList.findIndex((a) => a.filePath === this.bookItem.filePath);
    const data = this.dataList[idx];
    const txt = result;

    const first3000 = txt.substring(0, 3000);
    console.log("🚀 ~ Controller.ts ~ first100:", txt.substring(0, 100));
    if (first3000.indexOf("�") >= 0) {
      alert("解析txt失败,请修改编码方式");
      EventBus.emit("loading", false);
      return;
    }

    const lines = txt.replace(/\r|\t/g, "").split("\n");

    let newTitle = "";
    let title = data.fileName;
    let content: string[] = [];
    const list: ChapterType[] = [];
    let cIdx = 0;

    const zhangjie = data.regexStr ? new RegExp(data.regexStr, "g") : this.getRegex(first3000);

    lines.forEach((it: string, i: number) => {
      let tag = true;
      let r = it.trim();
      if (zhangjie.test(r)) {
        newTitle = r;
        tag = false;
      }
      //标题行
      if (newTitle && title != newTitle) {
        list.push({
          title: title,
          content: content,
          index: cIdx
        });
        cIdx++;
        title = newTitle;
        if (i < lines.length - 1) {
          content = [];
        } else {
          content.push(...this.sliceContent(it));
        }
      } else if (tag) {
        //内容行
        content.push(...this.sliceContent(it));
      }
    });

    if (content.length) {
      list.push({
        title: title,
        content: content,
        index: cIdx
      });
      cIdx++;
    }
    if (list.length === 0 && content.length) {
      list.push({
        title: title,
        content: content,
        index: 0
      });
    }
    if (data.textNum === 0) {
      data.textNum = txt.length;
      data.updateTime = new Date().getTime();
      data.totalChapter = list.length;
      const newData = {
        filePath: data.filePath,
        textNum: data.textNum,
        updateTime: data.updateTime,
        totalChapter: data.totalChapter
      };
      this.dataList[idx] = {...data, ...newData};
      if (isElectron()) {
        await waitAction({
          eventName: "updateBook",
          data: [newData]
        });
      } else {
        this.save(this.dataList);
      }
    }
    // console.log("chapter content", list);
    EventBus.emit("readTxt", list);
    EventBus.emit("loading", false);
  },

  //保存阅读进度
  async saveBook(filePath: string, chapter: number, index: number) {
    const idx = this.dataList.findIndex((a) => a.filePath === filePath);
    if (idx >= 0) {
      const data = this.dataList[idx];
      const newData = {
        filePath,
        currentChapter: chapter,
        pageIndex: index,
        updateTime: new Date().getTime()
      };
      this.dataList[idx] = {
        ...data,
        ...newData
      };
      if (isElectron()) {
        await waitAction({
          eventName: "updateBook",
          data: [newData]
        });
      } else {
        await this.save(this.dataList);
      }
    }
  }
};
