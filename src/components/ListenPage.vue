<template>
  <Drawer :show="state.isListen" @hide="onHide">
    <div class="listen">
      <div class="title" v-if="state.chapterList.length && state.chapterList[state.currentChapter]">
        {{ state.chapterList[state.currentChapter].title }}
      </div>
      <div style="padding: 10px; text-align: center">{{ state.currentIndex + 1 }}/{{ state.total }}</div>
      <div class="progress">
        <input type="range" v-model.number="state.currentIndex" @click="changeIndex()" :step="1" :min="0" :max="state.total - 1" />
      </div>

      <div class="control">
        <i @click="onBtnAction('preChapter')" class="iconfont icon-next"> </i>
        <i @click="onBtnAction('prePage')" class="iconfont icon-arrow"> </i>
        <i @click="onPlay()" :class="['iconfont', state.isPlay ? 'icon-pause' : 'icon-play']"> </i>
        <i @click="onBtnAction('nextPage')" class="iconfont icon-arrow"> </i>
        <i @click="onBtnAction('nextChapter')" class="iconfont icon-next"> </i>
        <i @click="onBtnAction('refresh')" class="iconfont icon-shuaxin"> </i>
      </div>
     <div style="text-align: center;line-height:30px;">播放速度：{{ state.speed }}</div>
        <div class="progress">
        <input type="range" v-model="state.speed" @click="onSpeed()" :min="0.5" :step="0.5" :max="5" />
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
  import { debounce } from "lodash-es";
import {BookStoreType} from "../@types";
  import {TTSUtuil} from "../utils/ttsUtil";
  import Drawer from "./Drawer.vue";

  import {inject} from "vue";

  const emit = defineEmits(["index", "preChapter", "nextChapter", "prePage", "nextPage"]);

  const speeds = [
    {name: "0.5X", value: 0.5},
    {name: "1.0X", value: 1},
    {name: "1.2X", value: 1.2},
    {name: "1.5X", value: 1.5},
    {name: "1.8X", value: 1.8},
    {name: "2.0X", value: 2}
  ];
  const props = withDefaults(defineProps<{tts: TTSUtuil,onPlay:Function}>(), {});
  const state = inject<BookStoreType>("BookStore")!;
  const onHide = () => {
    state.isListen = false;
  };
  const changeIndex = () => {     
    emit("index", state.currentIndex);
  };
  const onBtnAction = (type: "refresh" | "preChapter" | "nextChapter" | "prePage" | "nextPage") => {
    if (type === "refresh") {
      state.isPlay = true;
      props.tts.speak();
    } else {
      emit(type);
    }
  };

  const onSpeed =  debounce(async( ) => {  
    localStorage.setItem("speed", state.speed + "");
    props.tts.setSpeed(state.speed);
    
    if (state.isPlay) {
      await props.tts.play();
    }
  },100);
  // const onPlay = async () => {
  //   state.isPlay = !state.isPlay;
  //   if (state.isPlay) {
  //     await props.tts.play();
  //   } else {
  //     props.tts.stop();
  //   }
  // };
</script>

<style scoped lang="scss">
  .listen {
    height: 100%;

    .voice {
      padding: 20px;
      line-height: 30px;
      max-height: 200px;
      overflow: hidden auto;

      > div {
        white-space: nowrap;
        &:not(:last-child) {
          border-bottom: solid 1px var(--border);
        }
        &.active {
          color: dodgerblue;
          font-weight: bold;
        }
      }
    }
   
    .title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      height: 100px;
      line-height: 100px;
      text-align: center;
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

    .control {
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      > i {
        height: 50px;
        width: 50px;
        flex: none;
        cursor: pointer;
        font-size: 20px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: gray;
        color: white;
        &:nth-child(1),
        &:nth-child(2) {
          transform: rotate(180deg);
        }
        &:nth-child(3) {
          height: 80px;
          width: 80px;
          font-size: 40px;
        }
        &:hover {
          background-color: dodgerblue;
        }
      }
    }
  }
</style>
