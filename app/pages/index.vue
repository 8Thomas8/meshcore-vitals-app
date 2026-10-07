<script setup lang="ts">
import { mdiAlert, mdiAutorenew, mdiChevronDown, mdiChevronRight, mdiChevronUp, mdiCoffeeOutline, mdiEye, mdiEyeOff, mdiFormatListBulleted, mdiInformationOutline, mdiMapOutline } from '@mdi/js'
import { useMediaQuery } from '@vueuse/core'

const { status } = useMeshCore()
const { repeaters, selfInfo, contacts, scanUntil, scannedAt, lastScanAttempt, lastFullScan, autoScan, scanError, scan } = useRepeaters()

const smAndDown = useMediaQuery(SM_AND_DOWN_QUERY)
const { t } = useI18n()
const { ago, hops, duration, message, formatNumber, formatDistance } = useFormat()
const { supported: wakeLockSupported, enabled: keepScreenOn, wanted: screenWanted, refused: screenRefused } = useWakeLock()
const { position: here, unavailable: noLocation, locatedAt, locate } = useDevicePosition()
const heading = ref<number | null>(null)
const now = ref(Date.now())
const summary = ref<HTMLElement | null>(null)
let clock: ReturnType<typeof setInterval> | undefined

// Folded down to its header to give the map the room. Remembered on this
// device only, storage may be blocked.
function stored(key: string) {
  try {
    return localStorage.getItem(key) === 'true'
  }
  catch {
    return false
  }
}

const listHidden = ref(stored(LIST_HIDDEN_STORAGE_KEY))
const list = ref<HTMLElement | null>(null)
watch(listHidden, (hidden) => {
  try {
    localStorage.setItem(LIST_HIDDEN_STORAGE_KEY, String(hidden))
  }
  catch {
    // Stays for this visit only.
  }
})

