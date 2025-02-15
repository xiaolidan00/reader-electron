<template>
  <div class="book-detail">
    <div class="nav-back">
      <i class="back-icon" @click="onBack()"></i>
      <span class="title">{{ state.title }}</span>
      {{ currentChapter + 1 }} /{{ chapterList.length }}
    </div>

    <div class="book-container" @mousedown.stop="onDown" @mouseup.stop="onPageAction">
      <div class="chapter-title" v-if="chapterList.length && currentIndex == 0">
        {{ chapterList[currentChapter]?.title }}
      </div>
      <div class="book-content" id="contenTxt" v-html="state.showContent"></div>
    </div>
    <div class="book-bottom">
      <i class="book-icon" title="章节目录" @click="state.isMenu = true"></i>
      <i class="listen-icon" title="听书" @click="state.isListen = true"></i>
      <i class="search-icon" title="搜索关键词" @click="state.isSearch = true"></i>
      <i class="setting-icon" title="读书设置" @click="state.isSet = true"></i>
      <i class="save-icon" @click="onSaveTxt" title="另存为带章节目录TXT"></i>
    </div>
  </div>
  <ChapterPage v-model:is-menu="state.isMenu" @item="onChapterItem"></ChapterPage>
  <ListenPage
    ref="listenRef"
    v-model:is-listen="state.isListen"
    :total="state.total"
    @pre="preChapter"
    @next="nextChapter"
    @nextPage="nextPage"
    @index="changeIndex"
  ></ListenPage>
  <SearchPage v-model:is-search="state.isSearch" @item="onSearchItem"></SearchPage>
  <SetPage v-model:is-set="state.isSet"></SetPage>
</template>

