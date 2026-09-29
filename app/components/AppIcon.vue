<script setup lang="ts">
withDefaults(defineProps<{ icon: string, size?: number | string }>(), { size: 24 })
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" :width="size" :height="size" aria-hidden="true">
    <path :d="icon" fill="currentColor" />
  </svg>
</template>

<style scoped lang="scss">
.icon {
  display: block;
  flex-shrink: 0;
}
</style>