const listFull = ref(stored(LIST_FULL_STORAGE_KEY))
watch(listFull, (full) => {
  try {
    localStorage.setItem(LIST_FULL_STORAGE_KEY, String(full))
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
  clock = setInterval(() => {
    now.value = Date.now()
    // Auto scans only run while this page is shown and the tab is visible.
    if (autoScan.value && !document.hidden && nextScanAt.value !== null && now.value >= nextScanAt.value) {
      const late = now.value - Math.max(nextScanAt.value, autoOnAt)
      if (late >= AUTO_SCAN_INTERVAL_MS) pause.value = { secs: Math.round(late / 1000), until: now.value + AUTO_SCAN_INTERVAL_MS }
      scan()
    }
  }, 1000)
  window.addEventListener('deviceorientationabsolute', onOrientation)
})

onBeforeUnmount(() => {
  clearInterval(clock)
  window.removeEventListener('deviceorientationabsolute', onOrientation)
})

watch(lastScanAttempt, (at) => {
  if (at) locate()
})

let autoOnAt = 0
const pause = ref<{ secs: number, until: number } | null>(null)
const pausedSecs = computed(() => pause.value && (lastScanAttempt.value ?? 0) < pause.value.until ? pause.value.secs : null)
watch(autoScan, () => {
  autoOnAt = Date.now()
  pause.value = null
})

const scanning = computed(() => scanUntil.value !== null)
const nextScanAt = computed(() => autoScan.value && !scanning.value ? (lastScanAttempt.value ?? 0) + AUTO_SCAN_INTERVAL_MS : null)
const scanLeftMs = computed(() => scanUntil.value && Math.max(0, scanUntil.value - now.value))
const scanProgress = computed(() => scanLeftMs.value === null ? 0 : Math.min(100, Math.max(0, 100 * (1 - scanLeftMs.value / DISCOVER_WINDOW_MS))))

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
    const outOfRange = isOutOfRange(repeater, repeaters.value, lastFullScan.value)
    const route = outOfRange
      ? t('repeaters.outOfRange')
      : repeater.hops ? t('repeaters.via', { hops: hops(repeater.hops), name: viaName ?? t('repeaters.unknown') }) : t('repeaters.direct')
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
      details: [route, ...details.filter(part => typeof part === 'string').map(part => part.replaceAll(' ', '\u00a0'))],
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

const mapShown = computed(() => here.value !== null && (listHidden.value || !listFull.value || !rows.value.length))
const column = computed(() => mapShown.value && !smAndDown.value)
const { shown: footerShown } = useFooter()
const scanStatus = computed(() => scannedAt.value ? t('scan.done', { ago: ago(scannedAt.value, now.value) }) : t('scan.never'))
watch(() => here.value !== null && !mapShown.value, (shown) => {
  footerShown.value = shown
}, { immediate: true })

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

onBeforeRouteLeave(() => {
  if (!detailOpen.value) return
  detailOpen.value = false
  return false
})

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

const { addScan } = useHistory()
watch(lastFullScan, (at) => {
  if (at) addScan(here.value, coverage.value?.level ?? 'none', coverage.value?.usable ?? 0)
})

const coverageOpen = ref(false)
watch(coverage, (value) => {
  if (!value) coverageOpen.value = false
})
</script>

<template>
  <div class="pointer-events-none mx-auto flex min-h-0 w-full max-w-page grow flex-col gap-3 px-4 py-3.5 *:pointer-events-auto" :class="{ 'h-[calc(100svh-var(--spacing-app-bar))]': column, 'h-[calc(100svh-var(--spacing-app-bar))] max-[960px]:h-[calc(100svh-var(--spacing-app-bar)-var(--spacing-bottom-nav)-env(safe-area-inset-bottom))] shrink-0': !mapShown && rows.length && !listHidden }">
    <h1 class="sr-only">{{ $t('nav.repeaters') }}</h1>
    <!-- The coverage card on top. Over the map, the list is held at the bottom
         of the page just above the menu, growing upwards, and the map behind
         takes the gestures outside the cards. Without it, the list scrolls
         under the coverage card. -->
    <!-- Lazy: MapLibre, its styles and its worker only load once there is a map to show. -->
    <LazyMapBackdrop v-if="here && mapShown" :here="here" :rows="shownRows" :below="summary" :list="list" :located-at="locatedAt" :companion-name="selfInfo?.name ?? null" />
    <section ref="summary" class="@container card flex shrink-0 flex-col gap-2.5 px-4 py-3.5" :class="[mapShown ? 'float' : 'panel', { 'w-100': column }]">
      <AppProgress v-if="scanning" class="progress-top text-primary" :value="scanProgress" />
      <div class="flex min-h-11 items-center gap-2">
        <PopoverRoot v-model:open="coverageOpen">
          <PopoverTrigger class="flex min-w-0 grow items-center gap-2 text-left" :disabled="!coverage">
            <svg class="shrink-0" :class="`text-${coverage?.tone ?? 'primary'}`" viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="4" stroke-opacity="0.2" />
              <circle
                class="transition-[stroke-dasharray] duration-300"
                fill="none"
                stroke="currentColor"
                stroke-width="4"
                cx="20"
                cy="20"
                r="18"
                pathLength="100"
                :stroke-dasharray="`${coverage ? Math.min(coverage.usable, COVERAGE_GOOD_USABLE) / COVERAGE_GOOD_USABLE * 100 : 0} 100`"
                transform="rotate(-90 20 20)"
              />
              <text v-if="coverage" class="fill-on-surface font-mono text-hint font-medium" x="20" y="20" text-anchor="middle" dominant-baseline="central">{{ coverage.usable }}</text>
            </svg>
              <span class="flex min-w-0 grow flex-col">
                <span class="truncate text-subtitle leading-[1.2]">{{ coverage?.label ?? (scanning ? $t('scan.scanning') : rows.length ? $t('repeaters.noneInRange') : $t('repeaters.noneYet')) }}</span>
                <span class="flex min-w-0 items-center gap-1 text-small text-medium">
                  <span class="truncate">
                    <template v-if="inRange.length">{{ $t(inRange.length > direct.length ? 'repeaters.counts' : 'repeaters.directOnly', { direct: direct.length, relayed: $t('repeaters.relayed', inRange.length - direct.length) }) }}</template>
                    <template v-else>{{ scanning ? $t('scan.waiting') : rows.length ? $t('scan.nothingAnswered') : $t('scan.prompt') }}</template>
                  </span>
                  <AppIcon v-if="coverage" class="shrink-0" :icon="mdiInformationOutline" size="20" />
                </span>
              </span>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent side="bottom" :side-offset="4" :collision-padding="8" class="float popover">
              <div class="flex flex-col gap-2 py-1">
                <span class="font-medium">{{ coverage?.reason }}</span>
                <span>{{ $t('coverage.help.usable', { minutes: COVERAGE_RECENT_MS / 60_000, fair: MARGIN_FAIR_DB, comfortable: MARGIN_COMFORTABLE_DB }) }}</span>
                <span>{{ $t('coverage.help.levels', { count: COVERAGE_GOOD_USABLE, fair: MARGIN_FAIR_DB }) }}</span>
              </div>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
        <!-- Inert while scanning or on auto, but not disabled: a disabled look is
             unreadable. Keeps its width while the label turns into a countdown,
             unless a translation needs more. -->
        <button
          type="button"
          class="btn h-11 min-w-20 overflow-hidden px-3 tabular-nums"
          :class="scanning || autoScan || status !== 'connected' ? 'btn-tonal text-primary' : 'btn-filled'"
          :aria-disabled="scanning || autoScan || status !== 'connected'"
          @click="autoScan || scan()"
        >
          <span v-if="scanning" class="radar-sweep motion-reduce:hidden" aria-hidden="true" />
          <span class="relative">
            <template v-if="scanning">{{ Math.ceil((scanLeftMs ?? 0) / 1000) }} s</template>
            <template v-else-if="nextScanAt !== null && lastScanAttempt">{{ formatCountdown(nextScanAt - now) }}</template>
            <template v-else>{{ $t('scan.button') }}</template>
          </span>
        </button>
      </div>
      <div class="status-row">
        <span class="sr-only" aria-live="polite">{{ pausedSecs ? $t('scan.paused', { duration: duration(pausedSecs) }) : screenRefused ? $t('wakeLock.refused') : '' }}</span>
        <PopoverRoot>
          <PopoverTrigger class="status-trigger">
            <span class="dot" :class="[scanning ? 'text-primary' : scanError ? 'text-error' : screenRefused ? 'text-warning' : 'text-success', { 'animate-blink': scanning }]" />
            <span v-if="pausedSecs" class="truncate">{{ $t('scan.paused', { duration: duration(pausedSecs) }) }}</span>
            <span v-else-if="scanning" class="truncate">{{ $t('scan.inProgress') }}</span>
            <span v-else class="truncate">
              {{ noLocation ? $t('scan.noLocation', { status: scanStatus }) : scanStatus }}
            </span>
            <AppIcon class="shrink-0" :icon="mdiInformationOutline" size="20" />
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent side="top" :side-offset="4" :collision-padding="8" class="float popover">
              <div class="flex flex-col gap-2 py-1">
                <span v-if="scanError" class="text-error">{{ message(scanError) }}</span>
                <span v-if="screenRefused" class="text-warning">{{ $t('wakeLock.refused') }}</span>
                <span>{{ $t('scan.autoHint', { minutes: AUTO_SCAN_INTERVAL_MS / 60_000 }, AUTO_SCAN_INTERVAL_MS / 60_000) }}</span>
                <span v-if="wakeLockSupported">{{ $t('wakeLock.hint') }}</span>
              </div>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
        <!-- As tall as the status line, the card keeps its height. -->
        <div class="ms-auto flex gap-3">
          <label class="flex h-8 flex-none cursor-pointer items-center gap-1.5" :title="$t('scan.auto')">
            <AppIcon :icon="mdiAutorenew" size="18" />
            <span class="sr-only">{{ $t('scan.auto') }}</span>
            <SwitchRoot v-model="autoScan" class="switch">
              <SwitchThumb class="switch-thumb" />
            </SwitchRoot>
          </label>
          <!-- For walking around with the phone in hand. On but refused turns amber with a warning sign. -->
          <label
            v-if="wakeLockSupported"
            class="flex h-8 flex-none cursor-pointer items-center gap-1.5"
            :class="{ 'text-warning': screenRefused }"
            :title="$t('wakeLock.label')"
          >
            <AppIcon :icon="screenRefused ? mdiAlert : mdiCoffeeOutline" size="18" />
            <span class="sr-only">{{ $t('wakeLock.label') }}</span>
            <SwitchRoot :model-value="screenWanted" :disabled="autoScan" class="switch" @update:model-value="keepScreenOn = $event">
              <SwitchThumb class="switch-thumb" />
            </SwitchRoot>
          </label>
        </div>
      </div>
    </section>

    <!-- Leaves the map room between the two cards, the rows scroll under the toggle. -->
    <section
      v-if="rows.length"
      ref="list"
      class="card flex flex-col"
      :class="column ? 'float min-h-0 w-100' : mapShown ? 'float mt-auto shrink-0' : 'panel min-h-0'"
      :style="mapShown && !column ? { maxHeight: `${LIST_MAX_HEIGHT_SHARE * 100}dvh` } : undefined"
    >
      <div class="flex">
        <button
          type="button"
          class="list-button flex min-h-11 items-center gap-2 py-2 pr-3 pl-4 text-small"
          :aria-expanded="!listHidden"
          :aria-controls="listHidden ? undefined : 'repeater-rows'"
          @click="listHidden = !listHidden"
        >
          <span class="grow font-medium">{{ $t('repeaters.count', shownRows.length) }}</span>
          <span class="text-medium">{{ listHidden ? $t('repeaters.showList') : $t('repeaters.hideList') }}</span>
          <AppIcon :icon="listHidden ? mdiChevronUp : mdiChevronDown" size="20" class="text-medium" />
        </button>
        <button
          v-if="here && !listHidden"
          type="button"
          class="list-button flex w-12 shrink-0 items-center justify-center border-l border-line text-medium"
          :aria-label="$t('repeaters.fullScreen')"
          :aria-pressed="listFull"
          @click="listFull = !listFull"
        >
          <AppIcon :icon="listFull ? mdiMapOutline : mdiFormatListBulleted" size="20" />
        </button>
      </div>
      <!-- Unmounted when folded, the rows would keep updating every second. -->
      <div v-if="!listHidden" id="repeater-rows" class="min-h-0 divide-y divide-line overflow-y-auto border-t border-line">
        <button
          v-for="row in shownRows"
          :key="row.repeater.id"
          type="button"
          class="row list-button"
          :class="{ 'opacity-70': row.outOfRange }"
          @click="selectedId = row.repeater.id"
        >
          <CompassDial
            class="icon"
            :class="row.repeater.hops || row.outOfRange ? 'text-medium' : `text-${row.link?.tone ?? 'primary'}`"
            :bearing="row.bearing"
            :heading="heading"
          />
          <span class="name truncate font-medium">{{ row.name }}</span>
          <span class="details separated text-small text-medium"><span v-for="(part, i) in row.details" :key="i">{{ part }}</span></span>
          <LinkReadout
            v-if="!row.repeater.hops"
            class="links"
            :rx="row.repeater.rx?.snr ?? null"
            :tx="row.repeater.tx?.snr ?? null"
            :rx-margin="row.rx"
            :tx-margin="row.tx"
          />
          <AppIcon class="chevron text-medium" :icon="mdiChevronRight" />
        </button>
        <button
          v-if="outOfRangeCount"
          type="button"
          class="list-button flex min-h-11 items-center gap-2 px-4 py-2 text-small text-medium"
          :aria-expanded="showOutOfRange"
          @click="showOutOfRange = !showOutOfRange"
        >
          <AppIcon :class="{ 'self-start': showOutOfRange }" :icon="showOutOfRange ? mdiEyeOff : mdiEye" size="18" />
          <span class="flex flex-col text-left">
            <span>{{ $t(showOutOfRange ? 'repeaters.hideOutOfRange' : 'repeaters.showOutOfRange', outOfRangeCount) }}</span>
            <span v-if="showOutOfRange" class="mt-1">{{ $t('repeaters.outOfRangeHint') }}</span>
          </span>
        </button>
      </div>
    </section>

    <DialogRoot v-model:open="detailOpen">
      <DialogPortal>
        <DialogOverlay class="overlay" />
        <DialogContent class="float sheet" :aria-describedby="undefined">
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

    <section v-if="!rows.length" class="card mt-auto p-4 text-hint text-medium" :class="[mapShown ? 'float' : 'panel', { 'w-100': column }]">
      {{ $t('repeaters.empty') }}
    </section>
  </div>
</template>

<style scoped lang="scss">
// Stacked on phones, the SNR moves to its own column on wider screens.
.row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  grid-template-areas: 'icon name chevron' 'icon details chevron' 'icon links chevron';
  align-items: center;
  gap: 2px 12px;
  padding: 10px 16px;

  @media (width >= 600px) {
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 6px;

  @media (width >= 600px) {
    grid-template-columns: 8.5rem;
    gap: 6px;
    margin-top: 0;
  }
}
</style>
