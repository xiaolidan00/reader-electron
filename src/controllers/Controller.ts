import { BookType, ChapterType } from '../@types';
import { bookItem, dataList, LineNum, loading, selectBook, sortType } from '../config';
import { EventBus } from '../utils/EventEmitter';
import { chapterRegex } from '../data';
import { isElectron } from '../utils/utils';
import { convertPinyin } from '../utils/pingyinUtil';

export const sortBookList = (list: BookType[]) => {
  if (sortType.value.startsWith('size')) {
    if (sortType.value.endsWith('Asc')) {
      list.sort((a, b) => a.size - b.size);
    } else {
      list.sort((a, b) => b.size - a.size);
    }
  } else if (sortType.value.startsWith('name')) {
    if (sortType.value.endsWith('Asc')) {
      list.sort((a, b) => {
        const m = Math.min(a.pinyin.length, b.pinyin.length);
        for (let i = 0; i < m; i++) {
          const a1 = a.pinyin.charCodeAt(i);
          const b1 = b.pinyin.charCodeAt(i);
          if (a1 === b1) {
            continue;
          } else {
            return a1 - b1;
          }
        }
        return a.pinyin.length - b.pinyin.length;
      });
    } else {
      list.sort((a, b) => {
        const m = Math.min(a.pinyin.length, b.pinyin.length);
        for (let i = 0; i < m; i++) {
          const a1 = a.pinyin.charCodeAt(i);
          const b1 = b.pinyin.charCodeAt(i);
          if (a1 === b1) {
            continue;
          } else {
            return b1 - a1;
          }
        }
        return b.pinyin.length - a.pinyin.length;
      });
    }
  } else {
    if (sortType.value.endsWith('Asc')) {
      list.sort((a, b) => a.updateTime - b.updateTime);
    } else {
      list.sort((a, b) => b.updateTime - a.updateTime);
    }
  }
  return list;
};
const save = async (data: BookType[]) => {
  sortBookList(data);

  if (isElectron()) {
    await waitAction(
      {
        eventName: 'saveBookList',
        data: JSON.parse(JSON.stringify(data))
      },
      true
    );
  } else {
    localStorage.setItem('BOOK_LIST', JSON.stringify(data));
  }
};
export const getData = async () => {
  let d;
  if (isElectron()) {
    d = await waitAction(
      {
        eventName: 'getBookList'
      },
      true
    );
    console.log('getData', d);
  } else {
    d = localStorage.getItem('BOOK_LIST');
    if (d) {
      try {
        d = JSON.parse(d);
      } catch (error) {
        d = [];
      }
    } else {
      d = [];
    }
  }

  if (d) {
    dataList.value = sortBookList(d as BookType[]);
    return dataList.value;
  }
  return [];
};
export const waitAction = (sendAction: { eventName: string; data?: any }, receive?: boolean) => {
  return new Promise<any>((resolve, reject) => {
    const cbId = 'action' + new Date().getTime();

    if (receive) {
      const t = setTimeout(() => {
        reject('timeout');
      }, 10000);
      window.ipcRenderer.once(cbId, (_event: any, data: any) => {
        // console.log("🚀 ~ Controller.ts ~ waitAction", sendAction.eventName, sendAction.data, data);
        clearTimeout(t);
        resolve(data);
      });
    }
    // console.log("sendAction.eventName", sendAction.eventName, sendAction.data);
    window.ipcRenderer.send(sendAction.eventName, {
      cb: cbId,
      data: sendAction.data
    });
    if (!receive) resolve('');
  });
};
export const fileMap: Record<string, File> = {};
export default {
  waitAction,
  async openPath(filePath: string) {
    console.log('openPath', filePath);
    await waitAction({
      eventName: 'openPath',
      data: filePath
    });
  },
  //打开txt文件
  openTxt() {
    return new Promise<any>((resolve) => {
      let upload = document.getElementById('uploadFile') as HTMLInputElement;
      if (!upload) {
        upload = document.createElement('input') as HTMLInputElement;
        upload.id = 'uploadFile';
        upload.type = 'file';
        upload.accept = '.txt';
        upload.style.position = 'fixed';
        upload.style.opacity = '0';
        upload.multiple = true;
        upload.style.display = 'none';
      }

      upload.onchange = () => {
        if (upload.files) this.openTxtInfo(upload.files);

        resolve('');
      };

      setTimeout(() => {
        resolve('');
      }, 5000);
      document.body.appendChild(upload);
      upload.click();
    });
  },
  openTxtInfo(files: File[] | FileList) {
    if (files?.length) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        let id;
        if (!isElectron()) {
          fileMap[f.name] = f;
          id = f.name;
        } else {
          id = f.path.replace(/[\.|\:\\]/g, '_');
        }

        let data: BookType;
        const pping = f.name.substring(0, f.name.lastIndexOf('.'));
        const idx = dataList.value.findIndex((a) => a.id === id);
        if (idx >= 0) {
          data = dataList.value[idx];
          dataList.value[idx] = {
            ...data,
            name: pping,
            path: f.path,
            size: f.size,
            updateTime: new Date().getTime()
          };
        } else {
          data = {
            id: id,
            name: pping,
            chapter: 0,
            index: 0,
            total: 0,
            num: 0,
            updateTime: new Date().getTime(),
            size: f.size,
            regexType: -1,
            regex: '',
            path: f.path,
            pinyin: convertPinyin(pping).toLowerCase()
          };
          dataList.value.unshift(data);
        }
      }

      save(dataList.value);
      // selectBook.value = f.name;
      // bookItem.value = data;
      // this.readTxt();
    }
  },

  //删除记录或删除文件
  async delTxt(delBooks: Record<string, boolean>, isFile?: boolean) {
    const files: string[] = [];
    dataList.value = dataList.value.filter((a) => {
      if (delBooks[a.id]) {
        files.push(a.path);
        return false;
      }

      return true;
    });
    save(dataList.value);
    if (isFile) {
      await waitAction({
        eventName: 'delFile',
        data: files
      });
    }
  },

  /**自动匹配章节正则类型 */
  getRegex(s: string): RegExp {
    for (let i = 0; i < chapterRegex.length; i++) {
      const r = chapterRegex[i].value;
      const rr = new RegExp(r, 'g');
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
    if (it.length + 3 <= LineNum.value && it) {
      content.push('\t' + it + '\n');
    } else {
      let count = 3;
      let ss = '\t';
      for (let i = 0; i < it.length; i++) {
        const s = it[i];
        count++;
        ss += s;
        if (count == LineNum.value || i == it.length - 1) {
          content.push(ss);
          count = 0;
          ss = '';
        }
      }
      content[content.length - 1] += '\n';
    }
    return content;
  },

  /** 修改正则表达式 */
  changeRegex({ regex, regexType }: { regexType: number; regex: string }) {
    const idx = dataList.value.findIndex((a) => a.id === selectBook.value);
    if (idx < 0) return;
    const data = dataList.value[idx];
    data.regexType = regexType;
    if (regexType == -1) {
      data.regex = undefined;
    } else {
      data.regex = regex;
    }

    dataList.value[idx] = data;

    this.readTxt();
  },
  changeEncode(encode: string) {
    const idx = dataList.value.findIndex((a) => a.id === selectBook.value);
    if (idx < 0) return;
    const data = dataList.value[idx];
    data.encode = encode;
    dataList.value[idx] = data;

    this.readTxt(true);
  },
  //获取内容
  async readTxt(isFlag?: boolean) {
    const idx = dataList.value.findIndex((a) => a.id === selectBook.value);
    if (idx < 0) return;
    const data = dataList.value[idx];
    console.log('readTxt', data);
    if (!isElectron()) {
      loading.value = true;

      const reader = new FileReader();
      reader.onload = () => {
        this.readTxtContent(reader.result!.toString(), isFlag);
      };
      reader.onerror = (err) => {
        console.log('🚀 ~ Controller.ts ~ err:', err);
        loading.value = false;
      };
      reader.readAsText(fileMap[selectBook.value]!, data.encode || 'UTF-8');
    } else {
      try {
        const buf = await this.waitAction(
          {
            eventName: 'getFile',
            data: {
              path: data!.path,
              encode: data!.encode
            }
          },
          true
        );

        this.readTxtContent(buf, isFlag);
      } catch (error) {}
    }
  },
  readTxtContent(result: string, isFlag?: boolean) {
    if (!result) {
      alert('读取txt失败');
      // EventBus.emit("backTxt");
      loading.value = false;
      return;
    }
    const idx = dataList.value.findIndex((a) => a.id === selectBook.value);
    const data = dataList.value[idx];
    const txt = result;

    const first3000 = txt.substring(0, 3000);
    console.log('🚀 ~ Controller.ts ~ first100:', txt.substring(0, 100));
    if (first3000.indexOf('�') >= 0) {
      alert('解析txt失败,请修改编码方式');
      loading.value = false;
      return;
    }

    const lines = txt.replace(/\r|\t/g, '').split('\n');

    let newTitle = '';
    let title = data.name;
    let content: string[] = [];
    const list: ChapterType[] = [];
    let cIdx = 0;

    const zhangjie = data.regex ? new RegExp(data.regex, 'g') : this.getRegex(first3000);

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
    if (data.num === 0) {
      data.num = txt.length;
      data.updateTime = new Date().getTime();
      data.total = list.length;
      dataList.value[idx] = data;
      save(dataList.value);
    }
    EventBus.emit('readTxt', list);
    loading.value = false;
  },

  //保存阅读进度
  async saveBook(id: string, chapter: number, index: number, total: number) {
    const idx = dataList.value.findIndex((a) => a.id === id);
    if (idx >= 0) {
      const data = dataList.value[idx];
      dataList.value[idx] = {
        ...data,
        id,
        chapter,
        index,
        total,
        updateTime: new Date().getTime()
      };
      bookItem.value = dataList.value[idx];

      await save(dataList.value);
    }
  }
};
