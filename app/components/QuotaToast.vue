<script setup lang="ts">
import { mdiAlertCircleOutline } from '@mdi/js'

const open = ref(false)

watch(elevationThrottled, () => {
  open.value = true
}, { once: true })
</script>

<template>
  <ToastProvider :duration="6000">
    <ToastRoot v-model:open="open" class="toast">
      <AppIcon :icon="mdiAlertCircleOutline" class="text-warning" />
      <ToastDescription class="flex-grow-1">{{ $t('quota.reached') }}</ToastDescription>
      <ToastClose class="btn">{{ $t('common.close') }}</ToastClose>
    </ToastRoot>
    <ToastViewport class="toasts quota" />
  </ToastProvider>
</template>

<style scoped lang="scss">
.quota {
  bottom: calc(20px + env(safe-area-inset-bottom));
}
</style>
