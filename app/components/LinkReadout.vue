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
      <span :class="rxMargin && `text-${rxMargin.tone}`">{{ rx === null ? $t('common.na') : `${formatNumber(rx, 2, 0)} dB` }}</span>
    </span>
    <span>
      <span class="text-medium">TX </span>
      <span :class="txMargin ? `text-${txMargin.tone}` : 'text-disabled'">{{ tx === null ? $t('common.na') : `${formatNumber(tx, 2, 0)} dB` }}</span>
    </span>
  </span>
</template>
