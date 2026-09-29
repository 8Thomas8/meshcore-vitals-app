<script setup lang="ts">
withDefaults(defineProps<{ icon: string, size?: number | string }>(), { size: 24 })
</script>

<template>
  <svg class="shrink-0" viewBox="0 0 24 24" :width="size" :height="size" aria-hidden="true">
    <path :d="icon" fill="currentColor" />
  </svg>
</template>
