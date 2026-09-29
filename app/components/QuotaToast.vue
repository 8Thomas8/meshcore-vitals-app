<script setup lang="ts">
import { mdiAlertCircleOutline } from '@mdi/js'

const open = ref(false)

watch(elevationThrottled, () => {
  open.value = true
}, { once: true })
</script>

<template>
  <ToastProvider :duration="6000" disable-swipe>
    <ToastRoot v-model:open="open" type="background" class="toast" @escape-key-down.prevent>
      <AppIcon :icon="mdiAlertCircleOutline" class="text-warning" />
      <ToastDescription class="grow">{{ $t('quota.reached') }}</ToastDescription>
      <ToastClose class="btn">{{ $t('common.close') }}</ToastClose>
    </ToastRoot>
    <ToastViewport class="toasts toasts-bottom" />
  </ToastProvider>
</template>
