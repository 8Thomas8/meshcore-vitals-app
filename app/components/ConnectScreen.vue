<script setup lang="ts">
import { mdiBluetooth, mdiLoading } from '@mdi/js'

const { status, error, connect } = useMeshCore()
const { message } = useFormat()

const bluetoothSupported = ref(true)
const knownDevices = shallowRef<MeshCoreBleDevice[]>([])
const picked = shallowRef<MeshCoreBleDevice>()
onMounted(async () => {
  bluetoothSupported.value = 'bluetooth' in navigator
  knownDevices.value = (await navigator.bluetooth?.getDevices?.().catch(() => []) ?? []).filter(device => device.name)
})

function connectTo(device?: MeshCoreBleDevice) {
  picked.value = device
  connect(device)
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-97.5 grow flex-col items-center justify-center gap-4 p-4 text-center">
    <AppLogo class="mb-2" />
    <h1 class="text-display leading-[1.2] font-extrabold tracking-[-0.02em]">MeshCore Vitals</h1>
    <p class="my-[1em] max-w-[30ch] text-body text-medium">{{ $t('connect.tagline') }}</p>

    <div class="mt-2 flex w-full flex-col gap-2">
      <button type="button" class="btn btn-filled h-13 w-full text-subtitle" :disabled="!bluetoothSupported || status === 'connecting'" @click="connectTo()">
        <AppIcon :icon="status === 'connecting' && !picked ? mdiLoading : mdiBluetooth" :class="{ 'animate-spin': status === 'connecting' && !picked }" />
        {{ $t('connect.button') }}
      </button>
      <button v-for="device in knownDevices" :key="device.id" type="button" class="btn btn-tonal h-13 w-full text-subtitle text-primary" :disabled="status === 'connecting'" @click="connectTo(device)">
        <AppIcon v-if="status === 'connecting' && picked === device" :icon="mdiLoading" class="animate-spin" />
        <span class="min-w-0 truncate">{{ $t('connect.reconnect', { name: device.name }) }}</span>
      </button>
      <p v-if="!bluetoothSupported" class="mt-1 text-hint text-error">{{ $t('connect.noBluetooth') }}</p>
      <p v-else-if="error" class="mt-1 text-hint text-error">{{ message(error) }}</p>
      <p v-else class="mt-1 text-hint text-disabled">{{ $t('connect.hint') }}</p>
    </div>
  </div>
</template>
