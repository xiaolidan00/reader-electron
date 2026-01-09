import type {BookType, ChapterType} from "./@types";

import {reactive, ref} from "vue";
import {EventBus} from "./utils/EventEmitter";
import {sleep} from "./utils/utils";

export const selectBook = ref("");
export const dataList = ref<Array<BookType>>([]);
export const bookItem = ref<BookType>();
export const chapterList = ref<ChapterType[]>([]);
export const loading = ref<boolean>(false);
export const listSearchKey = ref<string>("");

let bStyle;
if (localStorage.getItem("bookStyle")) {
  bStyle = JSON.parse(localStorage.getItem("bookStyle") as string);
} else {
  bStyle = {
    fontSize: 18,
    lineHeight: 2,
    fontColor: "#505050",
    bg: "#faebd7"
  };
}
export const bookStyle = reactive(bStyle);

export const searchHighlight = new Highlight();
CSS.highlights.set(`search-highlight`, searchHighlight);
export function setHighlight(start: number, textNode: Node, searchLen: number) {
  const range = new Range();

  range.setStart(textNode, start < 0 ? 0 : start);
  range.setEnd(textNode, start + searchLen);
  searchHighlight.add(range);
  return range;
}
export function removeHighlight(range: Range) {
  searchHighlight.delete(range);
}
export const showType = ref(localStorage.getItem("showType") || "card");
export const sortType = ref(localStorage.getItem("sortType") || "updateTimeDesc");
//当前章节
export const currentChapter = ref<number>(0);
//当前页
export const currentIndex = ref<number>(0);
//每行多少个字
export const LineNum = ref(20);
//每页多少行
export const PageNum = ref(20);
//是否语音朗读
export const isPlay = ref(false);

export const bookState = ref<any>({
  title: "",
  isMenu: false,
  detail: [],
  showContent: "",
  total: 0,
  isListen: false,
  isSearch: false,
  isSet: false,
  isClick: true
});

export const defaultBookState = {
  title: "",
  isMenu: false,
  detail: [] as string[],
  showContent: "",
  total: 0,
  isListen: false,
  isSearch: false,
  isSet: false,
  isClick: true
};
export const speakState = reactive<{
  voice: number;
  speed: number;
}>({
  voice: Number(localStorage.getItem("voice")) || 0,

  speed: Number(localStorage.getItem("speed")) || 1.5
});
const voiceSet: {txt: string; utterance?: SpeechSynthesisUtterance} = {
  txt: ""
};
let beforeRange: Range;
export const startSpeak = async () => {
  console.log("startSpeak", isPlay.value);
  if (isPlay.value) {
    const str = document.getElementById("bookContainer")!.innerText;
    const dom = document.getElementById("contenTxt")!;
    const titleDom = document.getElementById("titleTxt");
    console.log(voiceSet.txt != str);
    if (voiceSet.txt != str) {
      speechSynthesis.cancel();
      const t = new SpeechSynthesisUtterance(str);

      t.rate = speakState.speed;
      t.volume = 1;
      speechSynthesis.speak(t);
      voiceSet.txt = str;
      voiceSet.utterance = t;
      t.onboundary = (e: SpeechSynthesisEvent) => {
        try {
          if (beforeRange) {
            removeHighlight(beforeRange);
          }

          if (titleDom) {
            const titleLen = titleDom.innerText.length;

            if (e.charIndex + e.charLength <= titleLen) {
              const textNode = titleDom.firstChild;
              if (textNode) beforeRange = setHighlight(e.charIndex, textNode, e.charLength);
            } else {
              const textNode = dom.firstChild;
              if (textNode) beforeRange = setHighlight(e.charIndex - titleLen - 1, textNode, e.charLength);
            }
          } else {
            const textNode = dom.firstChild;
            if (textNode) beforeRange = setHighlight(e.charIndex, textNode, e.charLength);
          }
        } catch (error) {
          console.log("🚀 ~ config.ts ~ startSpeak ~ error:", error);
        }
      };
      t.onend = () => {
        refreshSpeak();
        EventBus.emit("nextPage");
      };
      t.onerror = (err) => {
        console.log("🚀 ~  err:", err);
        // isPlay.value = false;
        refreshSpeak();
        if (err.error === "interrupted") {
          sleep(500).then(() => {
            startSpeak();
          });
        }
      };
    } else if (voiceSet.utterance) {
      speechSynthesis.resume();
    }
  } else {
    speechSynthesis.pause();
  }
};
export const refreshSpeak = () => {
  voiceSet.utterance = undefined;
  voiceSet.txt = "";
  speechSynthesis.cancel();
  if (beforeRange) {
    removeHighlight(beforeRange);
  }
  isPlay.value = true;
  startSpeak();
};
export const stopSpeak = () => {
  isPlay.value = false;
  speechSynthesis.pause();
};
