<script setup lang="ts">
import { mdiAlert, mdiAlertCircle, mdiCheckCircle, mdiChevronRight, mdiPower, mdiRefresh } from '@mdi/js'

// The layout only shows the pages while a node is connected.
const { connection, status, disconnect } = useMeshCore()
const { t } = useI18n()
const { ago, duration, offset, formatNumber } = useFormat()

const selfInfo = ref<MeshCoreSelfInfo | null>(null)
const device = ref<DeviceSummary & { protocol: number } | null>(null)
const clockOffset = ref<number | null>(null)
const core = ref<MeshCoreStatsCore | null>(null)
const radio = ref<MeshCoreStatsRadio | null>(null)
const packets = ref<MeshCoreStatsPackets | null>(null)
const firstSample = ref<CounterSample | null>(null)
const lastSample = ref<CounterSample | null>(null)
const failed = ref(false)
const refreshing = ref(false)
const now = ref(Date.now())
const healthOpen = ref(false)
const { position, altitude, altitudeAccuracy, unavailable: noLocation } = useDevicePosition()
// Only asked when the GPS gives no altitude, so the position leaves the app
// only then.
const elevation = computed(() => altitude.value === null && position.value ? elevationAt(position.value) : undefined)
let clock: ReturnType<typeof setInterval> | undefined

// Sequential on purpose: meshcore.js drops a stats response of the wrong type,
// so two getStats calls in flight can leave one waiting forever.
async function refresh() {
  if (refreshing.value || status.value !== 'connected') return
  refreshing.value = true
  const conn = connection.value!
  try {
    selfInfo.value ??= await withTimeout(conn.getSelfInfo())
    if (!device.value) {
      const info = await withTimeout(conn.deviceQuery(APP_PROTOCOL_VERSION))
      device.value = { ...parseDeviceInfo(info), protocol: info.firmwareVer }
    }
    const { epochSecs } = await withTimeout(conn.getDeviceTime())
    // The node only reports whole seconds.
    clockOffset.value = epochSecs - Math.floor(Date.now() / 1000)
    core.value = (await withTimeout(conn.getStatsCore())).data
    radio.value = (await withTimeout(conn.getStatsRadio())).data
    packets.value = (await withTimeout(conn.getStatsPackets())).data

    const sample = {
      at: Date.now(),
      recv: packets.value.recv,
      sent: packets.value.sent,
      errors: packets.value.nRecvErrors,
      txAirSecs: radio.value.txAirSecs
    }
    // Counters going backwards mean the node rebooted, so the session restarts.
    if (!firstSample.value || sample.recv < firstSample.value.recv) firstSample.value = sample
    lastSample.value = sample
    failed.value = false
  }
  catch {
    failed.value = true
    if (connection.value === conn && status.value === 'connected') showToast('companion.readFailed')
  }
  refreshing.value = false
  if (connection.value !== conn) refresh()
}

