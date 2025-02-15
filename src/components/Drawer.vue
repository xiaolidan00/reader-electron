<template>
  <div class="drawer-bg" v-show="show">
    <div class="drawer-blank" @click="onHide()"></div>
    <div class="drawer-body">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps({
    show: Boolean
  });
  const emit = defineEmits(['hide']);

  const onHide = () => {
    emit('hide', false);
  };
</script>
