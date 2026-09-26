<script setup lang="ts">
import { mdiAlertCircleOutline } from '@mdi/js'

const open = ref(false)

watch(elevationThrottled, () => {
  open.value = true
}, { once: true })
</script>

<template>
  <v-snackbar v-model="open" class="quota" location="bottom" :timeout="6000" rounded="xl" color="surface">
    <div class="d-flex align-center ga-3">
      <v-icon :icon="mdiAlertCircleOutline" color="warning" />
      <span>{{ $t('quota.reached') }}</span>
    </div>
    <template #actions>
      <v-btn variant="text" @click="open = false">{{ $t('common.close') }}</v-btn>
    </template>
  </v-snackbar>
</template>

<style scoped lang="scss">
.quota {
  margin-bottom: calc(20px + env(safe-area-inset-bottom));
}
</style>
