<script setup lang="ts">
const props = defineProps<{
  rx: number | null
  tx: number | null
  rxMargin: LinkMargin | null
  txMargin: LinkMargin | null
}>()

const { t } = useI18n()
const { formatNumber } = useFormat()

const links = computed(() => [
  { key: 'rx', tag: 'RX', label: t('link.received'), snr: props.rx, margin: props.rxMargin },
  { key: 'tx', tag: 'TX', label: t('link.sent'), snr: props.tx, margin: props.txMargin }
].map(link => ({
  ...link,
  value: link.snr === null ? t('common.na') : formatNumber(link.snr, 2, 0)
})))
</script>

<template>
  <span class="text-small">
    <span v-for="link in links" :key="link.key" class="@container flex min-w-0 flex-col gap-1">
      <span class="flex items-center gap-1.5 text-medium">
        <span class="font-mono" aria-hidden="true">{{ link.tag }}</span>
        <span class="sr-only">{{ link.label }}</span>
        <span class="font-mono font-medium whitespace-nowrap" :class="link.margin ? `text-${link.margin.tone}` : link.snr === null && 'text-disabled'">
          {{ link.value }}<span v-if="link.snr !== null" class="@max-[5rem]:sr-only"> dB</span><span v-if="link.margin" class="sr-only">, {{ $t(`margin.${link.margin.grade}`) }}</span>
        </span>
      </span>
      <MarginBar :margin="link.margin" />
    </span>
  </span>
</template>
