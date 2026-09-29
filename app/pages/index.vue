<script setup lang="ts">
import { mdiChevronDown, mdiChevronRight, mdiChevronUp, mdiEye, mdiEyeOff, mdiInformationOutline, mdiRadar } from '@mdi/js'
import { useMediaQuery } from '@vueuse/core'

// The layout only shows the pages while a node is connected.
const { connection } = useMeshCore()
const { repeaters, selfInfo, contacts, scanUntil, scannedAt, lastScanAttempt, lastFullScanAt, autoScan, scanError, start, scan } = useRepeaters()

const smAndDown = useMediaQuery(SM_AND_DOWN_QUERY)
const { t } = useI18n()
const { ago, hops, message, formatNumber, formatDistance } = useFormat()
const { supported: wakeLockSupported, enabled: keepScreenOn, active: screenKeptOn } = useWakeLock()
const { position: here, unavailable: noLocation, locatedAt, locate } = useDevicePosition()
const heading = ref<number | null>(null)
const now = ref(Date.now())
const summary = ref<HTMLElement | null>(null)
let clock: ReturnType<typeof setInterval> | undefined

// Folded down to its header to give the map the room. Remembered on this
// device only, storage may be blocked.
const listHidden = ref(false)
const list = ref<HTMLElement | null>(null)
watch(listHidden, (hidden) => {
  try {
    localStorage.setItem(LIST_HIDDEN_STORAGE_KEY, String(hidden))
  }
  catch {
    // Stays for this visit only.
  }
})

// Only the absolute event is relative to north.
function onOrientation(event: DeviceOrientationEvent) {
  if (event.absolute && event.alpha !== null) heading.value = (360 - event.alpha) % 360
}

onMounted(() => {
  start(connection.value!)
  clock = setInterval(() => {
    now.value = Date.now()
    // Auto scans only run while this page is shown and the tab is visible.
    if (autoScan.value && !document.hidden && nextScanAt.value !== null && now.value >= nextScanAt.value) scan()
  }, 1000)
  window.addEventListener('deviceorientationabsolute', onOrientation)
  try {
    listHidden.value = localStorage.getItem(LIST_HIDDEN_STORAGE_KEY) === 'true'
  }
  catch {
    // Shown by default.
  }
})

onBeforeUnmount(() => {
  clearInterval(clock)
  window.removeEventListener('deviceorientationabsolute', onOrientation)
})

watch(lastScanAttempt, (at) => {
  if (at) locate()
})

const scanning = computed(() => scanUntil.value !== null)
const nextScanAt = computed(() => autoScan.value && !scanning.value ? (lastScanAttempt.value ?? 0) + AUTO_SCAN_INTERVAL_MS : null)
const scanLeftMs = computed(() => scanUntil.value && Math.max(0, scanUntil.value - now.value))
const scanProgress = computed(() => scanLeftMs.value === null ? 0 : 100 * (1 - scanLeftMs.value / DISCOVER_WINDOW_MS))

const repeaterContacts = computed(() => contacts.value
  .filter(contact => contact.type === ADV_TYPE_REPEATER)
  .map(contact => ({ id: toHex(contact.publicKey), contact })))

// A path hash can match several contacts, then none is picked.
function contactFor(id: string) {
  const matches = repeaterContacts.value.filter(entry => entry.id.startsWith(id))
  return matches.length === 1 ? matches[0]!.contact : null
}

function margin(sample: LinkSample | null) {
  return sample && selfInfo.value ? linkMargin(sample.snr, selfInfo.value.radioSf) : null
}

function weaker(rx: LinkMargin | null, tx: LinkMargin | null) {
  return rx && tx && tx.value < rx.value ? tx : rx ?? tx
}

function nameOf(id: string): string {
  const heard = repeaters.value.find(repeater => repeater.id.startsWith(id))
  return heard?.name ?? contactFor(heard?.id ?? id)?.advName ?? t('repeaters.unnamed', { id: id.slice(0, 8).toUpperCase() })
}

