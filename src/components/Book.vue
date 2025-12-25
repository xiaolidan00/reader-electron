<template>
  <div class="book-detail">
    <div class="nav-back">
      <i class="iconfont icon-arrow back-icon" @click="onBack()"></i>
      <span class="title">{{ state.title }}</span>
      <span class="num"> {{ currentChapter + 1 }} /{{ chapterList.length }}</span>
    </div>

    <div class="book-container" ref="bookContainer" id="bookContainer" @click="onClickPage">
      <div
        class="chapter-title"
        id="titleTxt"
        v-if="chapterList.length && currentIndex == 0 && chapterList[currentChapter]"
      >
        {{ chapterList[currentChapter].title }}
      </div>
      <div class="book-content" id="contenTxt" v-html="state.showContent"></div>
    </div>
    <div class="book-bottom">
      <i class="iconfont icon-menu" title="章节目录" @click="state.isMenu = true"></i>
      <i
        :class="['iconfont icon-listen', isPlay ? 'active' : '']"
        title="听书"
        @click="state.isListen = true"
      ></i>
      <i class="iconfont icon-search" title="搜索关键词" @click="state.isSearch = true"></i>
      <i class="iconfont icon-setting" title="读书设置" @click="state.isSet = true"></i>
      <i class="iconfont icon-save" @click="onSaveTxt()" title="另存为带章节目录TXT"></i>
      <i
        :class="['iconfont icon-cursor', state.isClick ? 'active' : '']"
        title="启用/禁用点击换页"
        @click="state.isClick = !state.isClick"
      ></i>
      <i title="复制当前页内容" class="iconfont icon-fuzhi" @click="onCopyText"></i>
    </div>
  </div>
  <ChapterPage v-model:is-menu="state.isMenu" @item="onChapterItem"></ChapterPage>
  <ListenPage
    v-model:is-listen="state.isListen"
    @preChapter="preChapter"
    @nextChapter="nextChapter"
    @prePage="prePage"
    @nextPage="nextPage"
    @index="changeIndex"
  ></ListenPage>
  <SearchPage v-model:is-search="state.isSearch" @item="onSearchItem"></SearchPage>
  <SetPage v-model:is-set="state.isSet" @exportTxt="onSaveTxt" @changeStyle="updateStyle"></SetPage>
</template>

