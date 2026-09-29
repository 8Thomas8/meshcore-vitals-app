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
  <ToastProvider :duration="0" disable-swipe>
    <ToastRoot v-model:open="open" type="background" class="toast" @escape-key-down.prevent>
      <AppIcon :icon="mdiUpdate" class="text-primary" />
      <ToastDescription class="grow">{{ $t('update.available') }}<template v-if="connection"> {{ $t('update.disconnects') }}</template></ToastDescription>
      <ToastClose class="btn">{{ $t('update.later') }}</ToastClose>
      <ToastAction :alt-text="$t('update.reload')" as-child>
        <button type="button" class="btn btn-tonal text-primary" @click="apply">{{ $t('update.reload') }}</button>
      </ToastAction>
    </ToastRoot>
    <ToastViewport class="toasts toasts-top" />
  </ToastProvider>
</template>
