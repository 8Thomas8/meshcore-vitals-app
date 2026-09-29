<script setup lang="ts">
import { mdiChevronDown, mdiChevronUp } from '@mdi/js'

const props = defineProps<{
  row: RepeaterRow
}>()

const { formatNumber, formatDistance } = useFormat()
const { position: here } = useDevicePosition()
const { selfInfo } = useRepeaters()
const { heights } = useTerrain()
const open = ref(false)

const yourHeight = computed(() => heights.value.you)
const repeaterHeight = computed(() => heights.value.repeaters[props.row.repeater.id] ?? DEFAULT_REPEATER_ANTENNA_M)
const ground = computed(() => open.value && here.value && props.row.position ? groundBetween(here.value, props.row.position) : null)
const terrain = computed(() => {
  if (!ground.value || !here.value || !props.row.position || !selfInfo.value) return null
  const length = distanceMeters(here.value, props.row.position)
  return analyzeTerrain(ground.value, length, yourHeight.value, repeaterHeight.value, selfInfo.value.radioFreq)
})

const toggle = ref<HTMLButtonElement | null>(null)
const draftYou = ref<number | string>(yourHeight.value)
const draftRepeater = ref<number | string>(repeaterHeight.value)
watch([yourHeight, repeaterHeight, () => props.row.repeater.id], cancel)
watch(() => props.row.repeater.id, () => {
  open.value = false
})

function valid(value: number | string) {
  return typeof value === 'number' && value >= 0 && value <= MAX_ANTENNA_M
}

const dirty = computed(() => draftYou.value !== yourHeight.value || draftRepeater.value !== repeaterHeight.value)
const ready = computed(() => valid(draftYou.value) && valid(draftRepeater.value))

function cancel() {
  draftYou.value = yourHeight.value
  draftRepeater.value = repeaterHeight.value
}

function apply() {
  if (!ready.value) return
  const repeaters = { ...heights.value.repeaters, [props.row.repeater.id]: draftRepeater.value as number }
  heights.value = {
    you: draftYou.value as number,
    repeaters: Object.fromEntries(Object.entries(repeaters).filter(([, height]) => height !== DEFAULT_REPEATER_ANTENNA_M))
  }
}

function retry() {
  retryElevations()
  toggle.value?.focus()
}

function reset() {
  draftYou.value = DEFAULT_YOUR_ANTENNA_M
  draftRepeater.value = DEFAULT_REPEATER_ANTENNA_M
  apply()
}
</script>

