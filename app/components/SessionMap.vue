<script setup lang="ts">
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

const props = defineProps<{ session: Session }>()

const { t } = useI18n()
const container = ref<HTMLElement | null>(null)
let map: MapLibreMap | undefined
let unmounted = false
let attributionTimer: ReturnType<typeof setTimeout> | undefined

function colorOf(repeater: SessionRepeater): string {
  const { spreadingFactor } = props.session
  if (repeater.hops || repeater.rx === null || spreadingFactor === null) return MAP_MUTED_COLOR
  return THEME_COLORS[linkMargin(Math.min(repeater.rx, repeater.tx ?? repeater.rx), spreadingFactor).tone]
}

const features = computed(() => {
  const track = props.session.scans.filter(scan => scan.position)
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...track.slice(1).map((scan, i) => ({
        type: 'Feature' as const,
        properties: { kind: 'track', color: THEME_COLORS[COVERAGE_TONES[scan.level]] },
        geometry: { type: 'LineString' as const, coordinates: [[track[i]!.position!.lon, track[i]!.position!.lat], [scan.position!.lon, scan.position!.lat]] }
      })),
      ...track.map(scan => ({
        type: 'Feature' as const,
        properties: { kind: 'scan', color: THEME_COLORS[COVERAGE_TONES[scan.level]] },
        geometry: { type: 'Point' as const, coordinates: [scan.position!.lon, scan.position!.lat] }
      })),
      ...props.session.repeaters.filter(repeater => repeater.position).map(repeater => ({
        type: 'Feature' as const,
        properties: { kind: 'repeater', color: colorOf(repeater) },
        geometry: { type: 'Point' as const, coordinates: [repeater.position!.lon, repeater.position!.lat] }
      }))
    ]
  }
})

onMounted(async () => {
  const { AttributionControl, LngLatBounds, Map: MapLibre, setWorkerUrl } = await import('maplibre-gl')
  if (unmounted) return
  setWorkerUrl(workerUrl)
  const bounds = new LngLatBounds()
  for (const feature of features.value.features) {
    if (feature.geometry.type === 'Point') bounds.extend(feature.geometry.coordinates as [number, number])
  }
  map = new MapLibre({
    container: container.value!,
    style: MAP_STYLE_URL,
    bounds,
    fitBoundsOptions: { padding: 32, maxZoom: 14 },
    interactive: false,
    attributionControl: false,
    locale: {
      'Map.Title': t('map.title'),
      'AttributionControl.ToggleAttribution': t('map.toggleAttribution')
    }
  })
  map.addControl(new AttributionControl({ compact: true }), 'top-right')
  const attribution = container.value!.querySelector('.maplibregl-ctrl-attrib')!
  const fold = () => {
    clearTimeout(attributionTimer)
    attribution.classList.remove('maplibregl-compact-show')
  }
  attributionTimer = setTimeout(fold, MAP_ATTRIBUTION_FOLD_MS)
  map.on('load', () => {
    paintDark(map!)
    map!.addSource('session', { type: 'geojson', data: features.value })
    map!.addLayer({
      id: 'track',
      type: 'line',
      source: 'session',
      filter: ['==', ['get', 'kind'], 'track'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 4 }
    })
    map!.addLayer({
      id: 'scans',
      type: 'circle',
      source: 'session',
      filter: ['==', ['get', 'kind'], 'scan'],
      paint: { 'circle-radius': 3, 'circle-color': ['get', 'color'] }
    })
    map!.addLayer({
      id: 'repeaters',
      type: 'circle',
      source: 'session',
      filter: ['==', ['get', 'kind'], 'repeater'],
      paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }
    })
  })
})

watch(features, (data) => {
  map?.getSource<GeoJSONSource>('session')?.setData(data)
})

onBeforeUnmount(() => {
  unmounted = true
  clearTimeout(attributionTimer)
  map?.remove()
})
</script>

<template>
  <div ref="container" class="session-map isolate overflow-hidden rounded-2xl border border-glass-border" />
</template>

<style scoped lang="scss">
.session-map {
  :deep(.maplibregl-canvas) {
    filter: brightness(0.75);
  }

  :deep(.maplibregl-ctrl-attrib) {
    background: rgba(var(--theme-background), 0.6);
    color: rgba(var(--theme-on-surface), 0.6);

    a {
      color: inherit;
    }
  }

  :deep(.maplibregl-ctrl-attrib-button) {
    filter: invert(1);
  }
}
</style>
