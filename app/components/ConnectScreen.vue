<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { mdiAutorenew, mdiBluetooth, mdiCellphoneArrowDown, mdiChevronRight, mdiCoffeeOutline, mdiLoading, mdiTerrain } from '@mdi/js'

const { status, connect } = useMeshCore()
const { t, locale } = useI18n()
const { formatNumber, formatDistance, duration, hops } = useFormat()
const { baseURL } = useRuntimeConfig().app
const [DefineConnectButton, ConnectButton] = createReusableTemplate()

const bluetoothSupported = ref(true)
const knownDevices = shallowRef<MeshCoreBleDevice[]>([])
const picked = shallowRef<MeshCoreBleDevice>()
onMounted(async () => {
  bluetoothSupported.value = 'bluetooth' in navigator
  knownDevices.value = (await navigator.bluetooth?.getDevices?.().catch(() => []) ?? []).filter(device => device.name)
})

function connectTo(device?: MeshCoreBleDevice) {
  picked.value = device
  connect(device)
}

const connecting = computed(() => status.value === 'connecting')
const unavailable = computed(() => !bluetoothSupported.value || connecting.value)
const spinning = computed(() => connecting.value && !picked.value)

const SF = 11

const rows = computed(() => [
  { name: 'Foxtrot', bearing: 80, rx: 7, tx: 7, distance: 4300, altitude: 172 },
  { name: 'Juliett', bearing: 130, rx: 7.75, tx: 6, distance: 3200, altitude: 183 },
  { name: 'Golf', bearing: 200, rx: -9, tx: -10, distance: 7300, altitude: 214 },
  { name: 'Hotel', bearing: 100, rx: -14, tx: -13, distance: 3200, altitude: 182 },
  { name: 'Mike', bearing: 215, via: 'Bravo', distance: 11_400, altitude: 414 }
].map(({ rx = null, tx = null, via, ...row }) => ({
  ...row,
  rx,
  tx,
  rxMargin: rx === null ? null : linkMargin(rx, SF),
  txMargin: tx === null ? null : linkMargin(tx, SF),
  tone: rx === null || tx === null ? 'medium' : linkMargin(Math.min(rx, tx), SF).tone,
  details: [
    via ? t('repeaters.via', { hops: hops(1), name: via }) : t('repeaters.direct'),
    ...[formatDistance(row.distance), t('repeaters.altitude', { altitude: formatNumber(row.altitude) })].map(part => part.replaceAll(' ', '\u00a0'))
  ]
})))

const readings = computed(() => [
  { tag: 'RX', title: t('landing.list.rx.title'), text: t('landing.list.rx.text') },
  { tag: 'TX', title: t('landing.list.tx.title'), text: t('landing.list.tx.text') },
  { tag: null, title: t('landing.list.bearing.title'), text: t('landing.list.bearing.text') }
])
const grades = computed(() => [
  { label: t('margin.comfortable'), color: 'bg-success' },
  { label: t('margin.fair'), color: 'bg-warning' },
  { label: t('margin.tight'), color: 'bg-error' }
])
const extras = computed(() => [
  { icon: mdiAutorenew, title: t('landing.extras.autoScan.title'), text: t('landing.extras.autoScan.text') },
  { icon: mdiCoffeeOutline, title: t('landing.extras.wakeLock.title'), text: t('landing.extras.wakeLock.text') },
  { icon: mdiTerrain, title: t('landing.extras.terrain.title'), text: t('landing.extras.terrain.text') },
  { icon: mdiCellphoneArrowDown, title: t('landing.extras.install.title'), text: t('landing.extras.install.text') }
])
const needs = computed(() => [
  { title: t('landing.needs.companion.title'), text: t('landing.needs.companion.text') },
  { title: t('landing.needs.browser.title'), text: t('landing.needs.browser.text') },
  { title: t('landing.needs.location.title'), text: t('landing.needs.location.text') }
])

const session: Session = {
  startedAt: 0,
  endedAt: 43 * 60_000,
  companionName: null,
  spreadingFactor: SF,
  repeaters: [],
  scans: (['good', 'good', 'good', 'fair', 'weak', 'fair', 'good', 'good', 'good', 'fair', 'good', 'good', 'good', 'fair', 'good', 'good', 'good', 'good'] as const)
    .map((level, i) => ({ at: i * 143_000, position: { lat: 45.04 + i * 0.0027, lon: 5.05 }, level, usable: 2, auto: true }))
}