<script setup lang="ts">
  import { ref, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
  import type { ChapterType, SearchItemType } from '../@types';
  import SearchPage from './SearchPage.vue';
  import ChapterPage from './ChapterPage.vue';
  import ListenPage from './ListenPage.vue';
  import SetPage from './SetPage.vue';

  import {
    selectBook,
    LineNum,
    PageNum,
    loading,
    bookItem,
    chapterList,
    setHighlight,
    currentChapter,
    currentIndex,
    isPlay,
    bookStyle,
    bookState as state,
    defaultBookState,
    stopSpeak,
    startSpeak
  } from '../config.ts';
  import Controller from '../controllers/Controller.ts';
  import { EventBus } from '../utils/EventEmitter.ts';
  import { isMobile } from '../utils/utils.ts';
  import { cloneDeep, debounce } from 'lodash-es';

  const bookContainer = ref<HTMLDivElement>();
  loading.value = true;

  const updateBook = async () => {
    await Controller.saveBook(
      selectBook.value + '',
      currentChapter.value,
      currentIndex.value,
      chapterList.value.length
    );
  };

  const onCopyText = () => {
    const dom = document.getElementById('bookContainer');
    if (dom) {
      navigator.clipboard.writeText(dom.innerText);

      alert('复制成功');
    }
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
    const textNode = contenTxt.firstChild;
    if (textNode) setHighlight(textNode.textContent!.indexOf(searchKey), textNode, searchLen);
  };

  const onBack = () => {
    updateBook();
    selectBook.value = '';
    bookItem.value = undefined;
    currentChapter.value = 0;
    currentIndex.value = 0;
    chapterList.value = [];
    state.value = cloneDeep(defaultBookState);
    loading.value = false;
  };

  const preChapter = () => {
    if (currentChapter.value - 1 >= 0) {
      onChapter(currentChapter.value - 1, 0);
    }
  };
  const nextPage = debounce(() => {
    if (currentIndex.value + 1 < state.value.total) {
      currentIndex.value++;
      changeIndex();
    } else if (currentChapter.value + 1 < chapterList.value.length) {
      onChapter(currentChapter.value + 1, 0);
    }
  }, 100);
  const prePage = debounce(() => {
    if (currentIndex.value - 1 >= 0) {
      currentIndex.value--;
      changeIndex();
    } else if (currentChapter.value - 1 >= 0) {
      onChapter(currentChapter.value - 1, 1);
    }
  }, 100);

  const onClickPage = (event: MouseEvent) => {
    if (!state.value.isClick) return;
    if (!isMobile()) {
      const x = event.pageX;
      const w = window.innerWidth;
      const p = Math.round((100 * x) / w);

      if (p >= 0 && p <= 50) {
        prePage();
      } else if (p > 50 && p <= 100) {
        nextPage();
      }
    }
  };
  watch(
    () => isPlay.value,
    (val) => {
      console.log('isPlay.value', val);
    }
  );
  const changeIndex = async () => {
    getPage();
    await nextTick();
    startSpeak();
  };
  const nextChapter = () => {
    if (currentChapter.value < chapterList.value.length) {
      onChapter(currentChapter.value + 1, 0);
    }
  };
  let titleLine = 0;
  const getPage = () => {
    const a = currentIndex.value * PageNum.value - titleLine;
    const b = (currentIndex.value + 1) * PageNum.value - titleLine;
    state.value.showContent = state.value.detail.slice(a < 0 ? 0 : a, b).join('');
  };

  const onChapter = (i: number, type: 0 | 1 | 2) => {
    if (type !== 2) currentChapter.value = i;
    if (currentChapter.value > chapterList.value.length) {
      currentChapter.value = chapterList.value.length - 1;
    }
    // state.isMenu = false;
    const t: ChapterType = chapterList.value[currentChapter.value];
    titleLine = Math.ceil(t.title.length / LineNum.value);

    state.value.detail = t.content as string[];
    state.value.total = Math.ceil((t.content.length + titleLine) / PageNum.value);
    if (type === 1) {
      currentIndex.value = state.value.total - 1;
    } else if (type === 2) {
      if (currentIndex.value >= 0 && currentIndex.value < state.value.total) {
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
    state.value.isMenu = false;
  };

  let isFirst = true;
  const onReadTxt = (data: ChapterType[]) => {
    if (isFirst && bookItem.value) {
      state.value.title = bookItem.value!.name;
      currentChapter.value = bookItem.value.chapter;
      currentIndex.value = bookItem.value.index;
      console.log('chapter', currentChapter.value, 'index', currentIndex.value);
      isFirst = false;
    }

    if (data.length) {
      chapterList.value = data;
    } else {
      alert('章节解析失败');

      onBack();
      return;
    }

    onChapter(currentChapter.value, 2);
    loading.value = false;
  };
  const onSaveTxt = (op?: { start: number; end: number }) => {
    const start = op?.start || 0;
    const end = op?.end || chapterList.value.length;
    const fileName = bookItem.value!.name + `（带章节目录）${op ? start + '-' + end : ''}.txt`;
    let txt = '';
    // const t0 = chapterList.value[0];
    // txt += t0.title + "\n";
    // txt += t0.content.join("") + "\n";
    if (start >= 1) {
      txt += bookItem.value!.name + '\n';
    }
    for (let i = start; i < end; i++) {
      const it = chapterList.value[i];
      let t = it.title;
      if (/\s*第\s*[0-9]+\s*章/.test(t)) {
        t = t.replace(/\s*第\s*[0-9]+\s*章/g, '');
      }
      txt += `第${i}章 ` + t + '\n';
      txt += it.content.join('') + '\n';
    }
    const file = new File([txt], fileName, { type: 'text/plain' });
    const dom = document.createElement('a');
    dom.download = fileName;
    dom.href = window.URL.createObjectURL(file);
    document.body.appendChild(dom);
    dom.click();
  };

  const updateStyle = () => {
    const container = document.getElementById('bookContainer')!;
    const fontSize = bookStyle.fontSize * bookStyle.lineHeight;
    LineNum.value = Math.floor((container.offsetWidth - 20) / bookStyle.fontSize);
    PageNum.value = Math.floor((container.offsetHeight - 20) / fontSize);

    document.documentElement.style.setProperty('--font', bookStyle.fontColor);
    document.documentElement.style.setProperty('--bg', bookStyle.bg);
    document.documentElement.style.setProperty('--font-size', bookStyle.fontSize + 'px');
    document.documentElement.style.setProperty('--line-height', bookStyle.lineHeight + '');
    Controller.readTxt();
  };
  const onUnload = async () => {
    await updateBook();
  };
  const mobilePos = {
    x: 0,

    offsetX: 0
  };
  const onMouseDown = (ev: TouchEvent) => {
    if (!state.value.isClick) return;
    // console.log("🚀 ~ Book.vue ~ onMouseDown ~ ev:", ev.targetTouches[0]);
    // mobilePos.x = ev.pageX;
    mobilePos.x = ev.targetTouches[0].clientX;
    ev.preventDefault();
    ev.stopPropagation();
  };
  const onMouseMove = (ev: TouchEvent) => {
    if (!state.value.isClick) return;
    // console.log("🚀 ~ Book.vue ~ onMouseMove ~ ev:", ev.targetTouches[0]);
    // const x = ev.pageX;
    const x = ev.targetTouches[0].clientX;
    mobilePos.offsetX += x - mobilePos.x;

    mobilePos.x = x;
    ev.preventDefault();
    ev.stopPropagation();
  };
  const onMouseUp = (ev: TouchEvent) => {
    if (!state.value.isClick) return;
    // console.log("🚀 ~ Book.vue ~ onMouseUp ~ ev:", mobilePos.offsetX, mobilePos.x);
    if (Math.abs(mobilePos.offsetX) > 10) {
      if (mobilePos.offsetX < -10) {
        nextPage();
      } else if (mobilePos.offsetX > 10) {
        prePage();
      }
    } else {
      const x = mobilePos.x;
      const w = window.innerWidth;
      const p = Math.round((100 * x) / w);

      if (p >= 0 && p <= 50) {
        prePage();
      } else if (p > 50 && p <= 100) {
        nextPage();
      }
    }
    ev.preventDefault();
    ev.stopPropagation();
  };

  const onKeyup = debounce((ev: KeyboardEvent) => {
    if (ev.key === 'ArrowRight') {
      nextPage();
    } else if (ev.key === 'ArrowLeft') {
      prePage();
    } else if (ev.code === 'Space') {
      isPlay.value = !isPlay.value;
      if (isPlay.value) {
        startSpeak();
      } else {
        stopSpeak();
      }
    }
  }, 100);
  onMounted(() => {
    window.history.pushState(null, 'book', document.URL);
    window.addEventListener('popstate', onBack, false);

    updateStyle();
    EventBus.on('readTxt', onReadTxt);
    EventBus.on('backTxt', onBack);
    EventBus.on('nextPage', nextPage);
    window.onunload = onUnload;
    if (isMobile()) {
      const dom = bookContainer.value!;
      dom.addEventListener('touchstart', onMouseDown, { passive: false });
      dom.addEventListener('touchmove', onMouseMove, { passive: false });
      dom.addEventListener('touchend', onMouseUp, { passive: false });
      window.ontouchstart = null;
      window.ontouchmove = null;
      window.ontouchend = null;
      document.body.ontouchstart = null;
      document.body.ontouchmove = null;
      document.body.ontouchend = null;
    }
    document.body.addEventListener('keyup', onKeyup);
    navigator.mediaDevices.addEventListener('devicechange', stopSpeak);
  });

  onBeforeUnmount(async () => {
    if (isMobile()) {
      const dom = bookContainer.value!;
      dom.removeEventListener('touchstart', onMouseDown);
      dom.removeEventListener('touchmove', onMouseMove);
      dom.removeEventListener('touchend', onMouseUp);
    }
    document.body.removeEventListener('keyup', onKeyup);
    await updateBook();
    window.removeEventListener('popstate', onBack, false);

    EventBus.off('readTxt', onReadTxt);
    EventBus.off('backTxt', onBack);
    EventBus.off('nextPage', nextPage);
    Controller.saveBook(
      selectBook.value + '',
      currentChapter.value,
      currentIndex.value,
      chapterList.value.length
    );
    stopSpeak();
    navigator.mediaDevices.removeEventListener('devicechange', stopSpeak);
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
    line-height: var(--line-height);
    font-size: var(--font-size);
  }
  .book-content {
    height: 100%;

    padding: 10px;
    overflow: hidden;
    white-space: pre-wrap;
    pointer-events: none;
  }
  .book-bottom {
    border-top: solid 1px rgba(0, 0, 0, 0.1);
    height: 40px;
    background-color: antiquewhite;
    display: flex;
    align-items: center;
    padding: 0 10px;
    gap: 20px;
    i {
      cursor: pointer;
      font-size: 20px;

      &.active,
      &:hover {
        color: dodgerblue;
      }
    }
  }

  .nav-back {
    border-bottom: solid 1px rgba(0, 0, 0, 0.1);
    height: 50px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    .num {
      font-size: 12px;
    }
    .title {
      display: inline-block;

      overflow: hidden;
      font-size: 16px;
      white-space: nowrap;
      flex: 1;
      font-weight: bold;
      text-align: center;
      text-overflow: ellipsis;
    }
    .back-icon {
      font-size: 20px;
      cursor: pointer;
      transform: rotate(180deg);
    }
  }
</style>
