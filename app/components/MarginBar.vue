<script setup lang="ts">
const props = defineProps<{ margin: LinkMargin | null }>()

const SEGMENTS = [[0, MARGIN_FAIR_DB], [MARGIN_FAIR_DB, MARGIN_COMFORTABLE_DB], [MARGIN_COMFORTABLE_DB, MARGIN_GAUGE_FULL_DB]] as const

const fills = computed(() => SEGMENTS.map(([from, to]) => props.margin ? Math.min(1, Math.max(0, (props.margin.value - from) / (to - from))) : 0))
</script>

<template>
  <span class="flex h-1.25 gap-0.5" :class="margin && `text-${margin.tone}`" aria-hidden="true">
    <span
      v-for="(fill, i) in fills"
      :key="i"
      class="relative basis-0 overflow-hidden rounded-full bg-on-surface/14"
      :style="{ flexGrow: SEGMENTS[i]![1] - SEGMENTS[i]![0] }"
    >
      <span class="absolute inset-y-0 start-0 bg-current" :style="{ width: `${fill * 100}%` }" />
    </span>
  </span>
</template>
