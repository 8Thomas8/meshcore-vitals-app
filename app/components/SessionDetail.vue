<script setup lang="ts">
import { mdiCircleMedium, mdiClose, mdiDeleteOutline } from '@mdi/js'
import { refAutoReset } from '@vueuse/core'

const props = defineProps<{ session: Session }>()

const { remove } = useHistory()
const confirming = refAutoReset(false, REMOVE_CONFIRM_MS)

const { t } = useI18n()
const announcement = ref('')
watch(confirming, (value) => {
  announcement.value = t(value ? 'history.confirmRemove' : 'history.removeCancelled')
})
const { hops, duration, time, day, formatNumber, formatDistance } = useFormat()

function margin(snr: number | null) {
  return snr === null || props.session.spreadingFactor === null ? null : linkMargin(snr, props.session.spreadingFactor)
}

function nameOf(id: string) {
  return props.session.repeaters.find(repeater => samePrefix(repeater.id, id))?.name ?? t('repeaters.unnamed', { id: id.slice(0, 8).toUpperCase() })
}

const rows = computed(() => props.session.repeaters
  .map(repeater => ({
    repeater,
    name: repeater.name ?? t('repeaters.unnamed', { id: repeater.id.slice(0, 8).toUpperCase() }),
    route: repeater.hops ? t('repeaters.via', { hops: hops(repeater.hops), name: repeater.via ? nameOf(repeater.via) : t('repeaters.unknown') }) : t('repeaters.direct'),
    rx: margin(repeater.rx),
    tx: margin(repeater.tx),
    link: margin(repeater.rx === null ? null : Math.min(repeater.rx, repeater.tx ?? repeater.rx))
  }))
  .sort((a, b) => a.repeater.hops - b.repeater.hops || (b.link?.value ?? -Infinity) - (a.link?.value ?? -Infinity)))

const mapped = computed(() => props.session.scans.some(scan => scan.position) || props.session.repeaters.some(repeater => repeater.position))
</script>

<template>
  <div class="flex flex-col gap-4 px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
    <header class="sticky top-0 z-1 -mx-4 -mt-4 flex items-center gap-3 bg-surface p-4">
      <div class="min-w-0 grow">
        <DialogTitle class="truncate text-title first-letter:uppercase">{{ day(session.startedAt) }}</DialogTitle>
        <div class="truncate text-small text-medium">
          {{ time(session.startedAt) }} – {{ time(session.endedAt) }}<template v-if="session.companionName"> · {{ session.companionName }}</template>
        </div>
      </div>
      <DialogClose class="btn btn-icon" :aria-label="$t('common.close')">
        <AppIcon :icon="mdiClose" />
      </DialogClose>
    </header>

    <LazySessionMap v-if="mapped" class="h-56 shrink-0" :session="session" />

    <div class="grid grid-cols-3 gap-4">
      <VitalStat :label="$t('history.duration')" :value="duration(Math.round((session.endedAt - session.startedAt) / 1000))" />
      <VitalStat :label="$t('history.distance')" :value="formatDistance(sessionDistance(session.scans))" />
      <VitalStat :label="$t('history.scans')" :value="formatNumber(session.scans.length)" />
    </div>

    <section class="section">
      <div class="section-title">{{ $t('history.coverage') }}</div>
      <template v-if="session.scans.length">
        <CoverageTimeline :session="session" />
        <div class="flex justify-between font-mono text-small text-medium">
          <span>{{ time(session.scans[0]!.at) }}</span>
          <span>{{ time(session.endedAt) }}</span>
        </div>
      </template>
      <p v-else class="text-small text-medium">{{ $t('history.noScan') }}</p>
    </section>

    <section class="section">
      <div class="section-title">
        <span>{{ $t('repeaters.count', session.repeaters.length) }}</span>
        <span class="text-small text-medium">{{ $t('history.bestSnr') }}</span>
      </div>
      <div class="-mx-4 divide-y divide-glass-border border-y border-glass-border">
        <div v-for="row in rows" :key="row.repeater.id" class="flex items-center gap-3 px-4 py-2.5">
          <AppIcon
            :icon="row.repeater.hops || !row.link ? mdiCircleMedium : TONE_ICONS[row.link.tone]"
            size="18"
            :class="row.repeater.hops || !row.link ? 'text-disabled' : `text-${row.link.tone}`"
          />
          <span class="flex min-w-0 grow flex-col">
            <span class="truncate font-medium">{{ row.name }}</span>
            <span class="truncate text-small text-medium">{{ row.route }}</span>
          </span>
          <LinkReadout
            v-if="!row.repeater.hops"
            class="grid w-36 shrink-0 gap-2"
            :rx="row.repeater.rx"
            :tx="row.repeater.tx"
            :rx-margin="row.rx"
            :tx-margin="row.tx"
          />
        </div>
      </div>
    </section>

    <button
      type="button"
      class="btn self-start"
      :class="confirming ? 'btn-filled bg-error text-on-primary' : 'btn-tonal text-error'"
      @click="confirming ? remove(session.startedAt).catch(() => {}) : confirming = true"
      @blur="confirming = false"
    >
      <AppIcon :icon="mdiDeleteOutline" size="18" />
      {{ confirming ? $t('history.confirmRemove') : $t('history.remove') }}
    </button>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
