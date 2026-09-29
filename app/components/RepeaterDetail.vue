<script setup lang="ts">
import { mdiClose, mdiOpenInNew } from '@mdi/js'

const props = defineProps<{
  row: RepeaterRow
  heading: number | null
  spreadingFactor: number | null
  now: number
}>()

defineEmits<{ select: [id: string] }>()

const { t } = useI18n()
const { ago, hops, formatNumber, formatDistance } = useFormat()

// Following a via link removes the button that had the focus.
const closeButton = ref<{ $el: HTMLElement } | null>(null)
watch(() => props.row.repeater.id, () => nextTick(() => closeButton.value?.$el.focus()))

const history = computed(() => props.row.repeater.history)

const stats = computed(() => {
  const snrs = history.value.map(sample => sample.snr)
  if (!snrs.length) return null
  return { average: snrs.reduce((sum, snr) => sum + snr, 0) / snrs.length, lowest: Math.min(...snrs) }
})

const shortKey = computed(() => {
  const id = props.row.repeater.id.toUpperCase()
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id
})
</script>

<template>
  <div class="flex flex-col gap-4 px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
    <!-- Stays on top while the rest scrolls, so the close button is always there.
         Opaque, a blur does not work inside the already blurred panel. -->
    <header class="sticky top-0 z-1 -mx-4 -mt-4 flex items-center gap-3 bg-surface p-4">
      <CompassDial
        class="shrink-0"
        :class="row.repeater.hops || row.outOfRange ? 'text-medium' : `text-${row.link?.tone ?? 'primary'}`"
        :bearing="row.bearing"
        :heading="heading"
      />
      <div class="min-w-0 grow">
        <DialogTitle class="truncate text-title">{{ row.name }}</DialogTitle>
        <!-- One line: only the key gets cut short. -->
        <div class="flex min-w-0 overflow-hidden font-mono text-small whitespace-nowrap text-medium">
          <span v-if="row.distance !== null" class="shrink-0">{{ formatDistance(row.distance) }} ·&nbsp;</span>
          <span v-if="typeof row.altitude === 'number'" class="shrink-0">{{ $t('repeaters.altitude', { altitude: formatNumber(row.altitude) }) }} ·&nbsp;</span>
          <span class="truncate">{{ shortKey }}</span>
        </div>
      </div>
      <DialogClose ref="closeButton" class="btn btn-icon" :aria-label="$t('common.close')">
        <AppIcon :icon="mdiClose" />
      </DialogClose>
    </header>

    <template v-if="!row.repeater.hops">
      <div class="flex items-center gap-3">
        <MarginGauge :margin="row.link?.value ?? null" :tone="row.link?.tone" />
        <div class="flex min-w-0 flex-col items-start gap-1">
          <span v-if="row.outOfRange" class="chip chip-small">{{ $t('repeaters.outOfRange') }}</span>
          <span v-else-if="row.link" class="chip chip-small" :class="`text-${row.link.tone}`">{{ $t(`margin.${row.link.grade}`) }}</span>
          <span v-if="row.outOfRange" class="text-small text-medium">{{ $t('detail.outOfRange') }}</span>
          <span>{{ $t('detail.marginTitle') }}</span>
          <span v-if="spreadingFactor !== null" class="text-small text-medium">
            {{ $t('detail.marginHelp', { sf: spreadingFactor, floor: formatNumber(snrFloor(spreadingFactor), 1, 0), fair: MARGIN_FAIR_DB, comfortable: MARGIN_COMFORTABLE_DB }) }}
          </span>
        </div>
      </div>

      <section class="section">
        <div class="section-title">{{ $t('detail.signal') }}</div>
        <div class="stats">
          <VitalStat
            :label="$t('detail.youHearIt')"
            :value="row.repeater.rx ? formatNumber(row.repeater.rx.snr, 2, 0) : $t('common.na')"
            :unit="row.repeater.rx ? 'dB SNR' : undefined"
            :tone="row.rx?.tone"
            :hint="row.repeater.rx ? `RX · ${formatNumber(row.repeater.rx.rssi)} dBm · ${ago(row.repeater.rx.at, now)}` : 'RX'"
          />
          <VitalStat
            :label="$t('detail.itHearsYou')"
            :value="row.repeater.tx ? formatNumber(row.repeater.tx.snr, 2, 0) : $t('common.na')"
            :unit="row.repeater.tx ? 'dB SNR' : undefined"
            :tone="row.tx?.tone"
            :hint="row.repeater.tx ? `TX · ${t('detail.scanned', { ago: ago(row.repeater.tx.at, now) })}` : `TX · ${t('detail.scanToMeasure')}`"
          />
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <span>{{ $t('detail.reception') }}</span>
          <span class="text-small text-medium">{{ $t('detail.packets', { n: formatNumber(history.length) }, history.length) }}</span>
        </div>
        <div v-if="stats" class="stats">
          <VitalStat :label="$t('detail.averageSnr')" :value="formatNumber(stats.average, 1)" unit="dB" />
          <VitalStat :label="$t('detail.lowestSnr')" :value="formatNumber(stats.lowest, 2, 0)" unit="dB" />
        </div>
        <SnrChart v-if="history.length && spreadingFactor !== null" :samples="history" :spreading-factor="spreadingFactor" :now="now" />
        <p v-else class="text-small text-medium">{{ $t('detail.chartEmpty') }}</p>
      </section>
    </template>

    <section v-else class="section">
      <div class="section-title">{{ $t('detail.route') }}</div>
      <p class="text-small text-medium">
        <i18n-t keypath="detail.heardThrough" scope="global">
          <template #hops>{{ hops(row.repeater.hops) }}</template>
          <template #through>
            <button v-if="row.repeater.via" type="button" class="text-primary" @click="$emit('select', row.repeater.via)">{{ row.viaName }}</button>
            <template v-else>{{ $t('detail.unknownRepeater') }}</template>
          </template>
        </i18n-t>
        {{ $t('detail.lastHopOnly') }}
      </p>
    </section>

    <TerrainProfile :row="row" />

    <section class="section">
      <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-small">
        <dt class="text-medium">{{ $t('detail.lastHeard') }}</dt>
        <dd class="text-right">{{ ago(row.repeater.lastHeard, now) }}</dd>
        <dt class="text-medium">{{ $t('detail.position') }}</dt>
        <dd class="text-right font-mono">
          <a
            v-if="row.position"
            class="text-primary"
            :href="`https://www.google.com/maps/search/?api=1&query=${row.position.lat},${row.position.lon}`"
            target="_blank"
            rel="noopener"
          >
            <!-- Always with a decimal point, a comma would clash with the one between them. -->
            {{ row.position.lat.toFixed(5) }}, {{ row.position.lon.toFixed(5) }}
            <AppIcon :icon="mdiOpenInNew" size="12" class="inline align-baseline" />
          </a>
          <template v-else>{{ $t('detail.unknown') }}</template>
        </dd>
        <dt class="text-medium">{{ $t('detail.groundAltitude') }}</dt>
        <dd class="text-right font-mono">
          <template v-if="typeof row.altitude === 'number'">{{ formatNumber(row.altitude) }} m</template>
          <template v-else-if="row.altitude === undefined">{{ $t('detail.lookingUp') }}</template>
          <template v-else>{{ $t('detail.unknown') }}</template>
        </dd>
        <dt class="text-medium">{{ row.repeater.id.length < 64 ? $t('detail.keyPrefix') : $t('detail.publicKey') }}</dt>
        <dd class="text-right font-mono wrap-anywhere">{{ row.repeater.id }}</dd>
      </dl>
    </section>
  </div>
</template>
