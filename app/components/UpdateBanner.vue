<script setup lang="ts">
import { mdiUpdate } from '@mdi/js'

const { available, apply } = useAppUpdate()
const { connection } = useMeshCore()
const dismissed = ref(false)

// Without a node connected the plugin reloads by itself before this shows,
// unless that reload already failed to bring the new version.
const open = computed({
  get: () => available.value && !dismissed.value,
  set: (value) => {
    if (!value) dismissed.value = true
  }
})
</script>

<template>
  <ToastProvider :duration="0">
    <ToastRoot v-model:open="open" class="toast">
      <AppIcon :icon="mdiUpdate" class="text-primary" />
      <ToastDescription class="flex-grow-1">{{ $t('update.available') }}<template v-if="connection"> {{ $t('update.disconnects') }}</template></ToastDescription>
      <ToastClose class="btn">{{ $t('update.later') }}</ToastClose>
      <button type="button" class="btn btn-tonal text-primary" @click="apply">{{ $t('update.reload') }}</button>
    </ToastRoot>
    <ToastViewport class="toasts update" />
  </ToastProvider>
</template>

<style scoped lang="scss">
.update {
  top: calc(12px + env(safe-area-inset-top));
}
</style>
