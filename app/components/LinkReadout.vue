<script setup lang="ts">
defineProps<{
  rx: number | null
  tx: number | null
  rxMargin: LinkMargin | null
  txMargin: LinkMargin | null
}>()

const { formatNumber } = useFormat()
</script>

<template>
  <span class="font-mono text-small">
    <span>
      <span class="text-medium">RX </span>
      <span :class="rxMargin && `text-${rxMargin.tone}`">
        <AppIcon v-if="rxMargin" :icon="TONE_ICONS[rxMargin.tone]" size="12" class="me-px inline align-[-1px]" />{{ rx === null ? $t('common.na') : `${formatNumber(rx, 2, 0)} dB` }}<span v-if="rxMargin" class="sr-only">, {{ $t(`margin.${rxMargin.grade}`) }}</span>
      </span>
    </span>
    <span>
      <span class="text-medium">TX </span>
      <span :class="txMargin ? `text-${txMargin.tone}` : 'text-disabled'">
        <AppIcon v-if="txMargin" :icon="TONE_ICONS[txMargin.tone]" size="12" class="me-px inline align-[-1px]" />{{ tx === null ? $t('common.na') : `${formatNumber(tx, 2, 0)} dB` }}<span v-if="txMargin" class="sr-only">, {{ $t(`margin.${txMargin.grade}`) }}</span>
      </span>
    </span>
  </span>
</template>