const rows = computed(() => repeaters.value
  .map((repeater): RepeaterRow => {
    const contact = contactFor(repeater.id)
    const position = repeater.position ?? (contact && toPosition(contact.advLat, contact.advLon))
    const distance = here.value && position ? distanceMeters(here.value, position) : null
    const altitude = position ? elevationAt(position) : null
    const viaName = repeater.via && nameOf(repeater.via)
    const rx = margin(repeater.rx)
    const tx = margin(repeater.tx)
    const outOfRange = isOutOfRange(repeater, lastFullScanAt.value)
    const route = repeater.hops
      ? t('repeaters.via', { hops: hops(repeater.hops), name: viaName ?? t('repeaters.unknown') })
      : outOfRange ? t('repeaters.outOfRange') : t('repeaters.direct')
    const details = [
      distance !== null && formatDistance(distance),
      typeof altitude === 'number' && t('repeaters.altitude', { altitude: formatNumber(altitude) }),
      ago(repeater.lastHeard, now.value)
    ]
    return {
      repeater,
      name: nameOf(repeater.id),
      viaName,
      // The route may wrap, each other part stays whole.
      details: [route, ...details.filter(part => typeof part === 'string').map(part => part.replaceAll(' ', '\u00a0'))].join(' · '),
      position,
      altitude,
      distance,
      bearing: here.value && position ? bearingDegrees(here.value, position) : null,
      // A repeater out of range keeps its last values, not their colors.
      rx: outOfRange ? null : rx,
      tx: outOfRange ? null : tx,
      link: outOfRange ? null : weaker(rx, tx),
      outOfRange
    }
  })
  // Direct ones by link quality, then the closest relayed ones, the ones out
  // of range last.
  .sort((a, b) => Number(a.outOfRange) - Number(b.outOfRange)
    || a.repeater.hops - b.repeater.hops
    || (b.link?.value ?? -Infinity) - (a.link?.value ?? -Infinity)
    || b.repeater.lastHeard - a.repeater.lastHeard))

const showOutOfRange = ref(false)
const inRange = computed(() => rows.value.filter(row => !row.outOfRange))
const outOfRangeCount = computed(() => rows.value.length - inRange.value.length)
const shownRows = computed(() => showOutOfRange.value ? rows.value : inRange.value)

const direct = computed(() => inRange.value.filter(row => !row.repeater.hops))

// By id prefix, the id grows from a path hash to the full key while it is open.
const selectedId = ref<string | null>(null)
const selected = computed(() => {
  const id = selectedId.value
  return id === null ? null : rows.value.find(row => row.repeater.id.startsWith(id) || id.startsWith(row.repeater.id)) ?? null
})
const detailOpen = computed({
  get: () => selected.value !== null,
  set: (open) => {
    if (!open) selectedId.value = null
  }
})

const COVERAGE_TONES = { good: 'success', fair: 'warning', weak: 'error', none: 'error' } as const

const coverage = computed(() => {
  if (!inRange.value.length) return null
  const links = direct.value.flatMap(({ repeater, rx, tx }) =>
    rx && repeater.rx && now.value - repeater.rx.at < COVERAGE_RECENT_MS ? [{ rx: rx.value, tx: tx?.value ?? null }] : [])
  const assessment = assessCoverage(links)
  const { reason, usable, confirmed, solid, unconfirmed } = assessment
  return {
    ...assessment,
    tone: COVERAGE_TONES[assessment.level],
    label: t(`coverage.level.${assessment.level}`),
    reason: reason === 'confirmed' && unconfirmed
      ? `${t('coverage.reason.confirmed', { confirmed, solid }, solid)} ${t('coverage.reason.unscanned', unconfirmed)}`
      : t(`coverage.reason.${reason}`, { usable, confirmed, solid, minutes: COVERAGE_RECENT_MS / 60_000, fair: MARGIN_FAIR_DB }, solid)
  }
})
</script>

