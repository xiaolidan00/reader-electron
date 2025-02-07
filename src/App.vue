<script setup lang="ts">
  import { ref, computed } from 'vue';
  import List from './components/List.vue';
  import Book from './components/Book.vue';

  const isBookRef = ref<boolean>(false);
  const currentPart = computed(() => {
    return isBookRef.value ? Book : List;
  });
</script>

<template>
  <component :is="currentPart"></component>
</template>

<style scoped></style>
