<template>
  <Drawer :show="bookStore.isMenu" @hide="onHide" :onShow="onShow">
    <div class="search-box">
      <div class="search">
        <input placeholder="搜索关键词" type="text" v-model="state.searchKey" />
        <i v-show="state.searchKey" class="iconfont icon-close" @click="state.searchKey = ''"></i>
      </div>
    </div>
    <div class="nav-container" ref="navRef">
      <div
        :class="['nav-item', bookStore.currentChapter == item.index ? 'active' : '']"
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

  import {computed, inject, reactive, useTemplateRef} from "vue";

  import {BookStoreType} from "../@types";

  const navRef = useTemplateRef("navRef");

  const bookStore = inject<BookStoreType>("BookStore")!;
  const state = reactive({
    searchKey: ""
  });
  const showChapterList = computed(() => {
    const list = bookStore!.chapterList;
    if (state.searchKey) {
      return list.filter((a) => a.title.indexOf(state.searchKey) >= 0);
    }
    return list;
  });
  const emit = defineEmits(["item"]);
  const onHide = () => {
    bookStore.isMenu = false;
  };

  const onChapterItem = (idx: number) => {
    emit("item", idx);
    // emit("update:isMenu", false);
  };
  const onShow = () => {
    //滚动定位到当前章节
    if (!state.searchKey) {
      navRef.value?.scrollTo(0, (bookStore.currentChapter - 1) * 40);
    }
  };
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
