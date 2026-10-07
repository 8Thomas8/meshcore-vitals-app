<script setup lang="ts">
defineProps<{
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: Tone
}>()
</script>

<template>
  <div class="flex items-baseline justify-between gap-3 py-2">
    <dt class="text-label">{{ label }}</dt>
    <dd class="min-w-0 text-right">
      <span class="wrap-anywhere" :class="[tone && `text-${tone}`, isNumeric(value) && 'font-mono whitespace-nowrap']">{{ value }}</span><span v-if="unit" class="ml-1 text-small whitespace-nowrap text-medium">{{ unit }}</span>
      <span v-if="hint" class="block text-small text-disabled">{{ hint }}</span>
    </dd>
  </div>
</template>
