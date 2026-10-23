<script setup lang="ts">
import { mdiCallMerge, mdiChevronRight, mdiInformationOutline } from '@mdi/js'

const { sessions, merge } = useHistory()
const { duration, time, day: dayOf, coverageLabel } = useFormat()
const { t } = useI18n()

const days = computed(() => {
  const groups: { day: string, items: { session: Session, level: CoverageLevel | null, direct: number, next: Session | null }[] }[] = []
  let next: Session | undefined
  for (const session of sessions.value) {
    const day = dayOf(session.startedAt)
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] })
    groups.at(-1)!.items.push({ session, level: mainLevel(session.scans), direct: session.repeaters.filter(repeater => !repeater.hops).length, next: next && canMerge(session, next) ? next : null })
    next = session
  }
  return groups
})

const selectedAt = ref<number | null>(null)
const openedAt = ref<number | null>(null)
const heading = ref<HTMLElement | null>(null)
const selected = computed(() => sessions.value.find(session => session.startedAt === selectedAt.value) ?? null)
const detailOpen = computed({
  get: () => selected.value !== null,
  set: (open) => {
    if (!open) selectedAt.value = null
  }
})

onBeforeRouteLeave(() => {
  if (!detailOpen.value) return
  detailOpen.value = false
  return false
})

const pair = shallowRef<[Session, Session] | null>(null)
const mergeOpen = ref(false)
const announcement = ref('')

function askMerge(session: Session, next: Session) {
  pair.value = [session, next]
  announcement.value = ''
  mergeOpen.value = true
}

function confirmMerge() {
  merge(...pair.value!).catch(() => {})
  announcement.value = t('history.merged')
}

function onMergeCloseAutoFocus(event: Event) {
  if (!announcement.value) return
  event.preventDefault()
  heading.value?.focus()
}

function onCloseAutoFocus(event: Event) {
  if (sessions.value.some(session => session.startedAt === openedAt.value)) return
  event.preventDefault()
  heading.value?.focus()
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-page flex-col gap-3 px-gutter py-3.5">
    <section class="panel card flex flex-col gap-2.5 px-4 py-3.5">
      <div class="flex min-h-11 items-center gap-2">
        <h1 ref="heading" class="line-clamp-2 text-title leading-7 wrap-anywhere outline-none" tabindex="-1">{{ $t('history.title', { count: HISTORY_MAX_SESSIONS }) }}</h1>
        <PopoverRoot>
          <PopoverTrigger class="chip chip-small text-warning">
            {{ $t('history.beta') }}
            <AppIcon :icon="mdiInformationOutline" size="16" />
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent side="bottom" :side-offset="4" :collision-padding="8" class="float popover">
              <p class="py-1">{{ $t('history.betaHint') }}</p>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </div>
      <div class="status-row">
        <PopoverRoot>
          <PopoverTrigger class="status-trigger">
            <span class="truncate">{{ $t('history.stored') }}</span>
            <AppIcon class="shrink-0" :icon="mdiInformationOutline" size="20" />
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent side="bottom" :side-offset="4" :collision-padding="8" class="float popover">
              <p class="py-1">{{ $t('history.hint') }}</p>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </div>
    </section>

    <section v-if="!sessions.length" class="panel card p-4 text-hint text-medium">
      {{ $t('history.empty') }}
    </section>

    <template v-for="group in days" :key="group.day">
      <h2 class="px-1 pt-1 text-small font-medium tracking-wide text-medium uppercase">{{ group.day }}</h2>
      <section class="panel card flex flex-col divide-y divide-line">
        <template v-for="{ session, level, direct, next } in group.items" :key="session.startedAt">
          <div v-if="next" class="flex items-center gap-3 px-4 py-2 text-small text-medium">
            <AppIcon :icon="mdiCallMerge" size="18" />
            <span class="grow">{{ $t('history.gap', { duration: duration(Math.round((next.startedAt - session.endedAt) / 1000)) }) }}</span>
            <button type="button" class="btn btn-tonal text-primary" @click="askMerge(session, next)">{{ $t('history.merge') }}</button>
          </div>
          <button
            type="button"
            class="list-button flex items-center gap-3 px-4 py-3"
            @click="selectedAt = openedAt = session.startedAt"
          >
            <span class="flex min-w-0 grow flex-col gap-1.5">
              <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span class="separated">
                  <span class="font-medium">{{ time(session.startedAt) }}</span>
                  <span class="text-medium">{{ duration(Math.round((session.endedAt - session.startedAt) / 1000)) }}</span>
                </span>
                <span v-if="level" class="chip chip-small" :class="`text-${COVERAGE_TONES[level]}`">{{ coverageLabel(level) }}</span>
              </span>
              <span class="text-small text-medium">{{ $t(session.repeaters.length > direct ? 'repeaters.counts' : 'repeaters.directOnly', { direct, relayed: $t('repeaters.relayed', session.repeaters.length - direct) }) }}</span>
              <CoverageTimeline v-if="session.scans.length" :session="session" aria-hidden="true" />
            </span>
            <AppIcon class="shrink-0 text-medium" :icon="mdiChevronRight" />
          </button>
        </template>
      </section>
    </template>

    <AlertDialogRoot v-model:open="mergeOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="overlay" />
        <AlertDialogContent v-if="pair" class="float dialog flex flex-col gap-4 p-4" @close-auto-focus="onMergeCloseAutoFocus">
          <AlertDialogTitle class="text-title">{{ $t('history.mergeTitle') }}</AlertDialogTitle>
          <AlertDialogDescription class="text-medium">{{ $t('history.mergeText', { first: time(pair[0].startedAt), second: time(pair[1].startedAt) }) }}</AlertDialogDescription>
          <div class="flex justify-end gap-2">
            <AlertDialogCancel class="btn text-primary">{{ $t('common.cancel') }}</AlertDialogCancel>
            <AlertDialogAction class="btn btn-filled" @click="confirmMerge">{{ $t('history.merge') }}</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <DialogRoot v-model:open="detailOpen">
      <DialogPortal>
        <DialogOverlay class="overlay" />
        <DialogContent class="float sheet" :aria-describedby="undefined" @close-auto-focus="onCloseAutoFocus">
          <SessionDetail
            v-if="selected"
            :session="selected"
          />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
