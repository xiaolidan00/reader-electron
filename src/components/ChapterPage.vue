<template>
  <Drawer :show="isMenu" @hide="onHide" :onShow="onShow">
    <div class="search-box">
      <div class="search">
        <input placeholder="搜索关键词" type="text" v-model="state.searchKey" @change="onSearch()" />
        <i v-show="state.searchKey" class="close-icon" @click="state.searchKey = ''"></i>
      </div>
    </div>
    <div class="nav-container" ref="navRef">
      <div
        :class="['nav-item', currentChapter == item.index ? 'active' : '']"
        v-for="item in showChapterList"
        :key="item.index"
        @click.self="onChapterItem(item.index)"
      >
        {{ item.title }}
      </div>
      <div class="empty-item" v-if="showChapterList.length === 0">暂无数据</div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
  import Drawer from "./Drawer.vue";
  import {currentChapter, chapterList} from "../config.ts";
  import {computed, reactive, useTemplateRef} from "vue";
  import {debounce} from "lodash-es";
  const navRef = useTemplateRef("navRef");
  const props = defineProps({
    isMenu: Boolean
  });
  const state = reactive({
    searchKey: ""
  });
  const showChapterList = computed(() => {
    const list = chapterList.value;
    if (state.searchKey) {
      return list.filter((a) => a.title.indexOf(state.searchKey) >= 0);
    }
    return list;
  });
  const emit = defineEmits(["update:isMenu", "item"]);
  const onHide = () => {
    emit("update:isMenu", false);
  };

  const onChapterItem = (idx: number) => {
    emit("item", idx);
    // emit("update:isMenu", false);
  };
  const onShow = debounce(() => {
    if (props.isMenu && !state.searchKey) {
      navRef.value?.scrollTo(0, (currentChapter.value - 1) * 40);
    }
  }, 100);
</script>

<style scoped lang="scss">
  .nav-container {
    height: calc(100% - 60px);
    overflow-y: auto;
    overflow-x: hidden;
    border-top: solid 1px var(--border);
  }
  .empty-item {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
  }
  .nav-item {
    height: 40px;
    line-height: 40px;
    font-size: 14px;
    overflow: hidden;
    padding: 0 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-overflow: ellipsis;
    &:not(:last-child) {
      border-bottom: solid 1px var(--border);
    }
    &.active {
      color: dodgerblue;
    }
  }
</style>
