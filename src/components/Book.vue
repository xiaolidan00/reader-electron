<template>
  <div class="book-detail">
    <div class="nav-back">
      <i class="iconfont icon-arrow back-icon" @click="onBack()"></i>
      <span class="title">{{ state.title }}</span>
      <span class="num"> {{ state.currentChapter + 1 }} /{{ state.chapterList.length }}</span>
    </div>

    <div class="book-container" ref="bookContainer" id="bookContainer" @click="onClickPage">
      <div
        class="chapter-title"
        id="titleTxt"
        v-if="state.chapterList.length && state.currentIndex == 0 && state.chapterList[state.currentChapter]"
      >
        {{ state.chapterList[state.currentChapter].title }}
      </div>
      <div class="book-content" id="contenTxt" v-html="state.showContent"></div>
    </div>
    <div class="book-bottom">
      <i class="iconfont icon-menu" title="章节目录" @click="state.isMenu = true"></i>
      <i
        :class="['iconfont icon-listen', state.isPlay ? 'active' : '']"
        title="听书"
        @click="state.isListen = true"
      ></i>
      <i :class="['iconfont', state.isPlay ? 'icon-pause' : 'icon-play']" title="朗读" @click="onPlay()"></i>
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
  <ChapterPage @item="onChapterItem"></ChapterPage>
  <ListenPage
    :tts="ttsUtil"
    :onPlay="onPlay"
    @preChapter="preChapter"
    @nextChapter="nextChapter"
    @prePage="prePage"
    @nextPage="nextPage"
    @index="changeIndex"
  ></ListenPage>
  <SearchPage @item="onSearchItem"></SearchPage>
  <SetPage @exportTxt="onSaveTxt" @changeStyle="updateStyle"></SetPage>
</template>

