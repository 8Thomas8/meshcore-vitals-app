<script setup lang="ts">
defineProps<{ title: string, chip?: string, chipColor?: Tone }>()
</script>

<template>
  <section class="glass card">
    <div class="d-flex align-center justify-space-between ga-3">
      <h2 class="title">{{ title }}</h2>
      <span v-if="chip" class="chip chip-small" :class="`text-${chipColor ?? 'primary'}`">{{ chip }}</span>
    </div>
    <div class="stats">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.card {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: var(--text-subtitle);
  font-weight: 500;
  letter-spacing: 0.0125em;
}
</style>
