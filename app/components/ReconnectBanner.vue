<script setup lang="ts">
import { mdiBluetoothOff, mdiLoading } from '@mdi/js'

const { connection, status, error, retrying, connect } = useMeshCore()
const { message } = useFormat()
</script>

<template>
  <ToastProvider :duration="0" disable-swipe>
    <ToastRoot :open="!!connection && status !== 'connected'" type="foreground" class="toast bg-linear-to-r" :class="retrying ? 'border-warning from-warning/15 to-warning/15' : 'border-error from-error/15 to-error/15'" @escape-key-down.prevent>
      <AppIcon :icon="mdiBluetoothOff" :class="retrying ? 'text-warning' : 'text-error'" />
      <ToastDescription class="min-w-0 flex-1">{{ $t('reconnect.lost') }} {{ retrying ? $t('reconnect.retrying') : error ? message(error) : '' }}</ToastDescription>
      <ToastAction :alt-text="$t('reconnect.button')" as-child>
        <button type="button" class="btn btn-tonal text-primary" :disabled="status === 'connecting'" @click="connect()">
          <AppIcon v-if="status === 'connecting'" :icon="mdiLoading" class="animate-spin" size="18" />
          {{ $t('reconnect.button') }}
        </button>
      </ToastAction>
    </ToastRoot>
    <ToastViewport class="toasts toasts-bottom" />
  </ToastProvider>
</template>
