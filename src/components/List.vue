<script setup lang="ts">
  import { reactive, onBeforeUnmount, computed, onMounted } from 'vue';
  import { selectBook, dataList, bookItem, loading, listSearchKey } from '../config';
  import { BookType } from '../../@types';
  import { cloneDeep } from 'lodash-es';

  const detailSet: Array<{ name: string; prop: keyof BookType; idx?: boolean }> = [
    { name: '文件路径', prop: 'path' },
    { name: '共有章节', prop: 'total' },
    { name: '当前章节', prop: 'chapter', idx: true }

    // { name: '最近阅读', prop: 'readTime'  }
  ];
  let orginMap: { [n: string]: boolean } = {};
  type StateType = {
    isEdit: boolean;
    checkMap: { [n: string]: boolean };
    isAll: boolean;

    isDetail: boolean;
  };
  const state = reactive<StateType>({
    isEdit: false,
    checkMap: {},
    isAll: false,

    isDetail: false
  });
  const showDataList = computed(() => {
    const list = dataList.value;
    if (listSearchKey.value) {
      return list.filter((it) => it.name.indexOf(listSearchKey.value) >= 0);
    }
    return list;
  });
  const openTxt = () => {
    window.ipcRenderer.send('openTxt');
  };
  const onRightItem = (item: BookType) => {
    state.isDetail = true;
    bookItem.value = item;
  };
  const onReadTxt = (item: BookType) => {
    selectBook.value = item.id;
    bookItem.value = item;
  };
  const onDelTxt = (type: 'record' | 'file') => {
    let tag = false;
    for (let k in state.checkMap) {
      if (state.checkMap[k]) {
        tag = true;
        break;
      }
    }
    if (tag) window.ipcRenderer.send('delTxt', { map: cloneDeep(state.checkMap), type });

    state.checkMap = cloneDeep(orginMap);
    state.isEdit = false;
  };
  const onAll = () => {
    state.isAll = !state.isAll;
    if (state.isAll) {
      for (let k in state.checkMap) {
        state.checkMap[k] = true;
      }
    } else {
      state.checkMap = cloneDeep(orginMap);
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

  let isLock = false;
  const refreshTxt = (_event: any, data: any) => {
    if (isLock) return;
    isLock = true;
    console.log('refreshTxt');
    dataList.value = data;
    orginMap = {};
    data.forEach((a: BookType) => {
      orginMap[a.id] = false;
    });
    state.checkMap = cloneDeep(orginMap);
    loading.value = false;
    setTimeout(() => {
      isLock = false;
    }, 1000);
  };
  window.ipcRenderer.on('listTxt', refreshTxt);
  window.ipcRenderer.send('currentPage', 'list');
  const onDragOver = (ev: DragEvent) => {
    ev.preventDefault();
  };
  const onDropFile = (ev: DragEvent) => {
    ev.preventDefault();
    let fileList: string[] = [];
    if (ev.dataTransfer?.items?.length) {
      const items = ev.dataTransfer.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type === 'file') {
          const f = item.getAsFile()!;
          if (f.name.endsWith('.txt')) fileList.push(f.path);
        }
      }
    }

    if (fileList.length === 0 && ev.dataTransfer?.files?.length) {
      fileList = Array.from(ev.dataTransfer.files)
        .filter((it) => it.name.endsWith('.txt'))
        .map((it) => it.path);
    }
    if (fileList.length) {
      window.ipcRenderer.send('dragTxt', fileList);
    }
  };
  const onBatch = () => {
    state.isEdit = !state.isEdit;
    state.checkMap = cloneDeep(orginMap);
  };
  const getTitle = (t: string) => {
    return t.replace(/[,，！!、]/g, '').substring(0, 25);
  };
  onMounted(() => {
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDropFile);
  });
  onBeforeUnmount(() => {
    window.ipcRenderer.off('listTxt', refreshTxt);
    document.removeEventListener('dragover', onDragOver);
    document.removeEventListener('drop', onDropFile);
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
    <span @click="openTxt()">导入TXT</span>
    <i v-if="state.isEdit" :class="['check', state.isAll ? 'active' : '']" @click="onAll()"></i>
    <span :class="[state.isEdit ? 'active' : '']" @click="onBatch">批量操作</span>
    <span v-if="state.isEdit" @click="onDelTxt('record')">删除记录</span>
    <span v-if="state.isEdit" @click="onDelTxt('file')">删除文件</span>
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
        <table>
          <tr v-for="(item, idx) in detailSet" :key="idx">
            <td>{{ item.name }}</td>
            <td>{{ item.idx ? (bookItem[item.prop] as number) + 1 : bookItem[item.prop] }}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .dialog-bg {
    position: fixed;
    left: 0px;
    top: 0px;
    background-color: rgba(0, 0, 0, 0.5);
    width: 100%;
    height: 100%;
    z-index: 3;
    .blank {
      height: 10%;
    }
    .dialog-body {
      height: 90%;
      line-height: 40px;
      border-radius: 10px 10px 0 0;
      background-color: white;
      padding: 20px;
      td {
        border-top: solid 1px var(--border);
      }
    }
  }
  .check {
    height: 16px;
    width: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.5);
    border: solid 2px rgba(255, 255, 255, 1);
    border-radius: 4px;
    &.active {
      background-color: skyblue;
      border: solid 2px skyblue;
      content: url(/check.svg);
    }
  }

  .tool-bar {
    height: 30px;
    padding: 0 10px;
    cursor: pointer;
    & > span {
      height: 30px;
      line-height: 30px;
      display: inline-block;
      padding: 0;
      font-size: 16px;
      padding: 0 20px;

      &.active {
        color: sk;
      }
    }
  }
  .book-list {
    padding: 10px;
    display: grid;
    grid-row-gap: 10px;
    grid-column-gap: 10px;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    height: calc(100% - 80px);
    background-color: var(--bg);
    overflow: hidden auto;
  }
  .book-item {
    display: inline-block;
    background-color: dodgerblue;
    border-radius: 10px;
    box-shadow: 0 0 10px #ccc;
    text-align: center;
    padding: 5px;

    &:hover {
      transform: scale(1.1);
    }
    .book-top {
      text-align: left;
      height: 16px;
    }

    .book-cover {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 120px;
      width: 100%;
      color: white;
      font-weight: bold;
      font-size: 16px;
      overflow: hidden;
      word-break: break-all;

      cursor: pointer;
    }
    .book-detail {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      display: flex;
      height: 24px;
      align-items: center;

      > span {
        text-align: left;
        display: inline-block;
        flex: 1;
      }
      i {
        height: 16px;
        width: 16px;
        opacity: 0.5;
        cursor: pointer;
      }
    }
  }
</style>
