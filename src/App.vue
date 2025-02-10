<script setup lang="ts">
  import { ref, computed } from 'vue';
  import List from './components/List.vue';
  import Book from './components/Book.vue';
  import { selectBook } from './config';

  const currentPart = computed(() => {
    return selectBook.value ? Book : List;
  });
</script>

<template>
  <component :is="currentPart"></component>
</template>

<style scoped></style>
