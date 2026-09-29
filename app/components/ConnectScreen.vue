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
  <div class="connect d-flex flex-column flex-grow-1 justify-center align-center ga-4 text-center">
    <AppLogo class="mb-2" />
    <h1 class="heading">MeshCore Vitals</h1>
    <p class="tagline text-medium-emphasis">{{ $t('connect.tagline') }}</p>

    <div class="w-100 mt-2 d-flex flex-column ga-2">
      <button type="button" class="btn btn-filled connect-button" :disabled="!bluetoothSupported || status === 'connecting'" @click="connect">
        <AppIcon :icon="status === 'connecting' ? mdiLoading : mdiBluetooth" :class="{ spin: status === 'connecting' }" />
        {{ $t('connect.button') }}
      </button>
      <p v-if="!bluetoothSupported" class="text-hint text-error">{{ $t('connect.noBluetooth') }}</p>
      <p v-else-if="error" class="text-hint text-error">{{ message(error) }}</p>
      <p v-else class="text-hint text-disabled">{{ $t('connect.hint') }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.connect {
  width: 100%;
  max-width: 390px;
  margin-inline: auto;
  padding: 16px;
}

.connect-button {
  width: 100%;
  height: 52px;
  font-size: 18px;
}

.heading {
  margin: 0;
  line-height: 1.2;
  font-size: var(--text-display);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.tagline {
  max-width: 30ch;
  font-size: var(--text-body);
}
</style>
