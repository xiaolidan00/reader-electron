<script setup lang="ts">
  import {reactive, computed, onMounted, onBeforeUnmount, inject, ref} from "vue";

  import {AppStoreType, BookType, ListStoreType} from "../../@types";
  import {sortList, showList} from "../data/index";
  import Controller, {fileMap} from "../controllers/Controller.ts";
  import {isElectron} from "../utils/utils.ts";
  import {cloneDeep} from "lodash-es";
  import {useEventBus} from "../utils/EventEmitter.ts";

  const appStore = inject<AppStoreType>("AppStore")!;
  const state = reactive<ListStoreType>({
    showType: localStorage.getItem("showType") || "card",
    sortType: localStorage.getItem("sortType") || "updateTimeDesc",
    searchKey: "",
    isEdit: false,
    checkMap: {},
    isAll: false,
    disable: false,
    isDetail: false,
    dataList: [],
    bookItem: undefined
  });
  const formatNum = (v: number) => {
    return new Intl.NumberFormat().format(v);
  };
  const detailSet = computed(() => {
    const list: Array<{name: string; prop: keyof BookType; idx?: boolean; formatter?: Function}> = [
      {name: "共有章节", prop: "totalChapter", formatter: formatNum},
      {name: "当前章节", prop: "currentChapter", idx: true},
      {
        name: "共有字数",
        prop: "textNum",
        formatter: formatNum
      },
      {
        name: "文件大小",
        prop: "fileSize",
        formatter: formatNum
      },
      {
        name: "最近阅读",
        prop: "updateTime",
        formatter: (v: number) => {
          const d = new Date(v);
          return `${d.getFullYear()}-${
            d.getMonth() + 1
          }-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
        }
      }
    ];
    return list;
  });

  const showDataList = computed(() => {
    let list = cloneDeep(state.dataList);
    if (state.searchKey) {
      list = list.filter((it) => it.fileName.indexOf(state.searchKey) >= 0);
    }
    if (state.sortType.startsWith("size")) {
      if (state.sortType.endsWith("Asc")) {
        list.sort((a, b) => a.fileSize - b.fileSize);
      } else {
        list.sort((a, b) => b.fileSize - a.fileSize);
      }
    } else if (state.sortType.startsWith("name")) {
      if (state.sortType.endsWith("Asc")) {
        list.sort((a, b) => {
          const m = Math.min(a.pinyinStr.length, b.pinyinStr.length);
          for (let i = 0; i < m; i++) {
            const a1 = a.pinyinStr.charCodeAt(i);
            const b1 = b.pinyinStr.charCodeAt(i);
            if (a1 === b1) {
              continue;
            } else {
              return a1 - b1;
            }
          }
          return a.pinyinStr.length - b.pinyinStr.length;
        });
      } else {
        list.sort((a, b) => {
          const m = Math.min(a.pinyinStr.length, b.pinyinStr.length);
          for (let i = 0; i < m; i++) {
            const a1 = a.pinyinStr.charCodeAt(i);
            const b1 = b.pinyinStr.charCodeAt(i);
            if (a1 === b1) {
              continue;
            } else {
              return b1 - a1;
            }
          }
          return b.pinyinStr.length - a.pinyinStr.length;
        });
      }
    } else {
      if (state.sortType.endsWith("Asc")) {
        list.sort((a, b) => a.updateTime - b.updateTime);
      } else {
        list.sort((a, b) => b.updateTime - a.updateTime);
      }
    }
    return list;
  });
  const openTxt = async () => {
    state.disable = true;

    await Controller.openTxt();
    state.disable = false;
  };
  const onRightItem = (item: BookType) => {
    state.bookItem = item;
    state.isDetail = true;
  };
  const onReadTxt = (item: BookType) => {
    if (state.isEdit) {
      onCheckItem(item);
    } else {
      if (!isElectron() && !fileMap[item.filePath]) return alert("请选择文件");
      appStore.selectBook = item.filePath;
      appStore.selectBookItem = item;
      Controller.setBook(appStore.selectBookItem);
    }
  };
  const updateSort = () => {
    localStorage.setItem("sortType", state.sortType);
  };
  const onDelTxt = (isFile?: boolean) => {
    const ids: string[] = [];
    for (const k in state.checkMap) {
      if (state.checkMap[k]) {
        ids.push(k);
      }
    }
    if (ids.length) {
      Controller.delTxt(state.checkMap, isFile);
    }

    state.checkMap = {};
    state.isEdit = false;
  };
  const openPath = () => {
    if (state.bookItem) Controller.openPath(state.bookItem.filePath);
  };
  const onDelOneTxt = (isFile?: boolean) => {
    Controller.delTxt({[state.bookItem!.filePath]: true}, isFile);
    state.checkMap = {};
    state.isDetail = false;
    state.isEdit = false;
  };
  const onAll = () => {
    state.isAll = !state.isAll;
    if (state.isAll) {
      showDataList.value.forEach((a) => {
        state.checkMap[a.filePath] = true;
      });
    } else {
      state.checkMap = {};
    }
  };
  const onCheckItem = (item: BookType) => {
    state.checkMap[item.filePath] = !state.checkMap[item.filePath];
    // console.log(state.checkMap);
    let count = 0;
    for (let k in state.checkMap) {
      if (state.checkMap[k]) count++;
    }
    if (count === state.dataList.length) {
      state.isAll = true;
    } else if (count === 0) {
      state.isAll = false;
    }
  };

  const onBatch = () => {
    state.isEdit = !state.isEdit;
    const orginMap: Record<string, boolean> = {};
    state.dataList.forEach((a) => {
      orginMap[a.filePath] = false;
    });
    state.checkMap = orginMap;
  };
  //显示书名
  const getTitle = (t: string) => {
    return t.replace(/[,，！!、]/g, "").substring(0, 20);
  };
  const onDragOver = (ev: DragEvent) => {
    ev.preventDefault();
  };
  const onDropFile = (ev: DragEvent) => {
    ev.preventDefault();
    let fileList: File[] = [];
    if (ev.dataTransfer?.items?.length) {
      const items = ev.dataTransfer.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type === "file") {
          const f = item.getAsFile()!;
          if (f.name.endsWith(".txt")) {
            fileList.push(f);
          }
        }
      }
    }
    if (fileList.length === 0 && ev.dataTransfer?.files?.length) {
      fileList = Array.from(ev.dataTransfer.files).filter((it) => it.name.endsWith(".txt"));
    }
    if (fileList.length) {
      Controller.openTxtInfo(fileList);
    }
  };
  const downloadPercent = ref("");
  const onCheckUpdate = () => {
    window.ipcRenderer.send("checkUpdate");
  };
  const onDownloadProcess = (_ev: any, percent: number) => {
    downloadPercent.value = percent + "%";
  };
  window.ipcRenderer.on("downloadProcess", onDownloadProcess);
  onMounted(async () => {
    appStore.loading = true;
    state.dataList = await Controller.getData();
    appStore.loading = false;
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDropFile);
  });
  onBeforeUnmount(() => {
    document.removeEventListener("dragover", onDragOver);
    document.removeEventListener("drop", onDropFile);
    window.ipcRenderer.off("download-process", onDownloadProcess);
  });
  useEventBus("refreshList", (v: BookType[]) => {
    console.log("🚀 ~ v:", v);
    state.dataList = [...v];
  });
</script>

<template>
  <div class="search-box">
    <div class="search">
      <input placeholder="搜索关键词" type="text" v-model="state.searchKey" />
      <i class="iconfont icon-close" @click="state.searchKey = ''" v-show="state.searchKey"></i>
    </div>
  </div>
  <div class="tool-bar">
    <i title="是否开启批量操作" :class="['iconfont icon-setting', state.isEdit ? 'active' : '']" @click="onBatch"></i>
    <button v-if="!state.isEdit" @click="openTxt()" :disabled="state.disable">导入</button>

    <i v-if="state.isEdit" :class="['check', state.isAll ? 'active' : '']" @click="onAll()"></i>

    <button v-if="state.isEdit" @click="onDelTxt()">删除记录</button>
    <button v-if="state.isEdit && isElectron()" @click="onDelTxt(true)">删除文件</button>
    <select v-if="!state.isEdit" v-model="state.sortType" @change="updateSort">
      <option v-for="item in sortList" :key="item.value" :value="item.value">
        {{ item.label }}
      </option>
    </select>

    <select v-if="!state.isEdit" v-model="state.showType">
      <option v-for="item in showList" :key="item.value" :value="item.value">
        {{ item.label }}
      </option>
    </select>
    <button v-if="!state.isEdit && isElectron()" @click="onCheckUpdate">
      版本更新<span v-if="downloadPercent">({{ downloadPercent }})</span>
    </button>
  </div>
  <div class="empty-list" @click="openTxt()" v-if="showDataList.length === 0">请选择文件</div>
  <div class="book-list1" v-if="showDataList.length > 0 && state.showType === 'list'">
    <div v-for="item in showDataList" class="book-item1" :key="item.filePath">
      <i
        v-if="state.isEdit"
        :class="['check', state.checkMap[item.filePath] ? 'active' : '']"
        @click.self="onCheckItem(item)"
      ></i>
      <span class="title" @click.self="onReadTxt(item)">{{ item.fileName }}</span>
      <span class="progress">{{ item.currentChapter + 1 }}/{{ item.totalChapter }} </span>
      <i class="iconfont icon-More" @click="onRightItem(item)"></i>
    </div>
  </div>
  <div class="book-list" v-else-if="showDataList.length > 0 && state.showType === 'card'">
    <div class="book-item" v-for="item in showDataList" :key="item.filePath">
      <div class="book-top">
        <i
          v-if="state.isEdit"
          :class="['check', state.checkMap[item.filePath] ? 'active' : '']"
          @click.self="onCheckItem(item)"
        ></i>
      </div>

      <div class="book-cover" @click.self="onReadTxt(item)">
        {{ getTitle(item.fileName) }}
      </div>
      <div class="book-detail" @click="onRightItem(item)">
        <span>{{ item.currentChapter + 1 }}/{{ item.totalChapter }} </span>
        <i class="iconfont icon-More"></i>
      </div>
    </div>
  </div>
  <div class="dialog-bg" v-if="state.isDetail && state.bookItem">
    <div class="blank" @click="state.isDetail = false"></div>
    <div class="dialog-body">
      <div class="chapter-title">{{ state.bookItem.fileName }}</div>
      <div>
        <table class="detail-table">
          <tr v-for="(item, idx) in detailSet" :key="idx">
            <td>{{ item.name }}</td>
            <td>
              {{
                item.idx
                  ? (state.bookItem[item.prop] as number) + 1
                  : item.formatter
                    ? item.formatter(state.bookItem[item.prop])
                    : state.bookItem[item.prop]
              }}
            </td>
          </tr>
          <tr v-if="isElectron()">
            <td>文件路径</td>
            <td>
              <div style="display: flex; flex-wrap: wrap">
                {{ state.bookItem.filePath }}
                <span class="open-text" @click="openPath">打开</span>
              </div>
            </td>
          </tr>
        </table>

        <div class="bottom-action">
          <span @click="onDelOneTxt()">删除记录</span>
          <span @click="onDelOneTxt(true)" v-if="isElectron()">删除文件</span>
        </div>
      </div>
    </div>
  </div>
</template>