<script setup lang="ts">
  import {ref, nextTick, onBeforeUnmount, onMounted, watch, reactive, provide, inject} from "vue";
  import type {AppStoreType, BookStoreType, ChapterType, SearchItemType} from "../@types";
  import SearchPage from "./SearchPage.vue";
  import ChapterPage from "./ChapterPage.vue";
  import ListenPage from "./ListenPage.vue";
  import SetPage from "./SetPage.vue";

  import Controller from "../controllers/Controller.ts";
  import {useEventBus} from "../utils/EventEmitter.ts";
  import {isMobile} from "../utils/utils.ts";
  import {debounce} from "lodash-es";
  import {TTSUtuil} from "../utils/ttsUtil.ts";
  import {setHighlight} from "../utils/highlight.ts";
  const ttsUtil = new TTSUtuil("titleTxt", "contenTxt");
  const appStore = inject<AppStoreType>("AppStore")!;
  const state = reactive<BookStoreType>({
    speed: Number(localStorage.getItem("speed")) || 1,
    title: "",
    isMenu: false,
    detail: [],
    showContent: "",
    total: 0,
    isPlay: false,
    isListen: false,
    isSearch: false,
    isSet: false,
    isClick: true,
    currentChapter: 0,
    currentIndex: 0,
    LineNum: 20,
    PageNum: 20,

    fontSize: Number(localStorage.getItem("fontSize")) || 18,
    lineHeight: Number(localStorage.getItem("lineHeight")) || 2,
    fontColor: localStorage.getItem("fontColor") || "#505050",
    bg: localStorage.getItem("bg") || "#faebd7",
    chapterList: [],

    regexType: -1,
    regex: "",
    startChapter: 1,
    endChapter: 100,
    encode: "UTF-8"
  });
  provide("BookStore", state);

  const bookContainer = ref<HTMLDivElement>();
  appStore.loading = true;


    const onPlay = async () => {
    state.isPlay = !state.isPlay;
    if (state.isPlay) {
      await ttsUtil.play();
    } else {
      ttsUtil.stop();
    }
  };

  const updateBook = async () => {
    await Controller.saveBook(
      appStore.selectBook + "",
      state.currentChapter,
      state.currentIndex,
      state.chapterList.length
    );
  };

  const onCopyText = () => {
    const dom = document.getElementById("bookContainer");
    if (dom) {
      navigator.clipboard.writeText(dom.innerText);

      alert("复制成功");
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
    state.currentIndex = item.index;
    state.currentChapter = item.chapter;
    onChapter(item.chapter, 2);

    await nextTick();
    const contenTxt = document.getElementById("contenTxt")!;
    const textNode = contenTxt.firstChild;
    if (textNode) setHighlight(textNode.textContent!.indexOf(searchKey), textNode, searchLen);
  };

  const onBack = () => {
    updateBook();
    appStore.selectBook = "";
    appStore.selectBookItem = undefined;
    state.currentChapter = 0;
    state.currentIndex = 0;
    state.chapterList = [];

    appStore.loading = false;
  };

  const preChapter = () => {
    if (state.currentChapter - 1 >= 0) {
      onChapter(state.currentChapter - 1, 0);
    }
  };
  const nextPage = debounce(() => {
    if (state.currentIndex + 1 < state.total) {
      state.currentIndex++;
      changeIndex();
    } else if (state.currentChapter + 1 < state.chapterList.length) {
      onChapter(state.currentChapter + 1, 0);
    }else{
      state.isPlay=false;
    }
  }, 100);
  const prePage = debounce(() => {
    if (state.currentIndex - 1 >= 0) {
      state.currentIndex--;
      changeIndex();
    } else if (state.currentChapter - 1 >= 0) {
      onChapter(state.currentChapter - 1, 1);
    }
  }, 100);
  ttsUtil.setNextCb(nextPage);

  const onClickPage = (event: MouseEvent) => {
    if (!state.isClick) return;
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

  const changeIndex = async () => {
    getPage();

    if (state.isPlay) {
      await ttsUtil.play();
    }
  };
  const nextChapter = () => {
    if (state.currentChapter < state.chapterList.length) {
      onChapter(state.currentChapter + 1, 0);
    }
  };
  let titleLine = 0;
  const getPage = () => {
    const a = state.currentIndex * state.PageNum - titleLine;
    const b = (state.currentIndex + 1) * state.PageNum - titleLine;
    state.showContent = state.detail.slice(a < 0 ? 0 : a, b).join("");
  };

  const onChapter = (i: number, type: 0 | 1 | 2) => {
    if (type !== 2) state.currentChapter = i;
    if (state.currentChapter > state.chapterList.length) {
      state.currentChapter = state.chapterList.length - 1;
    }
    // state.isMenu = false;
    const t: ChapterType = state.chapterList[state.currentChapter];
    titleLine = Math.ceil(t.title.length / state.LineNum);

    state.detail = t.content as string[];
    state.total = Math.ceil((t.content.length + titleLine) / state.PageNum);
    if (type === 1) {
      state.currentIndex = state.total - 1;
    } else if (type === 2) {
      if (state.currentIndex >= 0 && state.currentIndex < state.total) {
      } else {
        state.currentIndex = 0;
      }
    } else {
      state.currentIndex = 0;
    }
    changeIndex();
  };
  const onChapterItem = (idx: number) => {
    onChapter(idx, 0);
    state.isMenu = false;
  };

  let isFirst = true;
  const onReadTxt = (data: ChapterType[]) => {
    if (isFirst && appStore.selectBookItem) {
      state.title = appStore.selectBookItem.name;
      state.currentChapter = appStore.selectBookItem.chapter;
      state.currentIndex = appStore.selectBookItem.index;
      console.log("chapter", state.currentChapter, "index", state.currentIndex);
      isFirst = false;
    }

    if (data.length) {
      state.chapterList = data;
    } else {
      alert("章节解析失败");

      onBack();
      return;
    }

    onChapter(state.currentChapter, 2);
    appStore.loading = false;
  };
  /**@description 另存为txt */
  const onSaveTxt = (op?: {start: number; end: number}) => {
    const start = op?.start || 0;
    const end = op?.end || state.chapterList.length;
    const fileName = appStore.selectBookItem!.name + `（带章节目录）${op ? start + "-" + end : ""}.txt`;
    let txt = "";
    // const t0 = state.chapterList[0];
    // txt += t0.title + "\n";
    // txt += t0.content.join("") + "\n";
    if (start >= 1) {
      txt += appStore.selectBookItem!.name + "\n";
    }
    for (let i = start; i < end; i++) {
      const it = state.chapterList[i];
      let t = it.title;
      if (/\s*第\s*[0-9]+\s*章/.test(t)) {
        t = t.replace(/\s*第\s*[0-9]+\s*章/g, "");
      }
      txt += `第${i}章 ` + t + "\n";
      txt += it.content.join("") + "\n";
    }
    const file = new File([txt], fileName, {type: "text/plain"});
    const dom = document.createElement("a");
    dom.download = fileName;
    dom.href = window.URL.createObjectURL(file);
    document.body.appendChild(dom);
    dom.click();
  };

  const updateStyle = () => {
    const container = document.getElementById("bookContainer")!;
    const fontSize = state.fontSize * state.lineHeight;
    state.LineNum = Math.floor((container.offsetWidth - 20) / state.fontSize);
    state.PageNum = Math.floor((container.offsetHeight - 20) / fontSize);
    Controller.setLinePageNum(state.LineNum, state.PageNum);
    document.documentElement.style.setProperty("--font", state.fontColor);
    document.documentElement.style.setProperty("--bg", state.bg);
    document.documentElement.style.setProperty("--font-size", state.fontSize + "px");
    document.documentElement.style.setProperty("--line-height", state.lineHeight + "");
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
    if (!state.isClick) return;
    // console.log("🚀 ~ Book.vue ~ onMouseDown ~ ev:", ev.targetTouches[0]);
    // mobilePos.x = ev.pageX;
    mobilePos.x = ev.targetTouches[0].clientX;
    ev.preventDefault();
    ev.stopPropagation();
  };
  const onMouseMove = (ev: TouchEvent) => {
    if (!state.isClick) return;
    // console.log("🚀 ~ Book.vue ~ onMouseMove ~ ev:", ev.targetTouches[0]);
    // const x = ev.pageX;
    const x = ev.targetTouches[0].clientX;
    mobilePos.offsetX += x - mobilePos.x;

    mobilePos.x = x;
    ev.preventDefault();
    ev.stopPropagation();
  };
  const onMouseUp = (ev: TouchEvent) => {
    if (!state.isClick) return;
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

  const onKeyup = debounce(async (ev: KeyboardEvent) => {
    if (ev.key === "ArrowRight") {
      nextPage();
    } else if (ev.key === "ArrowLeft") {
      prePage();
    } else if (ev.code === "Space") {
      state.isPlay = !state.isPlay;
      if (state.isPlay) {
        await ttsUtil.play();
      } else {
        ttsUtil.stop();
      }
    }
  }, 100);

  const stopSpeak = () => {
    ttsUtil.stop();
  };

  onMounted(() => {
    window.history.pushState(null, "book", document.URL);
    window.addEventListener("popstate", onBack, false);

    updateStyle();
    window.onunload = onUnload;
    if (isMobile()) {
      const dom = bookContainer.value!;
      dom.addEventListener("touchstart", onMouseDown, {passive: false});
      dom.addEventListener("touchmove", onMouseMove, {passive: false});
      dom.addEventListener("touchend", onMouseUp, {passive: false});
      window.ontouchstart = null;
      window.ontouchmove = null;
      window.ontouchend = null;
      document.body.ontouchstart = null;
      document.body.ontouchmove = null;
      document.body.ontouchend = null;
    }
    document.body.addEventListener("keyup", onKeyup);
    navigator.mediaDevices.addEventListener("devicechange", stopSpeak);
  });

  onBeforeUnmount(async () => {
    if (isMobile()) {
      const dom = bookContainer.value!;
      dom.removeEventListener("touchstart", onMouseDown);
      dom.removeEventListener("touchmove", onMouseMove);
      dom.removeEventListener("touchend", onMouseUp);
    }
    document.body.removeEventListener("keyup", onKeyup);
    await updateBook();
    window.removeEventListener("popstate", onBack, false);

    Controller.saveBook(appStore.selectBook + "", state.currentChapter, state.currentIndex, state.chapterList.length);
    ttsUtil.destroy();
    navigator.mediaDevices.removeEventListener("devicechange", stopSpeak);
  });
  useEventBus("readTxt", onReadTxt);
  useEventBus("backTxt", onBack);
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
