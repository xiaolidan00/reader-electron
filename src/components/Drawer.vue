<template>
  <div class="drawer-bg" v-show="show">
    <div class="drawer-blank" @click.self="onHide()"></div>
    <div class="drawer-body">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {debounce} from "lodash-es";
  import {watch} from "vue";
  const props = withDefaults(defineProps<{show: boolean; onShow?: Function}>(), {
    show: false
  });
  const emit = defineEmits(["hide"]);

  const showFun = debounce(() => {
    if (props.onShow) {
      props.onShow();
    }
  }, 100);
  watch(
    () => props.show,
    (v) => {
      if (v) {
        showFun();
      }
    }
  );

  const onHide = () => {
    emit("hide", false);
  };
</script>
