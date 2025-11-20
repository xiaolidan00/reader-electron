<script setup lang="ts">
  import {reactive, computed, onMounted, onBeforeUnmount} from "vue";
  import {selectBook, dataList, bookItem, listSearchKey} from "../config.ts";
  import {BookType} from "../@types";
  import Controller, {fileMap, getData} from "../controllers/Controller.ts";
  import {isElectron} from "../utils/utils.ts";

  const formatNum = (v: number) => {
    return new Intl.NumberFormat().format(v);
  };
  const detailSet = computed(() => {
    const list: Array<{name: string; prop: keyof BookType; idx?: boolean; formatter?: Function}> = [
      {name: "共有章节", prop: "total", formatter: formatNum},
      {name: "当前章节", prop: "chapter", idx: true},
      {
        name: "共有字数",
        prop: "num",
        formatter: formatNum
      },
      {
        name: "文件大小",
        prop: "size",
        formatter: formatNum
      },
      {name: "最近阅读", prop: "updateTime"}
    ];
    if (isElectron()) {
      list.push({
        name: "文件路径",
        prop: "path"
      });
    }

    return list;
  });

  type StateType = {
    isEdit: boolean;
    checkMap: {[n: string]: boolean};
    isAll: boolean;
    disable: boolean;
    isDetail: boolean;
  };
  const state = reactive<StateType>({
    isEdit: false,
    checkMap: {},
    isAll: false,
    disable: false,
    isDetail: false
  });
  const showDataList = computed(() => {
    const list = dataList.value;
    if (listSearchKey.value) {
      return list.filter((it) => it.name.indexOf(listSearchKey.value) >= 0);
    }
    return list;
  });
  const openTxt = async () => {
    state.disable = true;

    await Controller.openTxt();
    state.disable = false;
  };
  const onRightItem = (item: BookType) => {
    state.isDetail = true;
    bookItem.value = item;
  };
  const onReadTxt = (item: BookType) => {
    if (state.isEdit) {
      onCheckItem(item);
    } else {
      if (!isElectron() && !fileMap[item.id]) return alert("请选择文件");
      selectBook.value = item.id;
      bookItem.value = item;
    }
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
  const onDelOneTxt = (isFile?: boolean) => {
    Controller.delTxt({[bookItem.value!.id]: true}, isFile);
    state.checkMap = {};
    state.isDetail = false;
    state.isEdit = false;
  };
  const onAll = () => {
    state.isAll = !state.isAll;
    if (state.isAll) {
      for (let k in state.checkMap) {
        state.checkMap[k] = true;
      }
    } else {
      state.checkMap = {};
    }
  };
  const onCheckItem = (item: BookType) => {
    state.checkMap[item.id] = !state.checkMap[item.id];
    console.log(state.checkMap);
    let count = 0;
    for (let k in state.checkMap) {
      if (state.checkMap[k]) count++;
    }
    if (count === Object.keys(state.checkMap).length) {
      state.isAll = true;
    } else if (count === 0) {
      state.isAll = false;
    }
  };

  const onBatch = () => {
    state.isEdit = !state.isEdit;
    const orginMap: Record<string, boolean> = {};
    dataList.value.forEach((a) => {
      orginMap[a.id] = false;
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
  onMounted(() => {
    getData();
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDropFile);
  });
  onBeforeUnmount(() => {
    document.removeEventListener("dragover", onDragOver);
    document.removeEventListener("drop", onDropFile);
  });
</script>

<template>
  <div class="search-box">
    <div class="search">
      <input placeholder="搜索关键词" type="text" v-model="listSearchKey" />
      <i class="close-icon" @click="listSearchKey = ''" v-show="listSearchKey"></i>
    </div>
    <!-- <i class="more-icon"></i> -->
  </div>
  <div class="tool-bar">
    <button @click="openTxt()" :disabled="state.disable">导入TXT</button>
    <i v-if="state.isEdit" :class="['check', state.isAll ? 'active' : '']" @click="onAll()"></i>
    <button :class="[state.isEdit ? 'active' : '']" @click="onBatch">批量操作</button>
    <button v-if="state.isEdit" @click="onDelTxt()">删除记录</button>
    <button v-if="state.isEdit && isElectron()" @click="onDelTxt(true)">删除文件</button>
  </div>
  <div class="book-list">
    <div class="book-item" v-for="item in showDataList" :key="item.name">
      <div class="book-top">
        <i
          v-if="state.isEdit"
          :class="['check', state.checkMap[item.id] ? 'active' : '']"
          @click.self="onCheckItem(item)"
        ></i>
      </div>

      <div class="book-cover" @click.self="onReadTxt(item)">
        {{ getTitle(item.name) }}
      </div>
      <div class="book-detail" @click="onRightItem(item)">
        <span>{{ item.chapter + 1 }}/{{ item.total }} </span>
        <i class="more-icon"></i>
      </div>
    </div>
  </div>
  <div class="dialog-bg" v-if="state.isDetail && bookItem">
    <div class="blank" @click="state.isDetail = false"></div>
    <div class="dialog-body">
      <div class="chapter-title">{{ bookItem.name }}</div>
      <div>
        <table class="detail-table">
          <tr v-for="(item, idx) in detailSet" :key="idx">
            <td>{{ item.name }}</td>
            <td>{{ item.idx ? (bookItem[item.prop] as number) + 1 : bookItem[item.prop] }}</td>
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
