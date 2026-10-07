<script setup lang="ts">
import { mdiAlertCircleOutline } from '@mdi/js'

const toasts = useToasts()
const { message } = useFormat()
</script>

<template>
  <ToastProvider :duration="6000" disable-swipe>
    <ReconnectBanner />
    <ToastRoot v-for="toast in toasts" :key="toast.id" v-model:open="toast.open" :type="toast.tone === 'error' ? 'foreground' : 'background'" class="toast" @escape-key-down.prevent>
      <span class="toast-icon" :class="toast.tone === 'error' ? 'text-error' : 'text-warning'">
        <AppIcon :icon="mdiAlertCircleOutline" />
      </span>
      <div class="toast-body">
        <ToastDescription class="basis-full leading-6">{{ message(toast.message) }}</ToastDescription>
        <ToastClose class="btn">{{ $t('common.close') }}</ToastClose>
      </div>
    </ToastRoot>
    <ToastViewport class="toasts toasts-bottom flex flex-col gap-2" />
  </ToastProvider>
</template>
