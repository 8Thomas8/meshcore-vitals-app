<script setup lang="ts">
defineProps<{
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: Tone
  large?: boolean
}>()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-px">
    <span class="text-small text-medium">{{ label }}</span>
    <span class="leading-tight tracking-normal wrap-anywhere" :class="[large ? 'text-reading' : 'text-title', tone && `text-${tone}`, isNumeric(value) && (large ? 'tabular-nums' : 'font-mono')]">
      {{ value }}<span v-if="unit" class="ml-0.75 text-small leading-[inherit] text-medium">{{ unit }}</span>
    </span>
    <slot />
    <span v-if="hint" class="text-small text-disabled">{{ hint }}</span>
  </div>
</template>
