<script setup lang="ts">
defineProps<{ title: string, chip?: string, chipColor?: Tone }>()
</script>

<template>
  <section class="glass card flex flex-col gap-3 px-4 pt-3.5 pb-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-subtitle font-medium tracking-[0.0125em]">{{ title }}</h2>
      <span v-if="chip" class="chip chip-small" :class="`text-${chipColor ?? 'primary'}`">{{ chip }}</span>
    </div>
    <div class="stats">
      <slot />
    </div>
  </section>
</template>
