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
  <div ref="root" class="chart">
    <svg
      :width="width"
      :height="HEIGHT"
      role="img"
      :aria-label="summary"
      @pointermove="onPointer"
      @pointerdown="onPointer"
      @pointerleave="event => event.pointerType === 'mouse' && (hover = null)"
    >
      <g class="grid">
        <line v-for="tick in chart.ticks" :key="tick.value" :x1="PAD.left" :x2="chart.right" :y1="tick.y" :y2="tick.y" />
      </g>
      <g class="axis">
        <text v-for="tick in chart.ticks" :key="tick.value" :x="PAD.left - 6" :y="tick.y" text-anchor="end" dominant-baseline="central">
          {{ formatNumber(tick.value) }}
        </text>
        <text :x="PAD.left - 6" :y="PAD.top - 12" text-anchor="end">m</text>
        <text :x="PAD.left" :y="HEIGHT - 4">0</text>
        <text v-for="tick in chart.distances" :key="tick.value" :x="tick.x" :y="HEIGHT - 4" text-anchor="middle">{{ formatNumber(tick.value / 1000) }}</text>
        <text :x="chart.right" :y="HEIGHT - 4" text-anchor="end">{{ formatDistance(terrain.length) }}</text>
      </g>
      <path class="fresnel" :d="chart.fresnel" />
      <path class="terrain" :d="chart.terrain" />
      <path v-if="chart.intrusion" class="intrusion" :class="`text-${TERRAIN_TONES[terrain.verdict]}`" :d="chart.intrusion" />
      <path class="edge" :d="chart.edge" />
      <line class="mast" :x1="chart.from.x" :x2="chart.from.x" :y1="chart.from.ground" :y2="chart.from.y" />
      <line class="mast" :x1="chart.to.x" :x2="chart.to.x" :y1="chart.to.ground" :y2="chart.to.y" />
      <line class="sight" :x1="chart.from.x" :y1="chart.from.y" :x2="chart.to.x" :y2="chart.to.y" />
      <circle class="end" :cx="chart.from.x" :cy="chart.from.y" r="4" />
      <circle class="end" :cx="chart.to.x" :cy="chart.to.y" r="4" />
      <text class="end-label" :x="chart.from.x + 6" :y="PAD.top - 8">{{ $t('terrain.you') }}</text>
      <text class="end-label" :x="chart.to.x" :y="PAD.top - 8" text-anchor="end">{{ name }}</text>
      <g v-if="terrain.tightest.shortfall > 0" :class="`text-${TERRAIN_TONES[terrain.verdict]}`">
        <circle class="tightest" :cx="chart.tightest.x" :cy="chart.tightest.y" r="4" />
        <text class="tightest-label" :x="chart.tightest.labelX" :y="chart.tightest.labelY" text-anchor="middle">
          {{ $t('terrain.shortfallShort', { height: formatNumber(terrain.tightest.shortfall) }) }}
        </text>
      </g>
      <template v-if="tooltip">
        <line class="crosshair" :x1="tooltip.x" :x2="tooltip.x" :y1="PAD.top" :y2="chart.bottom" />
        <circle class="dot" :cx="tooltip.x" :cy="tooltip.y" r="3.5" />
      </template>
    </svg>
    <div v-if="tooltip" class="tooltip" :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }">
      <div class="font-mono font-weight-medium">{{ formatDistance(tooltip.point.distance) }} · {{ formatNumber(tooltip.point.ground) }} m</div>
      <div class="text-small text-medium-emphasis">
        {{ $t(tooltip.point.clearance >= 0 ? 'terrain.belowSight' : 'terrain.aboveSight', { height: formatNumber(Math.abs(tooltip.point.clearance)) }) }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chart {
  position: relative;
  touch-action: pan-y;

  svg {
    display: block;
  }
}

.grid line {
  stroke: rgba(var(--v-theme-on-surface), 0.1);
}

.axis,
.axis text {
  fill: rgba(var(--v-theme-on-surface), 0.6);
  font-family: var(--font-mono);
  font-size: 10px;
}

.fresnel {
  fill: rgba(var(--v-theme-primary), 0.1);
  stroke: rgba(var(--v-theme-primary), 0.35);
  stroke-dasharray: 3 3;
}

.terrain {
  fill: rgba(var(--v-theme-on-surface), 0.12);
}

.intrusion {
  fill: currentColor;
  fill-opacity: 0.45;
}

.edge {
  fill: none;
  stroke: rgba(var(--v-theme-on-surface), 0.55);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.mast {
  stroke: rgba(var(--v-theme-on-surface), 0.8);
  stroke-width: 1.5;
}

.sight {
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2;
  stroke-linecap: round;
}

.end {
  fill: rgb(var(--v-theme-primary));
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 2;
}

.end-label {
  fill: rgb(var(--v-theme-on-surface));
  font-size: 11px;
  font-weight: 500;
}

.tightest {
  fill: currentColor;
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 2;
}

.tightest-label {
  fill: currentColor;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  paint-order: stroke;
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 4px;
  stroke-linejoin: round;
}

.crosshair {
  stroke: rgba(var(--v-theme-on-surface), 0.4);
}

.dot {
  fill: rgb(var(--v-theme-on-surface));
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 2;
}

.tooltip {
  position: absolute;
  width: 150px;
  padding: 6px 10px;
  border-radius: 10px;
  pointer-events: none;
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--glass-border);
}
</style>