<template>
  <section v-if="here && row.position && selfInfo && row.distance" class="section">
    <button ref="toggle" type="button" class="toggle d-flex align-center ga-2" :aria-expanded="open" :aria-controls="open ? 'terrain-body' : undefined" @click="open = !open">
      <span class="d-flex flex-column align-start ga-1 flex-grow-1 min-w-0">
        <span class="font-weight-medium">{{ $t('terrain.title') }}</span>
        <span v-if="open" class="d-flex align-center flex-wrap ga-2" aria-live="polite">
          <template v-if="terrain">
            <span class="chip chip-small" :class="`text-${TERRAIN_TONES[terrain.verdict]}`">{{ $t(`terrain.verdict.${terrain.verdict}`) }}</span>
            <span class="text-small text-medium-emphasis">
              {{ $t(terrain.tightest.shortfall > 0 ? 'terrain.shortfall' : 'terrain.spare', { height: formatNumber(Math.abs(terrain.tightest.shortfall)) }) }}
            </span>
          </template>
          <span v-else class="chip chip-small" :class="{ pulse: ground === undefined }">
            {{ ground === undefined ? $t('terrain.lookingUp') : $t(elevationThrottled ? 'terrain.throttled' : 'terrain.failed') }}
          </span>
        </span>
      </span>
      <AppIcon :icon="open ? mdiChevronUp : mdiChevronDown" class="text-medium-emphasis" />
    </button>

    <div v-if="open && terrain" id="terrain-body" class="d-flex flex-column ga-3">
      <TerrainChart :terrain="terrain" :name="row.name" />
      <div class="stats">
        <VitalStat
          :label="$t(terrain.tightest.clearance >= 0 ? 'terrain.groundBelow' : 'terrain.groundAbove')"
          :value="formatNumber(Math.abs(terrain.tightest.clearance))"
          unit="m"
          :hint="$t('terrain.tightestAt', { distance: formatDistance(terrain.tightest.distance) })"
        />
        <VitalStat
          :label="$t(terrain.tightest.shortfall > 0 ? 'terrain.missing' : 'terrain.room')"
          :value="formatNumber(Math.abs(terrain.tightest.shortfall))"
          unit="m"
          :tone="TERRAIN_TONES[terrain.verdict]"
          :hint="$t('terrain.needed', { height: formatNumber(FRESNEL_CLEAR_SHARE * terrain.tightest.radius) })"
        />
      </div>
      <p class="text-small text-medium-emphasis ma-0">{{ $t(`terrain.explain.${terrain.verdict}`) }}</p>

      <form class="d-flex flex-column ga-2" novalidate @submit.prevent="apply">
        <div class="stats">
          <label class="field">
            <span class="text-small text-medium-emphasis">{{ $t('terrain.yourAntenna') }}</span>
            <span class="field-box" :class="{ invalid: !valid(draftYou) }">
              <input v-model.number="draftYou" type="number" inputmode="decimal" min="0" :max="MAX_ANTENNA_M" step="0.5" :aria-invalid="!valid(draftYou)">
              <span class="text-medium-emphasis">m</span>
            </span>
            <span class="text-small" :class="valid(draftYou) ? 'text-medium-emphasis' : 'text-error'">
              {{ valid(draftYou) ? yourHeight === DEFAULT_YOUR_ANTENNA_M ? $t('terrain.default') : $t('terrain.defaultValue', { height: formatNumber(DEFAULT_YOUR_ANTENNA_M, 1) }) : $t('terrain.invalid', { max: MAX_ANTENNA_M }) }}
            </span>
          </label>
          <label class="field">
            <span class="text-small text-medium-emphasis">{{ $t('terrain.repeaterAntenna') }}</span>
            <span class="field-box" :class="{ invalid: !valid(draftRepeater) }">
              <input v-model.number="draftRepeater" type="number" inputmode="decimal" min="0" :max="MAX_ANTENNA_M" step="0.5" :aria-invalid="!valid(draftRepeater)">
              <span class="text-medium-emphasis">m</span>
            </span>
            <span class="text-small" :class="valid(draftRepeater) ? 'text-medium-emphasis' : 'text-error'">
              {{ valid(draftRepeater) ? repeaterHeight === DEFAULT_REPEATER_ANTENNA_M ? $t('terrain.default') : $t('terrain.defaultValue', { height: formatNumber(DEFAULT_REPEATER_ANTENNA_M) }) : $t('terrain.invalid', { max: MAX_ANTENNA_M }) }}
            </span>
          </label>
        </div>
        <div class="d-flex align-baseline ga-3">
          <span class="text-small text-disabled flex-grow-1">{{ $t('terrain.heightsHelp') }}</span>
          <button
            v-if="yourHeight !== DEFAULT_YOUR_ANTENNA_M || repeaterHeight !== DEFAULT_REPEATER_ANTENNA_M"
            type="button"
            class="btn text-primary"
            @click="reset"
          >
            {{ $t('terrain.reset') }}
          </button>
        </div>
        <span class="d-sr-only" aria-live="polite">{{ dirty ? $t('terrain.pending') : '' }}</span>
        <div v-if="dirty" class="pending d-flex align-center flex-wrap ga-2">
          <span class="text-small flex-grow-1">{{ $t('terrain.pending') }}</span>
          <button type="button" class="btn text-primary" @click="cancel">{{ $t('terrain.cancel') }}</button>
          <button type="submit" class="btn btn-filled" :disabled="!ready">{{ $t('terrain.apply') }}</button>
        </div>
      </form>

      <i18n-t keypath="terrain.source" tag="p" class="text-small text-disabled ma-0" scope="global">
        <template #dem><a class="text-primary text-decoration-none" href="https://doi.org/10.5270/ESA-c5d3d65" target="_blank" rel="noopener">Copernicus DEM GLO-90</a></template>
        <template #api><a class="text-primary text-decoration-none" href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></template>
        <template #frequency>{{ formatNumber(selfInfo.radioFreq / 1000, 3) }}</template>
      </i18n-t>
    </div>
    <AppProgress v-else-if="open && ground === undefined" id="terrain-body" class="text-primary" :aria-label="$t('terrain.lookingUp')" />
    <div v-else-if="open && ground === null" id="terrain-body" class="d-flex flex-column align-start ga-2">
      <p v-if="elevationThrottled" class="text-small text-medium-emphasis ma-0">{{ $t('terrain.throttledHelp') }}</p>
      <button type="button" class="btn btn-tonal text-primary" @click="retry">{{ $t('terrain.retry') }}</button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.toggle {
  margin: -6px;
  padding: 6px;
  border: 0;
  border-radius: 12px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: rgba(var(--theme-on-surface), 0.06);
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(var(--theme-on-surface), 0.38);
  border-radius: 12px;

  &:focus-within {
    border-color: rgb(var(--theme-primary));
    box-shadow: inset 0 0 0 1px rgb(var(--theme-primary));
  }

  &.invalid {
    border-color: rgb(var(--theme-error));
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: none;
  }
}

.pending {
  padding: 8px 8px 8px 12px;
  border-radius: 14px;
  background: rgba(var(--theme-primary), 0.08);
  border: 1px solid rgba(var(--theme-primary), 0.3);
}
</style>
