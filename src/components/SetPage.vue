<template>
  <Drawer :show="isSet" @hide="onHide" :onShow="onShow">
    <div class="chapter-set">
      <table>
        <tbody>
          <tr>
            <td>字体大小</td>
            <td>
              <input type="number" :min="12" :max="30" :step="1" v-model="bookStyle.fontSize" @change="onChangeStyle" />
            </td>
          </tr>
          <tr>
            <td>行高</td>
            <td>
              <input
                type="number"
                :min="1"
                :max="2"
                :step="0.1"
                v-model="bookStyle.lineHeight"
                @change="onChangeStyle"
              />
            </td>
          </tr>
          <tr>
            <td>字体颜色</td>
            <td><input type="color" v-model="bookStyle.fontColor" @change="onChangeStyle" /></td>
          </tr>
          <tr>
            <td>背景颜色</td>
            <td><input type="color" v-model="bookStyle.bg" @change="onChangeStyle" /></td>
          </tr>
          <tr>
            <td>章节匹配</td>
            <td>
              <select v-model="state.regexType" @change="onRegex">
                <option :value="-1">自动识别</option>
                <option v-for="(item, idx) in chapterRegex" :key="idx" :value="idx">
                  {{ item.name }}
                </option>
                <option :value="-2">自定义</option>
              </select>
            </td>
          </tr>

          <tr>
            <td>正则表达式</td>
            <td>
              <input v-model="state.regex" :disabled="state.regexType != -2" @change="onRegex" type="text" />
            </td>
          </tr>
          <tr>
            <td>编码方式</td>
            <td>
              <select v-model="state.encode" @change="onEncode">
                <option v-for="item in encodeList" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
            </td>
          </tr>
          <tr>
            <td>导出部分章节</td>
            <td>
              <input type="number" class="chapter-input" v-model="state.startChapter" />~
              <input type="number" class="chapter-input" v-model="state.endChapter" />
            </td>
          </tr>
          <tr>
            <td></td>
            <td><button class="export-chapter" @click="onExportChapter">导出章节</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
  import Drawer from "./Drawer.vue";
  import {chapterRegex, encodeList} from "../data";
  import {bookItem, bookStyle} from "../config.ts";
  import {reactive} from "vue";
  import Controller from "../controllers/Controller.ts";

  const state = reactive({
    regexType: bookItem.value!.regexType ?? -1,

    regex: bookItem.value!.regex || "",
    startChapter: 1,
    endChapter: 100,
    encode: bookItem.value!.encode || "UTF-8"
  });
  withDefaults(
    defineProps<{
      isSet: boolean;
    }>(),
    {isSet: false, total: 0}
  );
  const emit = defineEmits(["update:isSet", "exportTxt", "changeStyle"]);
  const onHide = () => {
    emit("update:isSet", false);
  };
  const onChangeStyle = () => {
    emit("changeStyle");
  };
  const onEncode = () => {
    bookItem.value!.encode = state.encode;
    Controller.changeEncode(state.encode);
  };
  const onRegex = () => {
    bookItem.value!.regexType = state.regexType;
    if (state.regexType >= 0) {
      state.regex = chapterRegex[state.regexType].value;
    }

    Controller.changeRegex({regex: state.regex, regexType: state.regexType});
  };

  const onShow = () => {
    state.startChapter = 1;
    state.endChapter = bookItem.value!.total;
  };
  const onExportChapter = () => {
    emit("exportTxt", {start: state.startChapter, end: state.endChapter});
  };
</script>

<style lang="scss" scoped>
  .chapter-set {
    line-height: 40px;
    padding: 20px;
    select,
    input[type="number"],
    input[type="text"],
    input[type="color"],
    .chapter-input {
      background-color: rgba(255, 255, 255, 0.3);
      border: none;
      border-radius: 4px;
      width: 100%;
      height: 40px;
      outline: none;
      padding: 0 10px;
    }
    .export-chapter {
      padding: 0 20px;
      height: 40px;
      width: 100%;
      background-color: dodgerblue;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      color: white;
      &:hover {
        filter: brightness(120%);
      }
    }
    .chapter-input {
      width: 100px !important;
    }
    input[type="text"]:disabled {
      background-color: rgba(0, 0, 0, 0.1);
    }
    table {
      width: 100%;

      tr > td:first-child {
        white-space: nowrap;
      }

      tr > td {
        padding: 5px 0;
      }
      tr:not(:last-child) td {
        border-bottom: solid 1px var(--border);
      }
    }
  }
</style>
