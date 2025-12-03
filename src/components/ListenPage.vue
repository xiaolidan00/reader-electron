<template>
  <Drawer :show="isListen" @hide="onHide">
    <div class="listen">
      <div class="title" v-if="chapterList.length && chapterList[currentChapter]">
        {{ chapterList[currentChapter].title }}
      </div>
      <div class="progress">
        <input type="range" v-model="currentIndex" @click="changeIndex()" :min="0" :max="total - 1" />
      </div>

      <div class="control">
        <span @click="onBtnAction('preChapter')">
          <i class="pre-icon"></i>
        </span>
        <span @click="onBtnAction('prePage')">
          <i class="arrow-icon reverse"></i>
        </span>
        <span @click="onPlay()" class="big">
          <i :class="[isPlay ? 'stop-icon' : 'play-icon']"></i>
        </span>
        <span @click="onBtnAction('nextPage')">
          <i class="arrow-icon"></i>
        </span>
        <span @click="onBtnAction('nextChapter')">
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
    </div>
  </Drawer>
</template>

<script setup lang="ts">
  import Drawer from "./Drawer.vue";
  import {currentChapter, chapterList, currentIndex, isPlay, removeHighlight, setHighlight} from "../config.ts";
  import {reactive, onMounted, onBeforeUnmount, watch, nextTick} from "vue";

  const emit = defineEmits(["update:isListen", "index", "preChapter", "nextChapter", "prePage", "nextPage"]);

  const speeds = [
    {name: "0.5X", value: 0.5},
    {name: "1.0X", value: 1},
    {name: "1.2X", value: 1.2},
    {name: "1.5X", value: 1.5},
    {name: "1.8X", value: 1.8},
    {name: "2.0X", value: 2}
  ];
  type StateType = {
    voice: number;
    speed: number;
  };
  const state = reactive<StateType>({
    voice: Number(localStorage.getItem("voice")) || 0,

    speed: Number(localStorage.getItem("speed")) || 1.5
  });
  withDefaults(
    defineProps<{
      isListen: boolean;
      total: number;
    }>(),
    {isListen: false, total: 0}
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

  const stopPlay = () => {
    isPlay.value = false;
    speechSynthesis.pause();
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
  const voiceSet: {txt: string; utterance?: SpeechSynthesisUtterance} = {
    txt: ""
  };
  let beforeRange: Range;
  const onSpeak = async () => {
    await nextTick();

    if (isPlay.value) {
      const contenTxt = document.getElementById("bookContainer")!;
      const str = contenTxt.innerText;
      if (voiceSet.txt != str) {
        speechSynthesis.cancel();
        const t = new SpeechSynthesisUtterance(str.replace(/[\_\-\+=\*]+/g, ""));

        t.rate = state.speed;
        t.volume = 100;
        speechSynthesis.speak(t);
        voiceSet.txt = str;
        voiceSet.utterance = t;
        t.onboundary = (e: SpeechSynthesisEvent) => {
          const dom = document.getElementById("contenTxt")!;
          if (beforeRange) {
            removeHighlight(beforeRange);
          }
          const textNode = dom.firstChild;
          if (textNode) beforeRange = setHighlight(e.charIndex, textNode, e.charLength);
        };
        t.onend = () => {
          emit("nextPage");
        };
        t.onerror = (err) => {
          // console.log("🚀 ~ ListenPage.vue ~ onSpeak ~ err:", err);
          isPlay.value = false;
          speechSynthesis.cancel();
          voiceSet.txt = "";
        };
      } else if (voiceSet.utterance) {
        speechSynthesis.resume();
      }
    } else {
      speechSynthesis.pause();
    }
  };
  // const onVisibilitychange = () => {
  //   if (isMobile() && !props.isListen) {
  //     speechSynthesis.cancel();
  //   }
  // };

  onMounted(() => {
    // if (isMobile()) {
    //   document.addEventListener("visibilitychange", onVisibilitychange);
    // }

    navigator.mediaDevices.addEventListener("devicechange", stopPlay);
  });
  onBeforeUnmount(() => {
    // if (isMobile()) {
    //   document.removeEventListener("visibilitychange", onVisibilitychange);
    // }

    isPlay.value = false;
    speechSynthesis.cancel();
    navigator.mediaDevices.removeEventListener("devicechange", stopPlay);
  });
  defineExpose({
    onSpeak,
    stopPlay
  });
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
      > span {
        height: 50px;
        width: 50px;
        flex: none;
        cursor: pointer;

        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: gray;
        &.big {
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
</style>
