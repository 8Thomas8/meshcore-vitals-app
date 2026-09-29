<script setup lang="ts">
const props = defineProps<{
  terrain: TerrainAnalysis
  name: string
}>()

const { t } = useI18n()
const { formatNumber, formatDistance } = useFormat()

const HEIGHT = 180
const PAD = { top: 22, right: 12, bottom: 22, left: 38 }

const root = ref<HTMLElement | null>(null)
const width = ref(320)
const hover = ref<number | null>(null)
let observer: ResizeObserver | undefined

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    width.value = entry!.contentRect.width
  })
  observer.observe(root.value!)
})

onBeforeUnmount(() => observer?.disconnect())

type Point = { x: number, y: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function path(points: Point[]) {
  return points.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join('')
}

function band(upper: Point[], lower: Point[]) {
  return `${path([...upper, ...lower.reverse()])}Z`
}

function steps(first: number, last: number, step: number) {
  return Array.from({ length: Math.max(0, Math.floor((last - first) / step) + 1) }, (_, i) => first + i * step)
}

const chart = computed(() => {
  const { points, length, from, to, tightest } = props.terrain
  const low = Math.min(...points.map(point => point.surface))
  const high = Math.max(...points.map(point => Math.max(point.surface, point.sight + point.radius)))
  const step = [25, 50, 100, 200, 500, 1000].find(value => (high - low) / value <= 5) ?? 2000
  const bottomValue = Math.floor((low - step * 0.3) / step) * step
  const topValue = Math.ceil(high / step) * step
  const kmStep = [1000, 2000, 5000, 10000, 20000, 50000].find(value => length / value <= 4) ?? 100000
  const bottom = HEIGHT - PAD.bottom
  const right = width.value - PAD.right
  const x = (meters: number) => PAD.left + meters / length * (right - PAD.left)
  const y = (meters: number) => PAD.top + (topValue - meters) / (topValue - bottomValue) * (bottom - PAD.top)
  const at = (distance: number, height: number) => ({ x: x(distance), y: y(height) })
  const edge = path(points.map(point => at(point.distance, point.surface)))
  return {
    x,
    y,
    edge,
    terrain: `${edge}L${right},${bottom}L${PAD.left},${bottom}Z`,
    fresnel: band(
      points.map(point => at(point.distance, point.sight + point.radius)),
      points.map(point => at(point.distance, point.sight - point.radius))
    ),
    intrusion: intrusions(points).map(run => band(
      run.map(point => at(point.distance, point.top)),
      run.map(point => at(point.distance, point.bottom))
    )).join(''),
    ticks: steps(bottomValue, topValue, step).map(value => ({ value, y: y(value) })),
    distances: steps(kmStep, (Math.ceil(length / kmStep - 0.4) - 1) * kmStep, kmStep).map(value => ({ value, x: x(value) })),
    from: { x: x(0), y: y(from), ground: y(points[0]!.ground) },
    to: { x: right, y: y(to), ground: y(points.at(-1)!.ground) },
    tightest: {
      ...at(tightest.distance, tightest.surface),
      labelX: clamp(x(tightest.distance), PAD.left + 44, right - 44),
      labelY: clamp(y(tightest.surface) + 30, y(tightest.sight) + 16, bottom - 6)
    },
    bottom,
    right
  }
})

function onPointer(event: PointerEvent) {
  const share = (event.clientX - (event.currentTarget as SVGElement).getBoundingClientRect().left - PAD.left) / (chart.value.right - PAD.left)
  hover.value = Math.round(clamp(share, 0, 1) * (props.terrain.points.length - 1))
}

const tooltip = computed(() => {
  const point = hover.value === null ? null : props.terrain.points[hover.value]
  if (!point) return null
  const x = chart.value.x(point.distance)
  const y = chart.value.y(point.surface)
  return { point, x, y, left: clamp(x - 75, 0, width.value - 150), top: y > HEIGHT / 2 ? 0 : HEIGHT - 58 }
})

const summary = computed(() => t(props.terrain.tightest.shortfall > 0 ? 'terrain.chartShortfall' : 'terrain.chartSpare', {
  length: formatDistance(props.terrain.length),
  verdict: t(`terrain.verdict.${props.terrain.verdict}`),
  distance: formatDistance(props.terrain.tightest.distance),
  height: formatNumber(Math.abs(props.terrain.tightest.shortfall))
}))
</script>

<template>
  <div ref="root" class="relative touch-pan-y">
    <svg
      :width="width"
      :height="HEIGHT"
      role="img"
      :aria-label="summary"
      @pointermove="onPointer"
      @pointerdown="onPointer"
      @pointerleave="event => event.pointerType === 'mouse' && (hover = null)"
    >
      <g class="stroke-on-surface/10">
        <line v-for="tick in chart.ticks" :key="tick.value" :x1="PAD.left" :x2="chart.right" :y1="tick.y" :y2="tick.y" />
      </g>
      <g class="fill-on-surface/60 font-mono text-[10px]">
        <text v-for="tick in chart.ticks" :key="tick.value" :x="PAD.left - 6" :y="tick.y" text-anchor="end" dominant-baseline="central">
          {{ formatNumber(tick.value) }}
        </text>
        <text :x="PAD.left - 6" :y="PAD.top - 12" text-anchor="end">m</text>
        <text :x="PAD.left" :y="HEIGHT - 4">0</text>
        <text v-for="tick in chart.distances" :key="tick.value" :x="tick.x" :y="HEIGHT - 4" text-anchor="middle">{{ formatNumber(tick.value / 1000) }}</text>
        <text :x="chart.right" :y="HEIGHT - 4" text-anchor="end">{{ formatDistance(terrain.length) }}</text>
      </g>
      <path class="fill-primary/10 stroke-primary/35" stroke-dasharray="3 3" :d="chart.fresnel" />
      <path class="fill-on-surface/12" :d="chart.terrain" />
      <path v-if="chart.intrusion" fill="currentColor" fill-opacity="0.45" :class="`text-${TERRAIN_TONES[terrain.verdict]}`" :d="chart.intrusion" />
      <path class="stroke-on-surface/55" fill="none" stroke-width="1.5" stroke-linejoin="round" :d="chart.edge" />
      <line class="stroke-on-surface/80" stroke-width="1.5" :x1="chart.from.x" :x2="chart.from.x" :y1="chart.from.ground" :y2="chart.from.y" />
      <line class="stroke-on-surface/80" stroke-width="1.5" :x1="chart.to.x" :x2="chart.to.x" :y1="chart.to.ground" :y2="chart.to.y" />
      <line class="stroke-primary" stroke-width="2" stroke-linecap="round" :x1="chart.from.x" :y1="chart.from.y" :x2="chart.to.x" :y2="chart.to.y" />
      <circle class="fill-primary stroke-surface" stroke-width="2" :cx="chart.from.x" :cy="chart.from.y" r="4" />
      <circle class="fill-primary stroke-surface" stroke-width="2" :cx="chart.to.x" :cy="chart.to.y" r="4" />
      <text class="fill-on-surface text-[11px] font-medium" :x="chart.from.x + 6" :y="PAD.top - 8">{{ $t('terrain.you') }}</text>
      <text class="fill-on-surface text-[11px] font-medium" :x="chart.to.x" :y="PAD.top - 8" text-anchor="end">{{ name }}</text>
      <g v-if="terrain.tightest.shortfall > 0" :class="`text-${TERRAIN_TONES[terrain.verdict]}`">
        <circle class="stroke-surface" fill="currentColor" stroke-width="2" :cx="chart.tightest.x" :cy="chart.tightest.y" r="4" />
        <text class="stroke-surface font-mono text-[10px] font-medium" fill="currentColor" paint-order="stroke" stroke-width="4" stroke-linejoin="round" :x="chart.tightest.labelX" :y="chart.tightest.labelY" text-anchor="middle">
          {{ $t('terrain.shortfallShort', { height: formatNumber(terrain.tightest.shortfall) }) }}
        </text>
      </g>
      <template v-if="tooltip">
        <line class="stroke-on-surface/40" :x1="tooltip.x" :x2="tooltip.x" :y1="PAD.top" :y2="chart.bottom" />
        <circle class="fill-on-surface stroke-surface" stroke-width="2" :cx="tooltip.x" :cy="tooltip.y" r="3.5" />
      </template>
    </svg>
    <div v-if="tooltip" class="chart-tooltip w-37.5" :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }">
      <div class="font-mono font-medium">{{ formatDistance(tooltip.point.distance) }} · {{ formatNumber(tooltip.point.ground) }} m</div>
      <div class="text-small text-medium">
        {{ $t(tooltip.point.clearance >= 0 ? 'terrain.belowSight' : 'terrain.aboveSight', { height: formatNumber(Math.abs(tooltip.point.clearance)) }) }}
      </div>
    </div>
  </div>
</template>
