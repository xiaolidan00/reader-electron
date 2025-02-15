<template>
  <Drawer :show="isSet" @hide="onHide">
    <div class="chapter-set">
      <table>
        <!-- <tr>
          <td>字体大小</td>
          <td><input type="range" v-model="state.fontSize" @change="onFontSize" /></td>
        </tr> -->
        <tr>
          <td>字体颜色</td>
          <td><input type="color" v-model="state.fontColor" @change="onFontColor" /></td>
        </tr>
        <tr>
          <td>背景颜色</td>
          <td><input type="color" v-model="state.bg" @change="onBg" /></td>
        </tr>
        <tr>
          <td>章节匹配</td>
          <td>
            <select v-model="state.regex" @change="onRegex">
              <option value="">自动识别</option>
              <option v-for="(item, idx) in chapterRegex" :key="idx" :value="item.value">
                {{ item.name }}
              </option>
              <option value="custom">自定义</option>
            </select>
          </td>
        </tr>
        <tr>
          <td>正则表达式</td>
          <td>
            <input v-model="state.regex1" @change="onRegex" type="text" />
          </td>
        </tr>
      </table>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
  import Drawer from './Drawer.vue';
  import { chapterRegex } from '../../data';
  import { bookItem, selectBook } from '../config';
  import { reactive } from 'vue';
  import { onMounted } from 'vue';
  const rr = bookItem.value!.regex;
  const r = chapterRegex.find((a) => a.value == rr);
  const state = reactive({
    regex: rr || '',
    fontSize: Number(localStorage.getItem('fontSize')) || 18,
    fontColor: localStorage.getItem('fontColor') || '#505050',
    bg: localStorage.getItem('bg') || '#faebd7',
    regex1: !r ? bookItem.value!.regex : ''
  });
  withDefaults(
    defineProps<{
      isSet: boolean;
    }>(),
    { isSet: false, total: 0 }
  );
  const emit = defineEmits(['update:isSet']);
  const onHide = () => {
    emit('update:isSet', false);
  };
  //   const onFontSize = () => {
  //     localStorage.setItem('fontSize', state.fontSize + '');
  //     document.documentElement.style.setProperty('--fontSize', state.fontSize + 'px');
  //   };
  const onRegex = () => {
    if (state.regex == 'custom') {
      bookItem.value!.regex = state.regex1;
      window.ipcRenderer.send('chapterRegex', { id: selectBook.value, regex: state.regex1 });
    } else {
      bookItem.value!.regex = state.regex;
      window.ipcRenderer.send('chapterRegex', { id: selectBook.value, regex: state.regex });
    }
  };
  const onFontColor = () => {
    localStorage.setItem('fontColor', state.fontColor);
    document.documentElement.style.setProperty('--font', state.fontColor);
  };
  const onBg = () => {
    localStorage.setItem('bg', state.bg);
    document.documentElement.style.setProperty('--bg', state.bg);
  };
  onMounted(() => {
    document.documentElement.style.setProperty('--font', state.fontColor);
    document.documentElement.style.setProperty('--bg', state.bg);
    // document.documentElement.style.setProperty('--fontSize', state.fontSize + 'px');
  });
</script>

<style lang="scss" scoped>
  .chapter-set {
    line-height: 40px;
    padding: 20px;
    select,
    input[type='text'],
    input[type='color'] {
      background-color: rgba(255, 255, 255, 0.3);
      border: none;
      border-radius: 4px;
      width: 100%;
      height: 40px;
      outline: none;
    }
    table {
      width: 100%;

      tr:not(:last-child) td {
        border-bottom: solid 1px var(--border);
      }
    }
  }
</style>
