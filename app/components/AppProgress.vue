<script setup lang="ts">
defineProps<{ value?: number }>()
</script>

<template>
  <ProgressRoot class="progress" :model-value="value ?? null">
    <ProgressIndicator class="progress-indicator" :style="value === undefined ? undefined : { transform: `translateX(${value - 100}%)` }" />
  </ProgressRoot>
</template>

<style scoped lang="scss">
.progress {
  position: relative;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: currentColor;
    opacity: 0.2;
  }
}

.progress-top {
  position: absolute;
  inset: 0 0 auto;
  border-radius: 0;
}

.progress-indicator {
  position: relative;
  height: 100%;
  background: currentColor;
  transition: transform 0.3s;

  [data-state='indeterminate'] > & {
    width: 40%;
    animation: indeterminate 1.4s ease-in-out infinite;
  }
}

@keyframes indeterminate {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(250%);
  }
}
</style>