<template>
  <div class="page-width screen">
    <!-- Lazy: MapLibre, its styles and its worker only load once there is a map to show. -->
    <LazyMapBackdrop v-if="here" :here="here" :rows="shownRows" :below="summary" :list="list" :located-at="locatedAt" :companion-name="selfInfo?.name ?? null" />
    <section ref="summary" class="glass card summary">
      <AppProgress v-if="scanning" class="progress-top text-primary" :value="scanProgress" />
      <div class="d-flex align-center ga-2">
        <PopoverRoot>
          <PopoverTrigger class="coverage d-flex align-center ga-2 flex-grow-1 min-w-0" :disabled="!coverage">
            <svg class="ring flex-shrink-0" :class="`text-${coverage?.tone ?? 'primary'}`" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
              <circle class="ring-track" cx="20" cy="20" r="18" />
              <circle
                class="ring-fill"
                cx="20"
                cy="20"
                r="18"
                pathLength="100"
                :stroke-dasharray="`${coverage ? Math.min(coverage.usable, COVERAGE_GOOD_USABLE) / COVERAGE_GOOD_USABLE * 100 : 0} 100`"
                transform="rotate(-90 20 20)"
              />
              <text v-if="coverage" class="score font-mono" x="20" y="20" text-anchor="middle" dominant-baseline="central">{{ coverage.usable }}</text>
            </svg>
              <span class="flex-grow-1 min-w-0">
                <span class="d-block text-title headline">{{ coverage?.label ?? (scanning ? $t('scan.scanning') : rows.length ? $t('repeaters.noneInRange') : $t('repeaters.noneYet')) }}</span>
                <span class="d-flex align-center ga-1 text-small text-medium-emphasis min-w-0">
                  <span class="text-truncate">
                    <template v-if="inRange.length">{{ $t('repeaters.counts', { direct: direct.length, relayed: $t('repeaters.relayed', inRange.length - direct.length) }) }}</template>
                    <template v-else>{{ scanning ? $t('scan.waiting') : rows.length ? $t('scan.nothingAnswered') : $t('scan.prompt') }}</template>
                  </span>
                  <AppIcon v-if="coverage" :icon="mdiInformationOutline" size="14" />
                </span>
              </span>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent side="bottom" :side-offset="4" :collision-padding="8" class="popover glass-dense">
              <div class="d-flex flex-column ga-2 py-1">
                <span class="font-weight-medium">{{ coverage?.reason }}</span>
                <span>{{ $t('coverage.help.usable', { minutes: COVERAGE_RECENT_MS / 60_000, fair: MARGIN_FAIR_DB, comfortable: MARGIN_COMFORTABLE_DB }) }}</span>
                <span>{{ $t('coverage.help.levels', { count: COVERAGE_GOOD_USABLE, fair: MARGIN_FAIR_DB }) }}</span>
              </div>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
        <!-- Inert while scanning or on auto, but not disabled: a disabled look is unreadable. -->
        <button
          type="button"
          class="btn action"
          :class="scanning || autoScan ? 'btn-tonal text-primary' : 'btn-filled'"
          :aria-disabled="scanning || autoScan"
          @click="autoScan || scan()"
        >
          <AppIcon :icon="mdiRadar" size="18" />
          <template v-if="scanning">{{ Math.ceil((scanLeftMs ?? 0) / 1000) }} s</template>
          <template v-else-if="nextScanAt !== null && lastScanAttempt">{{ formatCountdown(nextScanAt - now) }}</template>
          <template v-else>{{ $t('scan.button') }}</template>
        </button>
      </div>
      <div class="status-row d-flex align-center ga-2 text-small text-medium-emphasis">
        <span class="dot" :class="[scanning ? 'text-primary' : scanError ? 'text-error' : 'text-success', { pulse: scanning }]" />
        <span v-if="scanError" class="text-error text-truncate">{{ message(scanError) }}</span>
        <span v-else-if="scanning" class="text-truncate">{{ $t('scan.inProgress') }}</span>
        <span v-else class="text-truncate">
          {{ scannedAt ? $t('scan.done', { ago: ago(scannedAt, now) }) : $t('scan.never') }}
          <template v-if="noLocation"> · {{ $t('scan.noLocation') }}</template>
        </span>
        <label class="toggle ms-auto" :title="$t('scan.autoHint', { minutes: AUTO_SCAN_INTERVAL_MS / 60_000 })">
          <SwitchRoot v-model="autoScan" class="switch">
            <SwitchThumb class="switch-thumb" />
          </SwitchRoot>
          {{ $t('scan.auto') }}
        </label>
        <!-- For walking around with the phone in hand. On but refused turns amber. -->
        <label
          v-if="wakeLockSupported"
          class="toggle"
          :class="{ 'text-warning': keepScreenOn && !screenKeptOn }"
          :title="keepScreenOn && !screenKeptOn ? $t('wakeLock.refused') : $t('wakeLock.hint')"
        >
          <SwitchRoot v-model="keepScreenOn" class="switch">
            <SwitchThumb class="switch-thumb" />
          </SwitchRoot>
          {{ $t('wakeLock.label') }}
        </label>
      </div>
    </section>

    <section v-if="rows.length" ref="list" class="glass card bottom list" :style="{ maxHeight: `${LIST_MAX_HEIGHT_SHARE * 100}dvh` }">
      <button
        type="button"
        class="list-toggle d-flex align-center ga-2 text-small"
        :aria-expanded="!listHidden"
        :aria-controls="listHidden ? undefined : 'repeater-rows'"
        @click="listHidden = !listHidden"
      >
        <span class="flex-grow-1 font-weight-medium">{{ $t('repeaters.count', shownRows.length) }}</span>
        <span class="text-medium-emphasis">{{ listHidden ? $t('repeaters.showList') : $t('repeaters.hideList') }}</span>
        <AppIcon :icon="listHidden ? mdiChevronUp : mdiChevronDown" size="20" class="text-medium-emphasis" />
      </button>
      <!-- Unmounted when folded, the rows would keep updating every second. -->
      <div v-if="!listHidden" id="repeater-rows" class="rows">
        <button
          v-for="row in shownRows"
          :key="row.repeater.id"
          type="button"
          class="row"
          :class="{ 'out-of-range': row.outOfRange }"
          @click="selectedId = row.repeater.id"
        >
          <CompassDial
            class="icon"
            :class="row.repeater.hops || row.outOfRange ? 'text-medium-emphasis' : `text-${row.link?.tone ?? 'primary'}`"
            :bearing="row.bearing"
            :heading="heading"
          />
          <span class="name font-weight-medium text-truncate">{{ row.name }}</span>
          <span class="details text-small text-medium-emphasis">{{ row.details }}</span>
          <span v-if="!row.repeater.hops" class="links font-mono text-small">
            <span>
              <span class="text-medium-emphasis">RX </span>
              <span :class="row.rx && `text-${row.rx.tone}`">{{ row.repeater.rx ? `${formatNumber(row.repeater.rx.snr, 2, 0)} dB` : $t('common.na') }}</span>
            </span>
            <span>
              <span class="text-medium-emphasis">TX </span>
              <span :class="row.tx ? `text-${row.tx.tone}` : 'text-disabled'">{{ row.repeater.tx ? `${formatNumber(row.repeater.tx.snr, 2, 0)} dB` : $t('repeaters.txUnknown') }}</span>
            </span>
          </span>
          <AppIcon class="chevron text-medium-emphasis" :icon="mdiChevronRight" />
        </button>
        <button
          v-if="outOfRangeCount"
          type="button"
          class="out-of-range-toggle d-flex align-center ga-2 text-small text-medium-emphasis"
          :title="$t('repeaters.outOfRangeHint')"
          @click="showOutOfRange = !showOutOfRange"
        >
          <AppIcon :icon="showOutOfRange ? mdiEyeOff : mdiEye" size="18" />
          <span>{{ $t(showOutOfRange ? 'repeaters.hideOutOfRange' : 'repeaters.showOutOfRange', outOfRangeCount) }}</span>
        </button>
      </div>
    </section>

    <DialogRoot v-model:open="detailOpen">
      <DialogPortal>
        <DialogOverlay class="overlay" />
        <DialogContent class="glass-dense panel" :class="smAndDown ? 'sheet' : 'side'" :aria-describedby="undefined">
          <RepeaterDetail
            v-if="selected"
            :row="selected"
            :heading="heading"
            :spreading-factor="selfInfo?.radioSf ?? null"
            :now="now"
            @select="selectedId = $event"
          />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <section v-if="!rows.length" class="glass card bottom empty text-medium-emphasis">
      {{ $t('repeaters.empty') }}
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '~/assets/scss/variables' as *;

