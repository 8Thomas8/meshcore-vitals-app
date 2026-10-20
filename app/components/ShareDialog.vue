<script setup lang="ts">
import { mdiClose, mdiDownload, mdiInformationOutline, mdiShareVariant } from '@mdi/js'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ session?: Session }>()

const { t } = useI18n()
const { title, disabled, build } = props.session ? useSessionShare(() => props.session!) : useScanShare()

const open = ref(false)
const withPosition = ref(false)
const image = shallowRef<File | null>(null)
const preview = ref<string | null>(null)
const failed = ref(false)
const alt = ref('')
const positioned = ref(false)
const route = ref(false)
const closeButton = ref<{ $el: HTMLElement } | null>(null)
let contents = new Map<boolean, ShareScan>()
let blobs = new Map<boolean, Blob>()

let rendering = 0
async function render() {
  const id = ++rendering
  const position = withPosition.value
  const cache = blobs
  image.value = null
  failed.value = false
  try {
    const content = contents.get(position)!
    alt.value = t('share.preview', { title: content.title })
    const blob = cache.get(position) ?? await renderShareImage(content)
    cache.set(position, blob)
    if (id !== rendering) return
    image.value = new File([blob], SHARE_FILE_NAME, { type: blob.type })
    if (preview.value) URL.revokeObjectURL(preview.value)
    preview.value = URL.createObjectURL(blob)
  }
  catch {
    if (id === rendering) failed.value = true
  }
}

watch(withPosition, render)
watch(open, (value) => {
  if (!value) return
  contents = new Map([true, false].map(position => [position, build(position)]))
  blobs = new Map()
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
  const shown = contents.get(true)!
  route.value = !!shown.track.length
  positioned.value = !!shown.here || route.value
  render()
})

onBeforeUnmount(() => {
  if (preview.value) URL.revokeObjectURL(preview.value)
})

const canShare = ref(false)
const touch = ref(false)
onMounted(() => {
  touch.value = matchMedia('(pointer: coarse)').matches
  canShare.value = !!navigator.canShare?.({ files: [new File([], SHARE_FILE_NAME, { type: 'image/jpeg' })] })
})

function download() {
  if (!preview.value || !image.value) return
  const link = document.createElement('a')
  link.href = preview.value
  link.download = image.value.name
  link.click()
}

async function share() {
  if (!image.value) return
  try {
    await navigator.share({ files: [image.value] })
  }
  catch (error) {
    if ((error as DOMException).name !== 'AbortError') download()
  }
}

function focusClose(event: Event) {
  event.preventDefault()
  closeButton.value?.$el.focus()
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-bind="$attrs" :aria-label="title" :disabled="disabled">
      <AppIcon :icon="mdiShareVariant" size="20" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="overlay" />
      <DialogContent class="float dialog flex flex-col gap-4 p-4" :aria-describedby="undefined" @open-auto-focus="focusClose">
        <header class="flex items-center gap-3">
          <DialogTitle class="min-w-0 text-title">{{ title }}</DialogTitle>
          <PopoverRoot>
            <PopoverTrigger class="chip chip-small shrink-0 text-warning">
              {{ $t('history.beta') }}
              <AppIcon :icon="mdiInformationOutline" size="16" />
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent side="bottom" :side-offset="4" :collision-padding="8" class="float popover">
                <p class="py-1">{{ $t('share.betaHint') }}</p>
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>
          <DialogClose ref="closeButton" class="btn btn-icon -my-2 ms-auto -me-2" :aria-label="$t('common.close')">
            <AppIcon :icon="mdiClose" />
          </DialogClose>
        </header>

        <span role="status" class="sr-only">{{ failed ? $t('share.failed') : image ? $t('share.ready') : $t('share.rendering') }}</span>
        <div class="relative flex min-h-[min(15rem,35dvh)] items-center justify-center overflow-hidden rounded-xl border border-line bg-background">
          <img v-if="preview" :src="preview" :alt="alt" class="block max-h-[40dvh] w-full object-contain" :class="{ 'opacity-40': !image }">
          <span v-if="!image" class="absolute text-small text-medium" aria-hidden="true">{{ failed ? $t('share.failed') : $t('share.rendering') }}</span>
          <button v-if="failed" type="button" class="btn btn-tonal absolute bottom-3 text-primary" @click="render">{{ $t('share.retry') }}</button>
        </div>
        <p v-if="touch" class="-mt-2 text-small text-medium">{{ $t('share.longPress') }}</p>

        <label v-if="positioned" class="flex cursor-pointer items-center gap-3">
          <span class="flex min-w-0 grow flex-col">
            <span>{{ $t(route ? 'share.withRoute' : 'share.withPosition') }}</span>
            <span class="text-small text-medium">{{ $t(route ? (withPosition ? 'share.routeShown' : 'share.routeHidden') : (withPosition ? 'share.positionShown' : 'share.positionHidden')) }}</span>
          </span>
          <SwitchRoot v-model="withPosition" class="switch shrink-0">
            <SwitchThumb class="switch-thumb" />
          </SwitchRoot>
        </label>

        <div class="sticky -bottom-4 -mx-4 -mb-4 flex gap-3 bg-surface px-4 pt-2 pb-4">
          <button type="button" class="btn btn-filled h-11 grow gap-2" :disabled="!canShare || !image" @click="share">
            <AppIcon :icon="mdiShareVariant" size="20" />
            {{ $t('share.share') }}
          </button>
          <button type="button" class="btn btn-tonal h-11 grow gap-2 text-primary" :disabled="!image" @click="download">
            <AppIcon :icon="mdiDownload" size="20" />
            {{ $t('share.download') }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