onMounted(() => {
  refresh()
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => clearInterval(clock))

watch(connection, (conn) => {
  if (conn) refresh()
})

onBeforeRouteLeave(() => {
  if (!healthOpen.value) return
  healthOpen.value = false
  return false
})

const statusText = computed(() => {
  if (refreshing.value) return t('companion.reading')
  if (failed.value && !lastSample.value) return t('companion.readFailed')
  if (!lastSample.value) return t('companion.reading')
  return t('companion.updated', { ago: ago(lastSample.value.at, now.value) })
})

const battery = computed(() => {
  if (!core.value) return null
  const level = batteryLevel(core.value.batteryMilliVolts)
  if (level >= BATTERY_OK_LEVEL) return { level, tone: 'success', label: t('battery.nominal') } as const
  if (level >= BATTERY_LOW_LEVEL) return { level, tone: 'warning', label: t('battery.low') } as const
  return { level, tone: 'error', label: t('battery.critical') } as const
})

const margin = computed(() => radio.value && selfInfo.value && linkMargin(radio.value.lastSnr, selfInfo.value.radioSf))

// This device's GPS altitude, else the ground under its position, as
// desktops give a position without altitude.
const altitudeStat = computed(() => {
  if (altitude.value !== null) {
    return { value: altitude.value, hint: altitudeAccuracy.value === null ? t('altitude.gps') : t('altitude.gpsAccuracy', { accuracy: formatNumber(altitudeAccuracy.value) }) }
  }
  if (typeof elevation.value === 'number') return { value: elevation.value, hint: t('altitude.ground') }
  if (noLocation.value) return { value: null, hint: t('altitude.blocked') }
  if (!position.value) return { value: null, hint: t('altitude.waiting') }
  return { value: null, hint: elevation.value === null ? t('altitude.lookupFailed') : t('altitude.lookingUp') }
})

const clockTone = computed((): Tone | undefined => {
  const drift = Math.abs(clockOffset.value ?? 0)
  if (drift < CLOCK_DRIFT_WARNING_SECS) return undefined
  return drift < CLOCK_DRIFT_BAD_SECS ? 'warning' : 'error'
})

function errorTone(rate: number | null): Tone | undefined {
  if (!rate || rate < ERROR_RATE_WARNING) return undefined
  return rate < ERROR_RATE_BAD ? 'warning' : 'error'
}

const session = computed(() => firstSample.value && lastSample.value && sessionErrors(firstSample.value, lastSample.value))
const errorRate = computed(() => packets.value && receiveErrorRate(packets.value))
const txShare = computed(() => radio.value && core.value && airtimeShare(radio.value.txAirSecs, core.value.uptimeSecs))

interface HealthCheck {
  name: string
  value: string
  tone: Tone
  status: string
  detail: string
}

function errorCheck(name: string, rate: number, bad: number, detail: string): HealthCheck {
  const tone = errorTone(rate) ?? 'success'
  return {
    name,
    value: `${formatNumber(rate * 100, 1)} %`,
    tone,
    status: t(`checks.errors.${tone}`),
    detail: t(detail, { n: formatNumber(bad) }, bad)
  }
}

const checks = computed(() => {
  if (!core.value || !battery.value) return null
  const charge = t('checks.batteryCharge', { percent: formatNumber(battery.value.level * 100) })
  const list: HealthCheck[] = [{
    name: t('checks.battery'),
    value: `${formatNumber(core.value.batteryMilliVolts / 1000, 2)} V`,
    tone: battery.value.tone,
    status: battery.value.label,
    detail: battery.value.tone === 'success' ? charge : `${charge} ${t('checks.plugIn')}`
  }]
  if (margin.value && radio.value && selfInfo.value) {
    list.push({
      name: t('checks.margin'),
      value: `${formatNumber(margin.value.value, 1)} dB`,
      tone: margin.value.tone,
      status: t(`margin.${margin.value.grade}`),
      detail: t('checks.marginDetail', { snr: formatNumber(radio.value.lastSnr, 1), sf: selfInfo.value.radioSf, floor: formatNumber(snrFloor(selfInfo.value.radioSf), 1), fair: MARGIN_FAIR_DB })
    })
  }
  if (clockOffset.value !== null) {
    list.push({
      name: t('checks.clock'),
      value: offset(clockOffset.value),
      tone: clockTone.value ?? 'success',
      status: clockTone.value ? t('checks.clockOff') : t('checks.clockOk'),
      detail: clockTone.value ? t('checks.clockOffDetail') : t('checks.clockOkDetail')
    })
  }
  if (packets.value && errorRate.value !== null) {
    list.push(errorCheck(t('checks.errorsSinceBoot'), errorRate.value, packets.value.nRecvErrors, 'checks.errorsSinceBootDetail'))
  }
  if (session.value) {
    list.push(errorCheck(t('checks.errorsSession'), session.value.rate, session.value.errors, 'checks.errorsSessionDetail'))
  }
  return list
})

const issues = computed(() => checks.value?.filter(check => check.tone !== 'success') ?? [])

const health = computed(() => {
  if (!checks.value) return null
  if (issues.value.some(issue => issue.tone === 'error')) return { tone: 'error', label: t('health.problem') } as const
  if (issues.value.length) return { tone: 'warning', label: t('health.attention') } as const
  return { tone: 'success', label: t('health.healthy') } as const
})

const TONE_ICONS = { success: mdiCheckCircle, warning: mdiAlert, error: mdiAlertCircle }
</script>

<template>
  <div class="mx-auto grid w-full max-w-page grid-cols-1 gap-3 px-4 py-3.5 sm:grid-cols-2">
    <section class="glass card col-span-full flex flex-col gap-2.5 px-4 py-3.5">
      <AppProgress v-if="refreshing" class="progress-top text-primary" />
      <div class="flex items-center gap-2">
        <div class="min-w-0 grow">
          <div class="text-title">{{ selfInfo?.name ?? $t('nav.companion') }}</div>
          <!-- Kept while loading so the card does not grow once the node answers. -->
          <div class="font-mono text-small text-medium">
            <template v-if="selfInfo">{{ formatNumber(selfInfo.radioFreq / 1000, 3) }} MHz · {{ formatNumber(selfInfo.radioBw / 1000, 1, 0) }} kHz</template>
            <template v-else>&nbsp;</template>
          </div>
        </div>
        <button type="button" class="btn btn-icon btn-tonal text-primary" :aria-label="$t('companion.refresh')" :aria-busy="refreshing" @click="refresh">
          <AppIcon :icon="mdiRefresh" :class="{ 'animate-spin': refreshing }" />
        </button>
        <button type="button" class="btn btn-icon btn-tonal text-error" :aria-label="$t('companion.disconnect')" @click="disconnect">
          <AppIcon :icon="mdiPower" />
        </button>
      </div>
      <div class="status-row">
        <span class="dot" :class="[refreshing ? 'text-primary' : failed ? 'text-error' : 'text-success', { 'animate-blink': refreshing }]" />
        <span>{{ statusText }}</span>
        <DialogRoot v-if="health && issues.length" v-model:open="healthOpen">
          <DialogTrigger class="chip ms-auto" :class="`text-${health.tone}`">
            <AppIcon :icon="TONE_ICONS[health.tone]" size="16" />
            {{ health.label }}
            <AppIcon :icon="mdiChevronRight" size="16" />
          </DialogTrigger>
          <DialogPortal>
            <DialogOverlay class="overlay bg-black/60" />
            <!-- Opaque, the glass lets the cards behind show through the text. -->
            <DialogContent
              class="card fixed top-1/2 left-1/2 z-(--z-overlay) flex max-h-[calc(100dvh-48px)] w-[calc(100%-48px)] max-w-110 -translate-1/2 flex-col border border-glass-border bg-surface shadow-[0_12px_32px_var(--color-glass-shadow)]"
              :aria-describedby="undefined"
            >
              <DialogTitle class="px-6 pt-4 pb-2.5 text-title tracking-normal">{{ health.label }}</DialogTitle>
              <div class="flex flex-col gap-4 overflow-y-auto px-6">
                <div v-for="check in issues" :key="check.name" class="flex gap-3">
                  <AppIcon :icon="TONE_ICONS[check.tone]" :class="`text-${check.tone}`" />
                  <div class="min-w-0 grow">
                    <div class="flex justify-between gap-2">
                      <span class="font-medium">{{ check.name }}</span>
                      <span class="font-mono whitespace-nowrap" :class="`text-${check.tone}`">{{ check.value }}</span>
                    </div>
                    <div class="text-small" :class="`text-${check.tone}`">{{ check.status }}</div>
                    <div class="mt-1 text-small text-medium">{{ check.detail }}</div>
                  </div>
                </div>
              </div>
              <div class="flex p-2">
                <DialogClose class="btn ms-auto">{{ $t('common.close') }}</DialogClose>
              </div>
            </DialogContent>
          </DialogPortal>
        </DialogRoot>
        <span v-else-if="health" class="chip ms-auto" :class="`text-${health.tone}`">
          <AppIcon :icon="TONE_ICONS[health.tone]" size="16" />
          {{ health.label }}
        </span>
      </div>
    </section>

    <VitalsCard v-if="selfInfo" :title="$t('settings.title')" :chip="`SF${selfInfo.radioSf} · CR 4/${selfInfo.radioCr}`">
      <VitalStat :label="$t('settings.frequency')" :value="formatNumber(selfInfo.radioFreq / 1000, 3)" unit="MHz" />
      <VitalStat :label="$t('settings.bandwidth')" :value="formatNumber(selfInfo.radioBw / 1000, 1, 0)" unit="kHz" />
      <VitalStat :label="$t('settings.txPower')" :value="formatNumber(selfInfo.txPower)" unit="dBm" :hint="$t('settings.txPowerMax', { max: selfInfo.maxTxPower })" />
      <VitalStat :label="$t('settings.floor')" :value="formatNumber(snrFloor(selfInfo.radioSf), 1, 0)" unit="dB" :hint="$t('settings.floorFor', { sf: selfInfo.radioSf })" />
    </VitalsCard>

    <VitalsCard v-if="device" :title="$t('device.title')" :chip="$t('device.protocol', { version: device.protocol })">
      <VitalStat class="col-span-full" :label="$t('device.model')" :value="device.model ?? $t('common.unknown')" />
      <VitalStat :label="$t('device.firmware')" :value="device.version ?? $t('common.unknown')" :hint="device.buildDate ? $t('device.built', { date: device.buildDate }) : undefined" />
      <VitalStat v-if="clockOffset !== null" :label="$t('device.clockOffset')" :value="offset(clockOffset)" :tone="clockTone" :hint="$t('device.clockOffsetHint')" />
      <VitalStat
        :label="$t('altitude.label')"
        :value="altitudeStat.value === null ? $t('common.na') : formatNumber(altitudeStat.value)"
        :unit="altitudeStat.value === null ? undefined : 'm'"
        :hint="altitudeStat.hint"
      />
    </VitalsCard>

    <VitalsCard v-if="core && battery" :title="$t('health.title')" :chip="battery.label" :chip-color="battery.tone">
      <VitalStat :label="$t('checks.battery')" :value="formatNumber(core.batteryMilliVolts / 1000, 2)" unit="V" :tone="battery.tone" :hint="$t('battery.charged', { percent: formatNumber(battery.level * 100) })" />
      <VitalStat :label="$t('health.uptime')" :value="duration(core.uptimeSecs)" />
      <AppProgress class="col-span-full" :class="`text-${battery.tone}`" :value="battery.level * 100" />
      <VitalStat :label="$t('health.queue')" :value="formatNumber(core.queueLen)" :hint="core.queueLen ? $t('health.queueWaiting') : $t('health.queueEmpty')" />
    </VitalsCard>

    <VitalsCard v-if="radio" :title="$t('reception.title')" :chip="margin ? $t(`margin.${margin.grade}`) : undefined" :chip-color="margin?.tone">
      <VitalStat :label="$t('reception.noiseFloor')" :value="formatNumber(radio.noiseFloor)" unit="dBm" />
      <VitalStat :label="$t('reception.lastRssi')" :value="formatNumber(radio.lastRssi)" unit="dBm" />
      <VitalStat :label="$t('reception.lastSnr')" :value="formatNumber(radio.lastSnr, 1)" unit="dB" />
      <VitalStat v-if="margin" :label="$t('reception.margin')" :value="formatNumber(margin.value, 1)" unit="dB" :tone="margin.tone" />
    </VitalsCard>

    <VitalsCard v-if="packets" :title="$t('traffic.title')" :chip="$t('traffic.sinceBoot')">
      <VitalStat :label="$t('traffic.received')" :value="formatNumber(packets.recv)" :hint="$t('traffic.split', { direct: formatNumber(packets.nRecvDirect), flood: formatNumber(packets.nRecvFlood) })" />
      <VitalStat :label="$t('traffic.sent')" :value="formatNumber(packets.sent)" :hint="$t('traffic.split', { direct: formatNumber(packets.nSentDirect), flood: formatNumber(packets.nSentFlood) })" />
      <VitalStat :label="$t('traffic.errors')" :value="errorRate === null ? $t('common.na') : formatNumber(errorRate * 100, 1)" :unit="errorRate === null ? undefined : '%'" :tone="errorTone(errorRate)" :hint="$t('traffic.badPackets', { n: formatNumber(packets.nRecvErrors) }, packets.nRecvErrors)" />
      <VitalStat v-if="radio" :label="$t('traffic.airtime')" :value="txShare === null ? $t('common.na') : formatNumber(txShare * 100, 2)" :unit="txShare === null ? undefined : '% TX'" :hint="`RX ${formatNumber(radio.rxAirSecs / 60)} min`" />
    </VitalsCard>
  </div>
</template>