// The coverage card on top, the list held at the bottom of the page just above
// the menu, growing upwards.
.screen {
  flex-grow: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  // Lets the map behind take the gestures outside the cards.
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.bottom {
  margin-top: auto;
}

// Leaves the map room between the two cards, the rows scroll under the
// toggle.
.list {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.rows {
  min-height: 0;
  overflow-y: auto;
  border-top: 1px solid var(--glass-border);
}

.list-toggle {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px 8px 16px;
  border: 0;
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

.out-of-range-toggle {
  color: inherit;
  width: 100%;
  min-height: 44px;
  padding: 8px 16px;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;

  .row + & {
    border-top: 1px solid var(--glass-border);
  }

  &:hover,
  &:focus-visible {
    background: rgba(var(--theme-on-surface), 0.06);
  }
}

// Keeps its width while the label turns into a countdown, unless a translation
// needs more.
.action {
  min-width: 104px;
  height: 44px;
}

// As tall as the status line, the card keeps its height.
.toggle {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  cursor: pointer;
}

.switch {
  position: relative;
  width: 30px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(var(--theme-on-surface), 0.3);
  transition: background-color 0.2s;

  &[data-state='checked'] {
    background: rgb(var(--theme-primary));
  }

  &:focus-visible {
    outline: 2px solid rgb(var(--theme-primary));
    outline-offset: 2px;
  }
}

.switch-thumb {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 30%);
  transform: translateX(2px);
  transition: transform 0.2s;

  &[data-state='checked'] {
    transform: translateX(14px);
  }
}

.ring {
  display: block;
}

.ring-track,
.ring-fill {
  fill: none;
  stroke: currentColor;
  stroke-width: 4;
}

.ring-track {
  stroke-opacity: 0.2;
}

.ring-fill {
  transition: stroke-dasharray 0.3s;
}

.summary {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

// Two lines rather than cut, some languages need them on a phone.
.headline {
  display: -webkit-box !important;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  line-height: 1.2;
}

.score {
  fill: rgb(var(--theme-on-surface));
  font-size: var(--text-hint);
  font-weight: 500;
}

.coverage {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.panel {
  position: fixed;
  z-index: 30;
  overflow-y: auto;
}

.sheet {
  inset: auto 0 0;
  max-height: 85dvh;
  border-width: 1px 0 0;
  border-radius: 24px 24px 0 0;
}

.side {
  top: $app-bar-height;
  right: 0;
  bottom: 0;
  width: 400px;
  border-width: 0 0 0 1px;
}

.empty {
  padding: 16px;
  font-size: var(--text-hint);
}

// Stacked on phones, the SNR moves to its own column on wider screens.
.row {
  width: 100%;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  grid-template-areas: 'icon name chevron' 'icon details chevron' 'icon links chevron';
  align-items: center;
  gap: 2px 12px;
  padding: 12px 16px;

  & + & {
    border-top: 1px solid var(--glass-border);
  }

  &.out-of-range {
    opacity: 0.7;
  }

  &:hover,
  &:focus-visible {
    background: rgba(var(--theme-on-surface), 0.06);
  }

  @media (min-width: $breakpoint-sm) {
    grid-template-columns: 48px minmax(0, 1fr) auto auto;
    grid-template-areas: 'icon name links chevron' 'icon details links chevron';
  }
}

.icon {
  grid-area: icon;
}

.chevron {
  grid-area: chevron;
  margin-right: -6px;
}

.name {
  grid-area: name;
}

.details {
  grid-area: details;
}

.links {
  grid-area: links;
  display: flex;
  flex-wrap: wrap;
  gap: 2px 16px;
  margin-top: 2px;

  @media (min-width: $breakpoint-sm) {
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    margin-top: 0;
  }
}
</style>
