<script setup lang="ts">
const props = defineProps<{ session: Session }>()

const { t } = useI18n()
const { formatNumber } = useFormat()

const spans = computed(() => {
  const { scans, endedAt } = props.session
  const spans: { level: CoverageLevel, weight: number }[] = []
  scans.forEach((scan, i) => {
    const weight = Math.max(1, (scans[i + 1]?.at ?? endedAt) - scan.at)
    const last = spans.at(-1)
    if (last?.level === scan.level) last.weight += weight
    else spans.push({ level: scan.level, weight })
  })
  return spans
})

const summary = computed(() => {
  const total = spans.value.reduce((sum, span) => sum + span.weight, 0)
  const shares = new Map<CoverageLevel, number>()
  spans.value.forEach(({ level, weight }) => shares.set(level, (shares.get(level) ?? 0) + weight))
  return [...shares]
    .sort((a, b) => b[1] - a[1])
    .map(([level, weight]) => t('coverage.share', { level: t(`coverage.level.${level}`), percent: formatNumber(Math.max(1, Math.round(weight / total * 100))) }))
    .join(', ')
})
</script>

<template>
  <div class="flex h-3 items-end gap-px overflow-hidden rounded-sm" role="img" :aria-label="summary">
    <span
      v-for="(span, i) in spans"
      :key="i"
      class="min-w-0.5 basis-0 rounded-[1px]"
      :style="{ flexGrow: span.weight, height: COVERAGE_HEIGHTS[span.level], background: THEME_COLORS[COVERAGE_TONES[span.level]] }"
    />
  </div>
</template>
