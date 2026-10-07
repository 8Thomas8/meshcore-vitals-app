<script setup lang="ts">
import { mdiBluetoothOff, mdiLoading } from '@mdi/js'

const { connection, status, error, retrying, connect } = useMeshCore()
const { message } = useFormat()
</script>

<template>
  <ToastRoot :duration="0" :open="!!connection && status !== 'connected'" type="foreground" class="toast bg-linear-to-r" :class="retrying ? 'border-warning from-warning/15 to-warning/15' : 'border-error from-error/15 to-error/15'" @escape-key-down.prevent>
    <span class="toast-icon" :class="retrying ? 'text-warning' : 'text-error'">
      <AppIcon :icon="mdiBluetoothOff" />
    </span>
    <div class="toast-body">
      <ToastDescription class="min-w-0 flex-1">{{ $t('reconnect.lost') }} {{ retrying ? $t('reconnect.retrying') : error ? message(error) : '' }}</ToastDescription>
      <ToastAction :alt-text="$t('reconnect.button')" as-child>
        <button type="button" class="btn btn-tonal text-primary" :disabled="status === 'connecting'" @click="connect()">
          <AppIcon v-if="status === 'connecting'" :icon="mdiLoading" class="animate-spin" size="18" />
          {{ $t('reconnect.button') }}
        </button>
      </ToastAction>
    </div>
  </ToastRoot>
</template>
