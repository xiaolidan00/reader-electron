import {removeHighlight, setHighlight} from "./highlight";
import {sleep} from "./utils";

export class TTSUtuil {
  /**@description 是否在播放中*/
  isPlay = false;
  /**@description 当前阅读文本*/
  currentText = "";
  /**@description 文本转语音*/
  tts?: SpeechSynthesisUtterance;
  /**@description 播放速度*/
  speed = Number(localStorage.getItem('speed'))||3;
  /**@description 播放速度*/
  beforeRange?: Range;
  /**@description 播放完毕结束回调*/
  endCb?: Function;
  /**@description 标题DOM ID*/
  titleId: string;
  /**@description 内容DOM ID*/
  contentId: string;
  /**@description 标题DOM*/
  titleDom?: HTMLElement | null;
  /**@description 内容DOM*/
  contentDom?: HTMLElement | null;
  constructor(titleId: string, contentId: string) {
    this.titleId = titleId;
    this.contentId = contentId;
  }
  setNextCb(endCb: Function) {
    this.endCb = endCb;
  }

  setSpeed(s: number) {
    this.speed = s;
  }
  /**@description 播放完毕  */
  onEnd() {
    this.tts = undefined;
    speechSynthesis.cancel();
    if (this.endCb) {
      this.endCb();
    }
  }
  onBoundary(e: SpeechSynthesisEvent) {
    // 移除高亮文本
    if (this.beforeRange) {
      removeHighlight(this.beforeRange);
    }
    //文本播放高亮
    if (this.titleDom && this.contentDom) {
      const titleLen = this.titleDom.innerText.length;

      if (e.charIndex + e.charLength <= titleLen) {
        const textNode = this.titleDom.firstChild;
        if (textNode) this.beforeRange = setHighlight(e.charIndex, textNode, e.charLength);
      } else {
        const textNode = this.contentDom.firstChild;
        if (textNode) this.beforeRange = setHighlight(e.charIndex - titleLen - 1, textNode, e.charLength);
      }
    } else if (this.contentDom) {
      const textNode = this.contentDom.firstChild;
      if (textNode) this.beforeRange = setHighlight(e.charIndex, textNode, e.charLength);
    }
  }
  onError(err: SpeechSynthesisErrorEvent) {
    console.log("tts Error", err);
  }
  //播放新的文本内容
  speak() {
    if (!this.isPlay) {
      this.isPlay = true;
    }
    speechSynthesis.cancel();
    const t = new SpeechSynthesisUtterance(this.currentText);

    t.rate = this.speed;
    t.volume = 1;
    t.onboundary = this.onBoundary.bind(this);
    t.onend = this.onEnd.bind(this);
    t.onerror = this.onError.bind(this);
    speechSynthesis.speak(t);
    this.tts = t;
  }

  async play() {
    if (!this.isPlay) {
      this.isPlay = true;
    }
    await sleep(100);
    let text = "";
    const titleDom = document.getElementById(this.titleId);
    const contentDom = document.getElementById(this.contentId);
    this.titleDom = titleDom;
    this.contentDom = contentDom;
    if (titleDom) {
      text += titleDom.textContent;
    }
    if (contentDom) {
      text += contentDom.textContent;
    }
    if (this.currentText != text) {
      this.currentText = text;
      this.speak();
    } else if (this.tts) {
      //暂停重新播放
      speechSynthesis.resume();
    }
  }
  //暂停播放
  stop() {
    if (this.isPlay) {
      this.isPlay = false;
    }
    speechSynthesis.pause();
  }
  destroy() {
    speechSynthesis.cancel();
    this.isPlay = false;
  }
}
