<template>
  <div class="book-detail">
    <div class="nav-back">
      <i class="back-icon" @click="onBack()"></i>
      <span class="title">{{ state.title }}</span>
      {{ state.chapter + 1 }} /{{ chapterList.length }}
    </div>

    <div class="book-container">
      <!-- <div v-for="(it, idx) in state.showContent" :key="idx" v-html="it"></div> -->
      <div class="chapter-title" v-if="chapterList.length && state.index == 0">
        {{ chapterList[state.chapter].title }}
      </div>
      <div class="book-content" ref="contenTxt" v-html="state.showContent"></div>
      <div class="slide">
        <div class="left" @click="prePage()"></div>
        <div class="mid" @click="state.isMenu = true"></div>
        <div class="right" @click="nextPage()"></div>
      </div>
    </div>
    <div class="book-bottom">
      <i class="book-icon" @click="state.isMenu = true"></i>
      <i class="listen-icon" @click="showListen()"></i>
    </div>
  </div>
  <div class="book-nav" v-if="state.isMenu">
    <div class="blank" @click="state.isMenu = false"></div>
    <div class="nav-list">
      <div class="nav-title">{{ state.title }}</div>
      <div class="nav-container">
        <div
          :class="['nav-item', state.chapter == idx ? 'active' : '']"
          v-for="(item, idx) in chapterList"
          :key="idx"
          @click="onChapter(idx)"
        >
          {{ item.title }}
        </div>
      </div>
    </div>
  </div>
  <div class="listen-page" v-if="state.isListen">
    <div class="blank" @click="state.isListen = false"></div>
    <div class="listen">
      <div class="title">{{ chapterList[state.chapter].title }}</div>
      <div class="progress">
        <input
          type="range"
          v-model="state.index"
          @click="changeIndex()"
          :min="0"
          :max="state.total - 1"
        />
      </div>

      <div class="control">
        <span @click="preChapter()">
          <i class="pre-icon"></i>
        </span>
        <span @click="onPlay()">
          <i :class="[state.isPlay ? 'stop-icon' : 'play-icon']"></i>
        </span>
        <span @click="nextChapter()">
          <i class="next-icon"></i>
        </span>
      </div>
      <div class="speed">
        <span
          :class="[state.speed == item.value ? 'active' : '']"
          v-for="item in speeds"
          :key="item.name"
          @click="onSpeed(item.value)"
          >{{ item.name }}</span
        >
      </div>
      <div class="voice">
        <div
          :class="[state.voice == i ? 'active' : '']"
          @click="selectVoice(i)"
          v-for="(item, i) in state.voices"
          :key="i"
        >
          {{ item }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
  import type { ChapterType } from '../../@types';
  import { selectBook, loading, bookItem } from '../config';

  const contenTxt = ref<HTMLDivElement>();
  const PageNum = 21;
  const speeds = [
    { name: '0.5X', value: 0.5 },
    { name: '1.0X', value: 1 },
    { name: '1.2X', value: 1.2 },
    { name: '1.5X', value: 1.5 },
    { name: '1.8X', value: 1.8 },
    { name: '2.0X', value: 2 }
  ];
  loading.value = true;
  let voiceList: any = [];

  const state = reactive({
    voice: Number(localStorage.getItem('voice')) || 0,
    voices: [],
    title: bookItem.value!.name,
    isMenu: false,
    chapter: bookItem.value!.chapter,
    index: bookItem.value!.index,
    detail: [],
    showContent: '',
    total: 0,
    line: 0,
    speed: Number(localStorage.getItem('speed')) || 1,
    isPlay: false,
    isListen: false
  });
  const updateBook = () => {
    window.ipcRenderer.send('readedTxt', {
      id: selectBook.value + '',
      chapter: state.chapter,
      index: state.index,
      total: chapterList.value.length
    });
  };
  const onBack = () => {
    updateBook();
    selectBook.value = '';
    bookItem.value = undefined;
    state.isMenu = false;
    state.isListen = false;
    state.isPlay = false;
  };
  const chapterList = ref<ChapterType[]>([]);
  const preChapter = () => {
    if (state.chapter - 1 >= 0) {
      onChapter(state.chapter - 1, 0);
    }
  };
  const nextPage = () => {
    if (state.index + 1 < state.total) {
      state.index++;
      changeIndex();
    } else if (state.chapter < chapterList.value.length) {
      onChapter(state.chapter + 1, 0);
    }
  };
  const prePage = () => {
    if (state.index - 1 >= 0) {
      state.index--;
      changeIndex();
    } else if (state.chapter - 1 >= 0) {
      onChapter(state.chapter - 1, 1);
    }
  };
  const changeIndex = () => {
    getPage();
    onSpeak();
  };
  const nextChapter = () => {
    if (state.chapter < chapterList.value.length) {
      onChapter(state.chapter + 1, 0);
    }
  };
  let titleLine = 0;
  const getPage = () => {
    const a = state.index * PageNum - titleLine;
    const b = (state.index + 1) * PageNum - titleLine;
    state.showContent = state.detail.slice(a < 0 ? 0 : a, b).join('');
    // console.log(state.showContent);
  };
  const onChapter = (i: number, type: 0 | 1 | 2) => {
    if (type !== 2) state.chapter = i;
    // console.log(state.chapter, state.index);

    state.isMenu = false;

    const t: ChapterType = chapterList.value[state.chapter];
    titleLine = Math.ceil(t.title.length / 24);
    console.log('titleLine', titleLine);
    state.detail = t.content;
    state.total = Math.ceil((t.content.length + titleLine) / PageNum);
    if (type === 1) {
      state.index = state.total - 1;
    } else if (type === 2) {
      if (state.index >= 0 && state.index < state.total) {
      } else {
        state.index = 0;
      }
    } else {
      state.index = 0;
    }
    changeIndex();
  };
  window.ipcRenderer.send('getTxt', selectBook.value);
  const selectVoice = (i: number) => {
    state.voice = i;
    localStorage.setItem('voice', i + '');
    if (state.isPlay) onSpeak();
  };
  const onSpeed = (i: number) => {
    state.speed = i;
    localStorage.setItem('speed', i + '');
    if (state.isPlay) onSpeak();
  };
  const onPlay = () => {
    state.isPlay = !state.isPlay;
    onSpeak();
  };
  const voiceSet = {
    txt: ''
  };
  let utterance: SpeechSynthesisUtterance;
  const onSpeak = async () => {
    await nextTick();
    if (state.isPlay) {
      const str = contenTxt.value!.innerText;
      if (voiceSet.txt != str) {
        speechSynthesis.cancel();
        const t = new SpeechSynthesisUtterance(str.replace(/_-\+=/g, ''));
        t.voice = voiceList[state.voice];
        t.rate = state.speed;
        t.volume = 100;
        speechSynthesis.speak(t);
        voiceSet.txt = str;
        utterance = t;
        t.onend = () => {
          nextPage();
        };
      } else if (utterance) {
        speechSynthesis.resume();
      }
    } else {
      speechSynthesis.pause();
    }
  };
  const onReadTxt = (_event: any, data: ChapterType[]) => {
    chapterList.value = data;

    onChapter(state.chapter, 2);
    loading.value = false;
  };
  updateBook();
  window.ipcRenderer.once('readTxt', onReadTxt);
  window.ipcRenderer.send('currentPage', 'book');
  window.ipcRenderer.once('closeBook', () => {
    window.ipcRenderer.send('closedBook', {
      id: selectBook.value + '',
      chapter: state.chapter,
      index: state.index,
      total: chapterList.value.length
    });
  });
  const showListen = () => {
    state.isListen = true;
    voiceList = speechSynthesis.getVoices();

    state.voices = voiceList.map((it: any) => it.name);
  };
  onMounted(async () => {
    await nextTick();
  });
  onBeforeUnmount(() => {
    speechSynthesis.cancel();
  });
</script>

<style scoped lang="scss">
  .listen-page {
    height: 100%;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    .voice {
      padding: 20px;
      line-height: 30px;

      > div {
        &:not(:last-child) {
          border-bottom: solid 1px rgba(0, 0, 0, 0.05);
        }
        &.active {
          color: dodgerblue;
          font-weight: bold;
        }
      }
    }
    .speed {
      display: flex;
      padding: 20px;
      line-height: 24px;
      text-align: center;
      > span {
        flex: 1;

        display: inline-block;
        &.active {
          color: dodgerblue;
          font-weight: bold;
        }
      }
    }
    .title {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
    }
    .progress {
      padding: 20px;
    }
    .listen {
      height: 90%;
      background-color: var(--bg);
    }
    input {
      width: 100%;

      background-color: #ccc;
      border-radius: 4px;
      height: 4px;

      &::-webkit-slider-thumb {
        height: 10px;
        width: 10px;
        border-radius: 50%;
        /*可以修改滑块的若干样式*/
        background-color: dodgerblue;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      }
    }
    .control {
      padding: 20px 100px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      > span {
        height: 50px;
        width: 50px;

        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: gray;
        &:nth-child(2) {
          height: 80px;
          width: 80px;
        }
      }
      i {
        height: 30px;
        width: 30px;
      }
    }
  }
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
    text-align: left;
    line-height: 1.5;
    font-size: 18px;
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
      height: 20px;
      width: 20px;
      &:not(:last-child) {
        margin-right: 20px;
      }
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
    flex-direction: column;
  }
  .blank {
    height: 10%;
  }
  .nav-list {
    background-color: var(--bg);
    height: 90%;
    border-radius: 10px 10px 0 0;
  }
  .nav-container {
    height: calc(100% - 60px);
    overflow-y: auto;
    overflow-x: hidden;
    border-top: solid 1px #ccc;
  }
  .nav-title {
    font-weight: bold;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .nav-item {
    height: 40px;
    line-height: 40px;
    font-size: 14px;
    padding: 0 10px;
    text-overflow: ellipsis;
    white-space: nowrap;

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