const vitals = computed(() => [
  { label: t('checks.battery'), value: formatNumber(3.95, 2), unit: 'V', hint: t('battery.summary', { label: t('battery.nominal'), percent: 79 }), tone: 'text-success' },
  { label: t('reception.margin'), value: formatNumber(23.5, 1), unit: 'dB', hint: t('margin.comfortable'), tone: 'text-success' },
  { label: t('reception.noiseFloor'), value: formatNumber(-112), unit: 'dBm', hint: t('reception.lastRssiHint', { rssi: formatNumber(-95) }), tone: '' }
])

const shot = (name: string) => `${baseURL}landing/${locale.value}/${name}.webp`
</script>

<template>
  <DefineConnectButton>
    <button
      type="button"
      class="btn btn-filled h-14 w-full text-subtitle aria-disabled:opacity-50"
      :aria-disabled="unavailable"
      :aria-busy="spinning"
      :aria-describedby="bluetoothSupported ? undefined : 'no-bluetooth'"
      @click="unavailable || connectTo()"
    >
      <AppIcon :icon="spinning ? mdiLoading : mdiBluetooth" :class="{ 'animate-spin': spinning }" />
      {{ $t('connect.button') }}
    </button>
  </DefineConnectButton>
  <div class="flex w-full grow flex-col overflow-x-clip">
    <section class="mx-auto grid w-full max-w-page items-center gap-x-12 gap-y-8 px-4 pt-8 pb-section max-sm:pb-0 sm:gap-y-14 sm:pt-22 min-[960px]:grid-cols-[minmax(0,1fr)_320px]">
      <div class="flex min-w-0 flex-col gap-4 sm:gap-6">
        <h1 class="rise text-display text-balance">{{ $t('landing.title') }}</h1>
        <p class="rise max-w-[40ch] text-body text-medium [--delay:100ms] sm:text-lead">
          {{ $t('landing.lead') }}
          <span class="max-sm:hidden">{{ $t('landing.install') }}</span>
        </p>
        <div class="rise flex w-full flex-col gap-2 [--delay:200ms] sm:mt-2 sm:max-w-85">
          <ConnectButton />
          <button
            v-for="device in knownDevices"
            :key="device.id"
            type="button"
            class="btn btn-tonal h-14 w-full text-subtitle text-primary aria-disabled:opacity-50"
            :aria-disabled="connecting"
            @click="connecting || connectTo(device)"
          >
            <AppIcon v-if="connecting && picked === device" :icon="mdiLoading" class="animate-spin" />
            <span class="min-w-0 truncate">{{ $t('connect.reconnect', { name: device.name }) }}</span>
          </button>
          <span class="sr-only" aria-live="polite">{{ connecting ? $t('connect.connecting') : '' }}</span>
          <p v-if="!bluetoothSupported" id="no-bluetooth" class="mt-0.5 text-hint text-error sm:mt-1">{{ $t('connect.noBluetooth') }}</p>
          <p v-else class="mt-0.5 text-hint text-medium sm:mt-1">{{ $t('connect.hint') }}</p>
        </div>
      </div>
      <div class="rise relative isolate mx-auto w-[min(320px,100%)] max-sm:w-[min(calc(100%-24px),400px)]">
        <span v-for="delay in ['0s', '1s', '2s']" :key="delay" class="absolute top-1/3 left-1/2 -z-1 aspect-square w-full -translate-1/2 animate-radar rounded-full border border-primary/30 motion-reduce:hidden" :style="{ animationDelay: delay, pointerEvents: 'none' }" aria-hidden="true" />
        <div class="phone cropped">
          <img :src="shot('map')" :alt="$t('landing.map.alt')" width="780" height="1688" fetchpriority="high">
        </div>
      </div>
    </section>

    <section class="border-y border-on-surface/10 bg-surface/50">
      <div class="mx-auto grid max-w-page items-start gap-x-18 gap-y-14 px-4 py-section min-[960px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div class="reveal flex min-w-0 flex-col gap-9">
          <div class="flex flex-col gap-4">
            <h2 class="text-headline text-balance">{{ $t('landing.list.title') }}</h2>
            <p class="text-lead text-medium">{{ $t('landing.list.text') }}</p>
          </div>
          <dl class="flex flex-col">
            <div v-for="{ tag, title, text } in readings" :key="title" class="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4 border-t border-line py-4.5 last:border-b">
              <dt class="font-mono text-reading font-medium text-primary">
                <CompassDial v-if="!tag" :bearing="45" :heading="null" />
                <span v-else aria-hidden="true">{{ tag }}</span>
                <span class="sr-only">{{ title }}</span>
              </dt>
              <dd class="text-body leading-[1.55] text-medium">
                <strong class="font-medium text-on-surface" aria-hidden="true">{{ title }}</strong>
                {{ text }}
              </dd>
            </div>
          </dl>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-label text-medium">
            <span class="font-medium text-on-surface">{{ $t('reception.margin') }}</span>
            <ul class="flex flex-wrap gap-x-5 gap-y-2">
              <li v-for="grade in grades" :key="grade.color" class="flex items-center gap-2">
                <span class="h-1 w-4.5 rounded-sm" :class="grade.color" />
                {{ grade.label }}
              </li>
            </ul>
          </div>
        </div>
        <figure class="reveal panel card min-w-0 overflow-clip shadow-[0_30px_80px_var(--color-shadow)]" role="img" :aria-label="$t('landing.list.alt')">
          <div class="flex min-h-13 items-center px-4 text-label font-medium">{{ $t('repeaters.count', rows.length) }}</div>
          <div v-for="(row, i) in rows" :key="row.name" class="reveal grid grid-cols-[48px_minmax(0,1fr)_20px] items-center gap-x-3.5 gap-y-1.5 border-t border-line px-4 py-3.5 sm:grid-cols-[48px_minmax(0,1fr)_8.5rem_20px]" :style="{ '--i': i }">
            <CompassDial :class="[`text-${row.tone}`, { 'max-sm:row-span-2': row.rx !== null }]" :bearing="row.bearing" :heading="null" />
            <span class="flex min-w-0 flex-col gap-0.75" :class="{ 'sm:col-span-2': row.rx === null }">
              <span class="truncate text-subtitle font-medium">{{ row.name }}</span>
              <span class="separated text-hint text-medium"><span v-for="part in row.details" :key="part">{{ part }}</span></span>
            </span>
            <LinkReadout
              v-if="row.rx !== null"
              class="grid gap-1.5 max-sm:col-start-2 max-sm:row-start-2 max-sm:grid-cols-2 max-sm:gap-4"
              :rx="row.rx"
              :tx="row.tx"
              :rx-margin="row.rxMargin"
              :tx-margin="row.txMargin"
            />
            <AppIcon class="text-medium" :class="{ 'max-sm:col-start-3 max-sm:row-span-2 max-sm:row-start-1': row.rx !== null }" :icon="mdiChevronRight" size="20" />
          </div>
        </figure>
      </div>
    </section>

    <section class="mx-auto grid w-full max-w-page items-center gap-x-20 gap-y-14 px-4 pt-section min-[960px]:grid-cols-[300px_minmax(0,1fr)]">
      <div class="reveal flex min-w-0 flex-col gap-10">
        <div class="flex flex-col gap-4">
          <h2 class="text-headline text-balance">{{ $t('landing.detail.title') }}</h2>
          <p class="text-lead text-medium">{{ $t('landing.detail.text') }}</p>
        </div>
        <div class="flex flex-col gap-10" aria-hidden="true">
          <div class="grid grid-cols-2 gap-7">
            <div v-for="label in ['detail.youHearIt', 'detail.itHearsYou']" :key="label" class="flex flex-col gap-1.5 border-t-2 border-success pt-4">
              <span class="text-body text-medium">{{ $t(label) }}</span>
              <span class="font-mono text-[clamp(40px,10vw,56px)] leading-none font-medium tracking-[-0.03em] text-success">{{ formatNumber(7) }}<span class="text-body tracking-normal text-medium"> dB SNR</span></span>
            </div>
          </div>
          <div class="panel card flex items-center gap-5 px-5 py-4">
            <MarginGauge :margin="24.5" tone="success" />
            <span class="flex min-w-0 flex-col items-start gap-1.5">
              <span class="chip chip-small text-success">{{ $t('margin.comfortable') }}</span>
              <span class="text-subtitle">{{ $t('detail.marginTitle') }}</span>
              <span class="text-hint text-medium">{{ $t('detail.marginHelp', { sf: SF, floor: formatNumber(snrFloor(SF), 1), fair: MARGIN_FAIR_DB, comfortable: MARGIN_COMFORTABLE_DB }) }}</span>
            </span>
          </div>
        </div>
      </div>
      <div class="reveal phone mx-auto w-[min(300px,100%)] min-[960px]:order-first">
        <img :src="shot('repeater')" :alt="$t('landing.detail.alt')" width="780" height="1688" loading="lazy">
      </div>
    </section>

    <section class="mx-auto grid w-full max-w-page items-center gap-x-20 gap-y-14 px-4 pt-section min-[960px]:grid-cols-[minmax(0,1fr)_300px]">
      <div class="reveal flex min-w-0 flex-col gap-10">
        <div class="flex flex-col items-start gap-4">
          <span class="chip chip-small text-warning">{{ $t('history.beta') }}</span>
          <h2 class="text-headline text-balance">{{ $t('landing.history.title') }}</h2>
          <p class="text-lead text-medium">{{ $t('landing.history.text', { count: HISTORY_MAX_SESSIONS }) }}</p>
        </div>
        <div class="panel card flex flex-col gap-5.5 p-5" aria-hidden="true">
          <div class="grid grid-cols-3 gap-3">
            <VitalStat :label="$t('history.duration')" :value="duration((session.endedAt - session.startedAt) / 1000)" large />
            <VitalStat :label="$t('history.distance')" :value="formatDistance(sessionDistance(session.scans))" large />
            <VitalStat :label="$t('history.scans')" :value="String(session.scans.length)" large />
          </div>
          <div class="section gap-2.5 pt-4.5">
            <span class="text-body">{{ $t('history.coverage') }}</span>
            <CoverageTimeline class="h-7! gap-0.5!" :session="session" />
          </div>
        </div>
      </div>
      <div class="reveal phone mx-auto w-[min(300px,100%)]">
        <img :src="shot('history')" :alt="$t('landing.history.alt')" width="780" height="1688" loading="lazy">
      </div>
    </section>

    <section class="mx-auto grid w-full max-w-page items-center gap-x-20 gap-y-14 px-4 pt-section min-[960px]:grid-cols-[300px_minmax(0,1fr)]">
      <div class="reveal flex min-w-0 flex-col gap-10">
        <div class="flex flex-col gap-4">
          <h2 class="text-headline text-balance">{{ $t('landing.companion.title') }}</h2>
          <p class="text-lead text-medium">{{ $t('landing.companion.text') }}</p>
        </div>
        <div class="panel card grid grid-cols-3 gap-4 p-5" aria-hidden="true">
          <div v-for="vital in vitals" :key="vital.label" class="flex min-w-0 flex-col gap-0.5">
            <span class="text-hint text-medium">{{ vital.label }}</span>
            <span class="text-[clamp(26px,6vw,34px)] leading-tight wrap-anywhere tabular-nums" :class="vital.tone">{{ vital.value }}<span class="ml-0.75 text-hint whitespace-nowrap text-medium">{{ vital.unit }}</span></span>
            <span class="text-hint text-medium">{{ vital.hint }}</span>
          </div>
        </div>
      </div>
      <div class="reveal phone mx-auto w-[min(300px,100%)] min-[960px]:order-first">
        <img :src="shot('companion')" :alt="$t('landing.companion.alt')" width="780" height="1688" loading="lazy">
      </div>
    </section>

    <section class="mx-auto flex w-full max-w-page flex-col gap-10 px-4 pt-section">
      <h2 class="text-headline text-balance">{{ $t('landing.extras.title') }}</h2>
      <ul class="grid gap-3 sm:grid-cols-2">
        <li v-for="(extra, i) in extras" :key="extra.title" class="reveal panel card flex gap-4 p-5" :style="{ '--i': i % 2 }">
          <AppIcon class="shrink-0 text-primary" :icon="extra.icon" />
          <span class="flex flex-col gap-1">
            <span class="text-subtitle font-medium">{{ extra.title }}</span>
            <span class="text-body leading-[1.55] text-medium">{{ extra.text }}</span>
          </span>
        </li>
      </ul>
    </section>

    <section class="mx-auto grid w-full max-w-page gap-x-20 gap-y-8 px-4 pt-section min-[960px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-headline text-balance">{{ $t('landing.needs.title') }}</h2>
      <dl class="flex min-w-0 flex-col">
        <div v-for="need in needs" :key="need.title" class="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-8 gap-y-1.5 border-t border-line py-5 last:border-b">
          <dt class="text-subtitle font-medium">{{ need.title }}</dt>
          <dd class="text-body leading-[1.55] text-medium">{{ need.text }}</dd>
        </div>
      </dl>
    </section>

    <section class="mx-auto flex w-full max-w-page flex-wrap items-end justify-between gap-8 px-4 py-section">
      <h2 class="max-w-[14ch] text-display">{{ $t('landing.cta') }}</h2>
      <ConnectButton class="sm:w-85" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.rise {
  animation: rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) var(--delay, 0ms) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      animation: rise linear both;
      animation-timeline: view();
      animation-range: entry calc(var(--i, 0) * 10%) entry calc(70% + var(--i, 0) * 10%);
    }
  }
}

@keyframes rise {
  from {
    opacity: 0;
    translate: 0 32px;
  }
}

.phone {
  padding: 9px;
  border: 1px solid var(--color-line);
  border-radius: 42px;
  background: var(--color-black);
  box-shadow: 0 40px 90px var(--color-shadow);

  img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 33px;
  }
}

@media (width < 600px) {
  .cropped {
    height: 440px;
    overflow: hidden;
    padding-bottom: 0;
    border-bottom: 0;
    border-radius: 36px 36px 0 0;
    box-shadow: none;

    img {
      border-radius: 28px 28px 0 0;
    }
  }
}
</style>
