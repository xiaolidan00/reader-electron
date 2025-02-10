<template>
  <div class="book-detail">
    <div class="nav-back">
      <i class="back-icon"></i>
      <span class="title">{{ state.title }}</span>
      {{ state.index + 1 }} /{{ chapterList.length }}
    </div>

    <div class="book-container">
      <div class="book-content">
        <div v-for="it in state.showContent" :key="it" v-html="it"></div>
      </div>
      <div class="slide">
        <div class="left" @click="prePage()"></div>
        <div class="mid" @click="state.isMenu = true"></div>
        <div class="right" @click="nextPage()"></div>
      </div>
    </div>
    <div class="book-bottom">
      <i class="book-icon" @click="state.isMenu = true"></i>
    </div>
  </div>
  <div class="book-nav" v-if="state.isMenu">
    <div class="nav-list">
      <div
        :class="['nav-item', state.index == idx ? 'active' : '']"
        v-for="(item, idx) in chapterList"
        :key="item.title"
        @click="onChapter(idx)"
      >
        {{ item.title }}
      </div>
    </div>
    <div class="blank" @click="state.isMenu = false"></div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onBeforeMount, reactive, nextTick } from 'vue';
  import type { ChapterType } from '../../@types';
  import { selectBook, bookItem } from '../config';
  const PageNum = 18;
  const state = reactive({
    title: bookItem.value!.name,
    isMenu: false,
    chapter: 0,
    index: 0,
    detail: [],
    showContent: [],
    total: 0
  });

  const chapterList = ref<ChapterType[]>([]);

  const nextPage = () => {
    if (state.index + 1 < state.total) {
      state.index++;
      getPage();
    } else if (state.chapter < chapterList.value.length) {
      onChapter(state.chapter + 1, 0);
    }
  };
  const prePage = () => {
    if (state.index - 1 >= 0) {
      state.index--;
      getPage();
    } else if (state.chapter - 1 >= 0) {
      onChapter(state.chapter - 1, 1);
    }
  };
  const getPage = () => {
    const a = state.index * PageNum;
    const b = (state.index + 1) * PageNum;
    state.showContent = state.detail.slice(a, b);
  };
  const onChapter = (i: number, type: 0 | 1) => {
    state.chapter = i;

    state.isMenu = false;

    const t: ChapterType = chapterList.value[state.chapter];

    state.detail = t.content;
    state.total = Math.ceil(t.content.length / PageNum);
    if (type === 1) {
      state.index = state.total - 1;
    } else {
      state.index = 0;
    }
    getPage();
  };
  window.ipcRenderer.send('getTxt', selectBook.value);
  const onReadTxt = (_event, data) => {
    console.log(data);
    chapterList.value = data;
    onChapter(0, 0);
  };
  window.ipcRenderer.on('readTxt', onReadTxt);
  onBeforeMount(() => {
    window.ipcRenderer.off('readTxt', onReadTxt);
  });
</script>
<style>
  .chapter-title {
    font-weight: bold;
    text-align: center;
    white-space: wrap;
  }
</style>
<style scoped lang="scss">
  .book-detail {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .slide {
    height: calc(100% - 90px);
    width: 100%;
    position: fixed;
    top: 50px;
    bottom: 40px;
    display: flex;
    .mid {
      width: 10%;
      height: 100%;
      display: inline-block;
    }
    .left,
    .right {
      flex: 1;
      height: 100%;
      display: inline-block;
    }
  }
  .book-container {
    height: calc(100% - 90px);
  }
  .book-content {
    height: 100%;
    line-height: 32px;
    font-size: 18px;
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
    .book-icon {
      height: 20px;
      width: 20px;
    }
  }
  .book-nav {
    height: 100%;
    position: fixed;
    left: 0px;
    top: 0px;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    .blank {
      width: 20%;
      height: 100%;
      display: inline-block;
    }
  }
  .nav-list {
    display: inline-block;
    background-color: var(--bg);
    width: 80%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    &::-webkit-scrollbar {
      background-color: transparent;
      height: 10px;
      width: 10px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: #ccc;
    }
  }
  .nav-item {
    height: 40px;
    line-height: 40px;
    font-size: 14px;
    padding: 0 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    &:not(:last-child) {
      border-bottom: solid 1px rgba(0, 0, 0, 0.05);
    }
    &.active {
      color: dodgerblue;
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
      flex: 1;
      font-weight: bold;
      text-align: center;
    }
    .back-icon {
      height: 20px;
      width: 20px;
    }
  }
</style>
