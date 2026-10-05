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
  <div class="flex min-w-0 flex-col gap-px">
    <span class="text-small text-medium">{{ label }}</span>
    <span class="text-title leading-tight tracking-normal wrap-anywhere" :class="[tone && `text-${tone}`, { 'font-mono': /^[\d\s.,+−-]+$/.test(value) }]">
      {{ value }}<span v-if="unit" class="ml-0.75 text-small leading-[inherit] text-medium">{{ unit }}</span>
    </span>
    <span v-if="hint" class="text-small text-disabled">{{ hint }}</span>
  </div>
</template>
