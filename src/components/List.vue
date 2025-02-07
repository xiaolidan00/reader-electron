<script setup lang="ts">
  import { ref } from 'vue';

  type BookType = {
    name: string;
    chapter: number;
    total: number;
    importTime: number;
    path: string;
    group: string;
  };
  const list: BookType[] = [];
  for (let i = 0; i < 10; i++) {
    list.push({
      name: '虐文女主带球来讨债了',
      chapter: i + 1,
      total: 10,
      importTime: new Date().getTime() + i * 10000,
      path: '',
      group: ''
    });
  }
  const dataList = ref<Array<BookType>>(list);
</script>

<template>
  <div class="book-list">
    <div class="book-item" v-for="item in dataList" :key="item.name">
      <div class="book-cover">
        {{ item.name }}
      </div>
      <div class="book-detail">
        <span>{{ item.chapter }}/{{ item.total }}</span> <i class="more-icon"></i>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .book-list {
    padding: 20px;
    display: grid;
    grid-row-gap: 10px;
    grid-column-gap: 10px;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    height: 100%;
    background-color: rgb(250, 235, 215);
  }
  .book-item {
    display: inline-block;
    .book-cover {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 130px;
      width: 100%;
      text-align: center;
      padding: 5px;
      background-color: dodgerblue;
      color: white;
      font-weight: bold;
      font-size: 16px;
      border-radius: 10px;
      box-shadow: 0 0 10px #ccc;
    }
    .book-detail {
      color: #707070;
      font-size: 14px;
      display: flex;
      align-items: center;
      margin-top: 5px;
      & > span {
        display: inline-block;
        flex: 1;
      }
      & > i {
        width: 16px;
        height: 16px;
      }
    }
  }
</style>
