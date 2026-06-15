<script setup lang="ts">
  import {computed, provide, reactive} from "vue";
  import List from "./components/List.vue";
  import Book from "./components/Book.vue";
  import {AppStoreType} from "../@types";
  import {useEventBus} from "./utils/EventEmitter";

  const state = reactive<AppStoreType>({
    loading: true,
    selectBook: "",
    selectBookItem: undefined
  });
  provide("AppStore", state);
  const currentPart = computed(() => {
    return state.selectBook ? Book : List;
  });
  useEventBus("loading", (v: boolean) => {
    state.loading = v;
  });
</script>

<template>
  <component :is="currentPart"></component>
  <div class="loading" v-show="state.loading"><i class="loading-icon iconfont icon-loading"></i></div>
</template>
<style lang="scss" scoped>
  .loading {
    position: fixed;
    z-index: 9;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;

    > .loading-icon {
      font-size: 32px;
      color: white;
      animation: rotating 1s linear infinite;
    }
  }
</style>
