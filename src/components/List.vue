<script setup lang="ts">
  import { reactive } from 'vue';
  import { selectBook, dataList, bookItem } from '../config';
  import { BookType } from '../../@types';

  const state = reactive({ isEdit: false, checkMap: {}, isAll: false });

  const openTxt = () => {
    window.ipcRenderer.send('openTxt');
  };
  const onReadTxt = (item: BookType) => {
    selectBook.value = item.id;
    bookItem.value = item;
  };
  window.ipcRenderer.on('listTxt', (_event, data) => {
    console.log(data);
    dataList.value = data;
  });
</script>

<template>
  <div class="search-box">
    <div class="search">
      <input placeholder="搜索关键词" type="text" />
      <i class="search-icon"></i>
    </div>
    <i class="more-icon"></i>
  </div>
  <div class="tool-bar">
    <span @click="openTxt()">导入TXT</span>
    <i v-if="state.isEdit" :class="['check', state.isAll ? 'active' : '']"></i>
    <span :class="[state.isEdit ? 'active' : '']" @click="state.isEdit = !state.isEdit"
      >批量操作</span
    >
    <span>删除记录</span>
    <span>删除文件</span>
  </div>
  <div class="book-list">
    <div class="book-item" v-for="item in dataList" :key="item.name">
      <div class="book-top" v-if="state.isEdit">
        <i
          :class="['check', state.checkMap[item.id] ? 'active' : '']"
          @click="state.checkMap[item.id] = !state.checkMap[item.id]"
        ></i>
      </div>

      <div class="book-cover" @click="onReadTxt(item)">
        {{ item.name }}
      </div>
      <div class="book-detail">{{ item.chapter }}/{{ item.total }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .check {
    height: 16px;
    width: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.5);
    border: solid 2px rgba(255, 255, 255, 1);
    border-radius: 4px;
    &.active {
      background-color: skyblue;
      border: solid 2px skyblue;
      content: url(check.svg);
    }
  }
  .search-box {
    padding: 10px;
    display: flex;
    align-items: center;
    & > .search {
      flex: 1;
      border-radius: 20px;
      border: solid 1px #ccc;
      display: flex;
      height: 30px;
      align-items: center;
      padding: 0 10px;
    }

    input {
      flex: 1;

      border: none;
      background-color: transparent;
      text-align: center;
      outline: none;
    }
    i {
      width: 20px;
      height: 20px;
    }
  }
  .tool-bar {
    height: 30px;
    padding: 0 10px;
    & > span {
      height: 30px;
      line-height: 30px;
      display: inline-block;
      padding: 0;
      font-size: 16px;
      padding: 0 20px;
      cursor: pointer;

      &.active {
        color: sk;
      }
    }
  }
  .book-list {
    padding: 10px;
    display: grid;
    grid-row-gap: 10px;
    grid-column-gap: 10px;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    height: calc(100% - 80px);
    background-color: var(--bg);
  }
  .book-item {
    display: inline-block;
    background-color: dodgerblue;
    border-radius: 10px;
    box-shadow: 0 0 10px #ccc;
    text-align: center;
    padding: 5px;
    cursor: pointer;
    .book-top {
      text-align: left;
      position: absolute;
    }

    .book-cover {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 120px;
      width: 100%;
      color: white;
      font-weight: bold;
      font-size: 16px;
    }
    .book-detail {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      display: flex;
      align-items: center;
      margin-top: 5px;
    }
  }
</style>
