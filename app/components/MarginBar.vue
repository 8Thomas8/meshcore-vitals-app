<script setup lang="ts">
const props = defineProps<{ margin: LinkMargin | null }>()

const fill = computed(() => props.margin ? Math.min(1, Math.max(0, props.margin.value / MARGIN_GAUGE_FULL_DB)) : 0)
</script>

<template>
  <span class="relative block h-1 overflow-hidden rounded-sm bg-on-surface/14" :class="margin && `text-${margin.tone}`" aria-hidden="true">
    <span class="absolute inset-y-0 start-0 bg-current" :style="{ width: `${fill * 100}%` }" />
  </span>
</template>
