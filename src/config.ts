import type {BookType, ChapterType} from "./@types";

import {reactive, ref} from "vue";

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

  range.setStart(textNode, start);
  range.setEnd(textNode, start + searchLen);
  searchHighlight.add(range);
  return range;
}
export function removeHighlight(range: Range) {
  searchHighlight.delete(range);
}

export const currentChapter = ref<number>(0);
export const currentIndex = ref<number>(0);
//每行多少个字
export const LineNum = ref(20);
//每页多少行
export const PageNum = ref(20);
//是否语音朗读
export const isPlay = ref(false);
