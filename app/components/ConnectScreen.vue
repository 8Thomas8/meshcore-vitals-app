<script setup lang="ts">
import { mdiBluetooth, mdiLoading } from '@mdi/js'

const { status, error, connect } = useMeshCore()
const { message } = useFormat()

const bluetoothSupported = ref(true)
onMounted(() => {
  bluetoothSupported.value = 'bluetooth' in navigator
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-97.5 grow flex-col items-center justify-center gap-4 p-4 text-center">
    <AppLogo class="mb-2" />
    <h1 class="text-display leading-[1.2] font-extrabold tracking-[-0.02em]">MeshCore Vitals</h1>
    <p class="my-[1em] max-w-[30ch] text-body text-medium">{{ $t('connect.tagline') }}</p>

    <div class="mt-2 flex w-full flex-col gap-2">
      <button type="button" class="btn btn-filled h-13 w-full text-subtitle" :disabled="!bluetoothSupported || status === 'connecting'" @click="connect">
        <AppIcon :icon="status === 'connecting' ? mdiLoading : mdiBluetooth" :class="{ 'animate-spin': status === 'connecting' }" />
        {{ $t('connect.button') }}
      </button>
      <p v-if="!bluetoothSupported" class="mt-1 text-hint text-error">{{ $t('connect.noBluetooth') }}</p>
      <p v-else-if="error" class="mt-1 text-hint text-error">{{ message(error) }}</p>
      <p v-else class="mt-1 text-hint text-disabled">{{ $t('connect.hint') }}</p>
    </div>
  </div>
</template>
