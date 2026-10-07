<script setup lang="ts">
defineProps<{ title: string, note?: string }>()
</script>

<template>
  <section class="panel card flex flex-col px-4 pt-3 pb-1">
    <div class="flex items-baseline justify-between gap-3 pb-1">
      <h2 class="text-small font-semibold tracking-wider text-medium uppercase">{{ title }}</h2>
      <span v-if="note" class="text-small text-medium">{{ note }}</span>
    </div>
    <dl class="divide-y divide-line">
      <slot />
    </dl>
  </section>
</template>