<script setup lang="ts">
  import { ref, reactive, nextTick, onBeforeUnmount } from 'vue';
  import type { ChapterType, SearchItemType } from '../../@types';
  import SearchPage from './SearchPage.vue';
  import ChapterPage from './ChapterPage.vue';
  import ListenPage from './ListenPage.vue';
  import SetPage from './SetPage.vue';
  import { PageNum, LineNum } from '../../data';
  import {
    selectBook,
    loading,
    bookItem,
    chapterList,
    setHighlight,
    currentChapter,
    currentIndex
  } from '../config';

  //<InstanceType<typeof ListenPage>>
  const listenRef = ref();
  loading.value = true;

  type StateType = {
    title: string;
    isMenu: boolean;
    isListen: boolean;
    total: number;
    showContent: string;
    detail: string[];
    isSearch: boolean;
    isSet: boolean;
  };
  const state = reactive<StateType>({
    title: bookItem.value!.name,
    isMenu: false,
    detail: [],
    showContent: '',
    total: 0,
    isListen: false,
    isSearch: false,
    isSet: false
  });
  const updateBook = () => {
    window.ipcRenderer.send('readedTxt', {
      id: selectBook.value + '',
      chapter: currentChapter.value,
      index: currentIndex.value,
      total: chapterList.value.length
    });
  };

  const onSearchItem = async ({
    item,
    searchLen,
    searchKey
  }: {
    item: SearchItemType;
    searchLen: number;
    searchKey: string;
  }) => {
    currentIndex.value = item.index;
    currentChapter.value = item.chapter;
    onChapter(item.chapter, 2);

    await nextTick();
    const contenTxt = document.getElementById('contenTxt')!;
    const textNode = contenTxt.firstChild!;
    setHighlight(textNode.textContent!.indexOf(searchKey), textNode, searchLen);
  };
  const onBack = () => {
    updateBook();
    selectBook.value = '';
    bookItem.value = undefined;
    state.isMenu = false;
    state.isListen = false;
    state.isSearch = false;
  };

  const preChapter = () => {
    if (currentChapter.value - 1 >= 0) {
      onChapter(currentChapter.value - 1, 0);
    }
  };
  const nextPage = () => {
    if (currentIndex.value + 1 < state.total) {
      currentIndex.value++;
      changeIndex();
    } else if (currentChapter.value < chapterList.value.length) {
      onChapter(currentChapter.value + 1, 0);
    }
  };
  const prePage = () => {
    if (currentIndex.value - 1 >= 0) {
      currentIndex.value--;
      changeIndex();
    } else if (currentChapter.value - 1 >= 0) {
      onChapter(currentChapter.value - 1, 1);
    }
  };
  let isMove = 0;
  const onDown = (event: MouseEvent) => {
    isMove = event.pageX;
  };

  const onPageAction = (event: MouseEvent) => {
    const x = event.pageX;
    if (Math.abs(isMove - x) <= 10) {
      const w = window.innerWidth;
      if (x >= 0 && x <= w * 0.5) {
        prePage();
      } else {
        nextPage();
      }
      // else {
      //   state.isMenu = true;
      // }
    }
    isMove = 0;
  };
  const changeIndex = () => {
    getPage();

    listenRef.value!.onSpeak();
  };
  const nextChapter = () => {
    if (currentChapter.value < chapterList.value.length) {
      onChapter(currentChapter.value + 1, 0);
    }
  };
  let titleLine = 0;
  const getPage = () => {
    const a = currentIndex.value * PageNum - titleLine;
    const b = (currentIndex.value + 1) * PageNum - titleLine;
    state.showContent = state.detail.slice(a < 0 ? 0 : a, b).join('');
  };

  const onChapter = (i: number, type: 0 | 1 | 2) => {
    if (type !== 2) currentChapter.value = i;
    if (currentChapter.value > chapterList.value.length) {
      currentChapter.value = chapterList.value.length - 1;
    }
    state.isMenu = false;
    const t: ChapterType = chapterList.value[currentChapter.value];
    titleLine = Math.ceil(t.title.length / LineNum);

    state.detail = t.content;
    state.total = Math.ceil((t.content.length + titleLine) / PageNum);
    if (type === 1) {
      currentIndex.value = state.total - 1;
    } else if (type === 2) {
      if (currentIndex.value >= 0 && currentIndex.value < state.total) {
      } else {
        currentIndex.value = 0;
      }
    } else {
      currentIndex.value = 0;
    }
    changeIndex();
  };
  const onChapterItem = (idx: number) => {
    onChapter(idx, 0);
  };
  window.ipcRenderer.send('getTxt', selectBook.value);
  let isFirst = true;
  const onReadTxt = (_event: any, data: ChapterType[]) => {
    if (isFirst) {
      currentChapter.value = bookItem.value!.chapter;
      currentIndex.value = bookItem.value!.index;
      isFirst = false;
    }
    console.log('readTxt');
    if (data.length) {
      chapterList.value = data;
    } else {
      alert('章节解析失败');
      loading.value = false;
      return;
    }

    onChapter(currentChapter.value, 2);
    loading.value = false;
  };
  const onSaveTxt = () => {
    const fileName = bookItem.value!.name + '（带章节目录）.txt';
    let txt = '';
    chapterList.value.forEach((it: ChapterType, i: number) => {
      txt += `第${i + 1}章 ` + it.title + '\n';
      txt += it.content.join('');
    });
    const file = new File([txt], fileName, { type: 'text/plain' });

    const dom = document.createElement('a');
    dom.download = fileName;
    dom.href = window.URL.createObjectURL(file);
    document.body.appendChild(dom);
    dom.click();
  };
  updateBook();
  window.ipcRenderer.on('readTxt', onReadTxt);
  onBeforeUnmount(() => {
    window.ipcRenderer.off('readTxt', onReadTxt);
  });
  window.ipcRenderer.send('currentPage', 'book');

  window.ipcRenderer.once('closeBook', () => {
    window.ipcRenderer.send('closedBook', {
      id: selectBook.value + '',
      chapter: currentChapter.value,
      index: currentIndex.value,
      total: chapterList.value.length
    });
  });
</script>

<style scoped lang="scss">
  .book-detail {
    height: 100%;
    display: flex;
    background-color: var(--bg);
    flex-direction: column;
  }

  .book-container {
    height: calc(100% - 90px);
    text-align: left;
    line-height: 1.5;
    font-size: var(--fontSize);
  }
  .book-content {
    height: 100%;

    padding: 10px;
    overflow: hidden;
    white-space: pre-wrap;
  }
  .book-bottom {
    border-top: solid 1px rgba(0, 0, 0, 0.1);
    height: 40px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    i {
      cursor: pointer;
      height: 20px;
      width: 20px;
      &:not(:last-child) {
        margin-right: 20px;
      }
    }
  }

  .nav-back {
    border-bottom: solid 1px rgba(0, 0, 0, 0.1);
    height: 50px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    font-size: 16px;
    .title {
      display: inline-block;
      width: calc(100% - 100px);
      overflow: hidden;

      white-space: nowrap;

      font-weight: bold;
      text-align: center;
    }
    .back-icon {
      height: 20px;
      width: 20px;
      cursor: pointer;
    }
  }
</style>
