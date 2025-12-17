<template>
  <Drawer :show="isListen" @hide="onHide">
    <div class="listen">
      <div class="title" v-if="chapterList.length && chapterList[currentChapter]">
        {{ chapterList[currentChapter].title }}
      </div>
      <div style="padding: 10px; text-align: center">{{ currentIndex + 1 }}/{{ bookState.total }}</div>
      <div class="progress">
        <input type="range" v-model="currentIndex" @click="changeIndex()" :min="0" :max="bookState.total - 1" />
      </div>

      <div class="control">
        <i @click="onBtnAction('preChapter')" class="iconfont icon-next"> </i>
        <i @click="onBtnAction('prePage')" class="iconfont icon-arrow"> </i>
        <i @click="onPlay()" :class="['iconfont', isPlay ? 'icon-pause' : 'icon-play']"> </i>
        <i @click="onBtnAction('nextPage')" class="iconfont icon-arrow"> </i>
        <i @click="onBtnAction('nextChapter')" class="iconfont icon-next"> </i>
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
    </div>
  </Drawer>
</template>

<script setup lang="ts">
  import Drawer from "./Drawer.vue";
  import {
    currentChapter,
    chapterList,
    currentIndex,
    isPlay,
    speakState as state,
    bookState,
    startSpeak
  } from "../config.ts";
  import {nextTick} from "vue";

  const emit = defineEmits(["update:isListen", "index", "preChapter", "nextChapter", "prePage", "nextPage"]);

  const speeds = [
    {name: "0.5X", value: 0.5},
    {name: "1.0X", value: 1},
    {name: "1.2X", value: 1.2},
    {name: "1.5X", value: 1.5},
    {name: "1.8X", value: 1.8},
    {name: "2.0X", value: 2}
  ];

  withDefaults(
    defineProps<{
      isListen: boolean;
    }>(),
    {isListen: false}
  );

  const onHide = () => {
    emit("update:isListen", false);
  };
  const changeIndex = () => {
    emit("index", currentIndex.value);
  };
  const onBtnAction = (type: "preChapter" | "nextChapter" | "prePage" | "nextPage") => {
    emit(type);
  };

  const onSpeed = (i: number) => {
    state.speed = i;
    localStorage.setItem("speed", i + "");
    if (isPlay.value) onSpeak();
  };
  const onPlay = () => {
    isPlay.value = !isPlay.value;
    onSpeak();
  };

  const onSpeak = async () => {
    await nextTick();
    startSpeak();
  };
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
