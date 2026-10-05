<script setup lang="ts">
import { mdiChevronDown, mdiChevronRight, mdiChevronUp, mdiEye, mdiEyeOff, mdiFormatListBulleted, mdiInformationOutline, mdiMapOutline, mdiRadar } from '@mdi/js'
import { useMediaQuery } from '@vueuse/core'

const { status } = useMeshCore()
const { repeaters, selfInfo, contacts, scanUntil, scannedAt, lastScanAttempt, fullScans, autoScan, scanError, scan } = useRepeaters()

const smAndDown = useMediaQuery(SM_AND_DOWN_QUERY)
const { t } = useI18n()
const { ago, hops, duration, message, formatNumber, formatDistance } = useFormat()
const { supported: wakeLockSupported, enabled: keepScreenOn, forced: screenOnForAuto, active: screenKeptOn } = useWakeLock()
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
watch(autoScan, (on) => {
  screenOnForAuto.value = on
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
    const outOfRange = isOutOfRange(repeater, repeaters.value, fullScans.value)
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

const mapShown = computed(() => here.value !== null && (listHidden.value || !listFull.value || !rows.value.length))
const { shown: footerShown } = useFooter()
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
watch(() => fullScans.value.at(-1), (at) => {
  if (at) addScan(here.value, coverage.value?.level ?? 'none', coverage.value?.usable ?? 0)
})

const coverageOpen = ref(false)
watch(coverage, (value) => {
  if (!value) coverageOpen.value = false
})
</script>

<template>
  <div class="pointer-events-none mx-auto flex w-full max-w-page grow flex-col gap-3 px-4 py-3.5 *:pointer-events-auto">
    <!-- The coverage card on top, the list held at the bottom of the page just
         above the menu, growing upwards. The map behind takes the gestures
         outside the cards. -->
    <!-- Lazy: MapLibre, its styles and its worker only load once there is a map to show. -->
    <LazyMapBackdrop v-if="here && mapShown" :here="here" :rows="shownRows" :below="summary" :list="list" :located-at="locatedAt" :companion-name="selfInfo?.name ?? null" />
    <section ref="summary" class="glass card flex flex-col gap-2.5 px-4 py-3.5" :class="{ 'sticky top-app-bar z-1': !mapShown }">
      <AppProgress v-if="scanning" class="progress-top text-primary" :value="scanProgress" />
      <div class="flex items-center gap-2">
        <PopoverRoot v-model:open="coverageOpen">
          <PopoverTrigger class="flex min-w-0 grow items-center gap-2 text-left" :disabled="!coverage">
            <svg class="shrink-0" :class="`text-${coverage?.tone ?? 'primary'}`" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
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
              <span class="min-w-0 grow">
                <!-- Two lines rather than cut, some languages need them on a phone. -->
                <span class="line-clamp-2 text-title leading-[1.2]">{{ coverage?.label ?? (scanning ? $t('scan.scanning') : rows.length ? $t('repeaters.noneInRange') : $t('repeaters.noneYet')) }}</span>
                <span class="flex min-w-0 items-center gap-1 text-small text-medium">
                  <span class="truncate">
                    <template v-if="inRange.length">{{ $t('repeaters.counts', { direct: direct.length, relayed: $t('repeaters.relayed', inRange.length - direct.length) }) }}</template>
                    <template v-else>{{ scanning ? $t('scan.waiting') : rows.length ? $t('scan.nothingAnswered') : $t('scan.prompt') }}</template>
                  </span>
                  <AppIcon v-if="coverage" :icon="mdiInformationOutline" size="14" />
                </span>
              </span>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent side="bottom" :side-offset="4" :collision-padding="8" class="glass-dense z-(--z-overlay) max-w-75 rounded-2xl px-3.5 py-2.5 text-label data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in">
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
          class="btn h-11 min-w-26"
          :class="scanning || autoScan || status !== 'connected' ? 'btn-tonal text-primary' : 'btn-filled'"
          :aria-disabled="scanning || autoScan || status !== 'connected'"
          @click="autoScan || scan()"
        >
          <AppIcon :icon="mdiRadar" size="18" />
          <template v-if="scanning">{{ Math.ceil((scanLeftMs ?? 0) / 1000) }} s</template>
          <template v-else-if="nextScanAt !== null && lastScanAttempt">{{ formatCountdown(nextScanAt - now) }}</template>
          <template v-else>{{ $t('scan.button') }}</template>
        </button>
      </div>
      <div class="status-row flex-wrap">
        <span class="sr-only" aria-live="polite">{{ pausedSecs ? $t('scan.paused', { duration: duration(pausedSecs) }) : '' }}</span>
        <PopoverRoot>
          <PopoverTrigger class="flex h-8 max-w-full min-w-0 items-center gap-2 text-left">
            <span class="dot" :class="[scanning ? 'text-primary' : scanError ? 'text-error' : 'text-success', { 'animate-blink': scanning }]" />
            <span v-if="pausedSecs" class="truncate">{{ $t('scan.paused', { duration: duration(pausedSecs) }) }}</span>
            <span v-else-if="scanning" class="truncate">{{ $t('scan.inProgress') }}</span>
            <span v-else class="truncate">
              {{ scannedAt ? $t('scan.done', { ago: ago(scannedAt, now) }) : $t('scan.never') }}
              <template v-if="noLocation"> · {{ $t('scan.noLocation') }}</template>
            </span>
            <AppIcon :icon="mdiInformationOutline" size="14" />
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent side="top" :side-offset="4" :collision-padding="8" class="glass-dense z-(--z-overlay) max-w-75 rounded-2xl px-3.5 py-2.5 text-label data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in">
              <div class="flex flex-col gap-2 py-1">
                <span v-if="scanError" class="text-error">{{ message(scanError) }}</span>
                <span>{{ $t('scan.autoHint', { minutes: AUTO_SCAN_INTERVAL_MS / 60_000 }, AUTO_SCAN_INTERVAL_MS / 60_000) }}</span>
                <span v-if="wakeLockSupported">{{ $t('wakeLock.hint') }}</span>
              </div>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
        <!-- As tall as the status line, the card keeps its height. -->
        <div class="ms-auto flex gap-2">
          <label class="flex h-8 flex-none cursor-pointer items-center gap-2">
            <SwitchRoot v-model="autoScan" class="switch">
              <SwitchThumb class="switch-thumb" />
            </SwitchRoot>
            {{ $t('scan.auto') }}
          </label>
          <!-- For walking around with the phone in hand. On but refused turns amber. -->
          <label
            v-if="wakeLockSupported"
            class="flex h-8 flex-none cursor-pointer items-center gap-2"
            :class="{ 'text-warning': (keepScreenOn || autoScan) && !screenKeptOn }"
          >
            <SwitchRoot :model-value="keepScreenOn || autoScan" :disabled="autoScan" class="switch" @update:model-value="keepScreenOn = $event">
              <SwitchThumb class="switch-thumb" />
            </SwitchRoot>
            {{ $t('wakeLock.label') }}
          </label>
        </div>
      </div>
      <p v-if="(keepScreenOn || autoScan) && !screenKeptOn" class="text-small text-warning">{{ $t('wakeLock.refused') }}</p>
    </section>

    <!-- Leaves the map room between the two cards, the rows scroll under the toggle. -->
    <section
      v-if="rows.length"
      ref="list"
      class="glass card flex shrink-0 flex-col"
      :class="mapShown ? 'mt-auto' : 'bg-surface/85 backdrop-blur-none'"
      :style="mapShown ? { maxHeight: `${LIST_MAX_HEIGHT_SHARE * 100}dvh` } : undefined"
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
          class="list-button flex w-12 shrink-0 items-center justify-center border-l border-glass-border text-medium"
          :aria-label="$t('repeaters.fullScreen')"
          :aria-pressed="listFull"
          @click="listFull = !listFull"
        >
          <AppIcon :icon="listFull ? mdiMapOutline : mdiFormatListBulleted" size="20" />
        </button>
      </div>
      <!-- Unmounted when folded, the rows would keep updating every second. -->
      <div v-if="!listHidden" id="repeater-rows" class="min-h-0 divide-y divide-glass-border border-t border-glass-border" :class="{ 'overflow-y-auto': mapShown }">
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
          <span class="details text-small text-medium">{{ row.details }}</span>
          <span v-if="!row.repeater.hops" class="links font-mono text-small">
            <span>
              <span class="text-medium">RX </span>
              <span :class="row.rx && `text-${row.rx.tone}`">{{ row.repeater.rx ? `${formatNumber(row.repeater.rx.snr, 2, 0)} dB` : $t('common.na') }}</span>
            </span>
            <span>
              <span class="text-medium">TX </span>
              <span :class="row.tx ? `text-${row.tx.tone}` : 'text-disabled'">{{ row.repeater.tx ? `${formatNumber(row.repeater.tx.snr, 2, 0)} dB` : $t('repeaters.txUnknown') }}</span>
            </span>
          </span>
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
        <DialogContent
          class="glass-dense fixed z-(--z-overlay) overflow-y-auto data-[state=closed]:animate-slide-out data-[state=open]:animate-slide-in"
          :class="smAndDown
            ? 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl border-x-0 border-b-0 [--slide-from:translateY(100%)]'
            : 'top-app-bar right-0 bottom-0 w-100 border-y-0 border-r-0 [--slide-from:translateX(100%)]'"
          :aria-describedby="undefined"
        >
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

    <section v-if="!rows.length" class="glass card mt-auto p-4 text-hint text-medium">
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
  padding: 12px 16px;

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
  display: flex;
  flex-wrap: wrap;
  gap: 2px 16px;
  margin-top: 2px;

  @media (width >= 600px) {
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    margin-top: 0;
  }
}
</style>
