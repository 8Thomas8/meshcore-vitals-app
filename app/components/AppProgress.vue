<script setup lang="ts">
defineProps<{ value?: number }>()
</script>

<template>
  <ProgressRoot class="h-1 overflow-hidden rounded-full bg-current/20" :model-value="value ?? null">
    <ProgressIndicator
      class="h-full bg-current transition-transform duration-300 data-[state=indeterminate]:w-2/5 data-[state=indeterminate]:animate-indeterminate"
      :style="value === undefined ? undefined : { transform: `translateX(${value - 100}%)` }"
    />
  </ProgressRoot>
</template>

<style scoped lang="scss">
.progress-top {
  position: absolute;
  inset: 0 0 auto;
  border-radius: 0;
}
</style>
