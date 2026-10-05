<script setup lang="ts">
import { mdiAlertCircleOutline } from '@mdi/js'

const toasts = useToasts()
const { message } = useFormat()
</script>

<template>
  <ToastProvider :duration="6000" disable-swipe>
    <ToastRoot v-for="toast in toasts" :key="toast.id" v-model:open="toast.open" type="background" class="toast grid grid-cols-[auto_1fr] items-start" @escape-key-down.prevent>
      <AppIcon :icon="mdiAlertCircleOutline" :class="toast.tone === 'error' ? 'text-error' : 'text-warning'" />
      <ToastDescription class="leading-6">{{ message(toast.message) }}</ToastDescription>
      <ToastClose class="btn col-start-2 justify-self-end">{{ $t('common.close') }}</ToastClose>
    </ToastRoot>
    <ToastViewport class="toasts toasts-bottom flex flex-col gap-2" />
  </ToastProvider>
</template>
