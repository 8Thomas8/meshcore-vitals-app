<script setup lang="ts">
const props = defineProps<{ session: Session }>()

const spans = computed(() => {
  const { scans, endedAt } = props.session
  const spans: { color: string, weight: number }[] = []
  scans.forEach((scan, i) => {
    const weight = Math.max(1, (scans[i + 1]?.at ?? endedAt) - scan.at)
    const color = THEME_COLORS[COVERAGE_TONES[scan.level]]
    const last = spans.at(-1)
    if (last?.color === color) last.weight += weight
    else spans.push({ color, weight })
  })
  return spans
})
</script>

<template>
  <div class="flex h-2 gap-px overflow-hidden rounded-full" aria-hidden="true">
    <span v-for="(span, i) in spans" :key="i" class="min-w-0.5 basis-0" :style="{ flexGrow: span.weight, background: span.color }" />
  </div>
</template>
