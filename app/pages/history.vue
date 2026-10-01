<script setup lang="ts">
import { mdiChevronRight } from '@mdi/js'
import { useMediaQuery } from '@vueuse/core'

const { sessions } = useHistory()
const { duration, time, day: dayOf } = useFormat()
const smAndDown = useMediaQuery(SM_AND_DOWN_QUERY)

const days = computed(() => {
  const groups: { day: string, items: { session: Session, level: CoverageLevel | null, direct: number }[] }[] = []
  for (const session of sessions.value) {
    const day = dayOf(session.startedAt)
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] })
    groups.at(-1)!.items.push({ session, level: mainLevel(session.scans), direct: session.repeaters.filter(repeater => !repeater.hops).length })
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

function onCloseAutoFocus(event: Event) {
  if (sessions.value.some(session => session.startedAt === openedAt.value)) return
  event.preventDefault()
  heading.value?.focus()
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-page flex-col gap-3 px-4 py-3.5">
    <section class="glass card flex flex-col gap-0.5 px-4 py-3.5">
      <div class="flex items-center gap-2">
        <h1 ref="heading" class="text-title outline-none" tabindex="-1">{{ $t('history.title', { count: HISTORY_MAX_SESSIONS }) }}</h1>
        <span class="chip chip-small text-warning">{{ $t('history.beta') }}</span>
      </div>
      <p class="text-small text-medium">{{ $t('history.hint') }}</p>
      <p class="text-small text-warning">{{ $t('history.betaHint') }}</p>
    </section>

    <section v-if="!sessions.length" class="glass card p-4 text-hint text-medium">
      {{ $t('history.empty') }}
    </section>

    <template v-for="group in days" :key="group.day">
      <h2 class="px-1 pt-1 text-small font-medium tracking-wide text-medium uppercase">{{ group.day }}</h2>
      <section class="glass card flex flex-col divide-y divide-glass-border">
        <button
          v-for="{ session, level, direct } in group.items"
          :key="session.startedAt"
          type="button"
          class="list-button flex items-center gap-3 px-4 py-3"
          @click="selectedAt = openedAt = session.startedAt"
        >
          <span class="flex min-w-0 grow flex-col gap-1.5">
            <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span class="font-medium">{{ time(session.startedAt) }} · {{ duration(Math.round((session.endedAt - session.startedAt) / 1000)) }}</span>
              <span v-if="level" class="chip chip-small" :class="`text-${COVERAGE_TONES[level]}`">{{ $t(`coverage.level.${level}`) }}</span>
            </span>
            <span class="text-small text-medium">{{ $t('repeaters.counts', { direct, relayed: $t('repeaters.relayed', session.repeaters.length - direct) }) }}</span>
            <CoverageTimeline v-if="session.scans.length" :session="session" />
          </span>
          <AppIcon class="shrink-0 text-medium" :icon="mdiChevronRight" />
        </button>
      </section>
    </template>

    <DialogRoot v-model:open="detailOpen">
      <DialogPortal>
        <DialogOverlay class="overlay" />
        <DialogContent
          class="glass-dense fixed z-(--z-overlay) overflow-y-auto data-[state=closed]:animate-slide-out data-[state=open]:animate-slide-in"
          :class="smAndDown
            ? 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl border-x-0 border-b-0 [--slide-from:translateY(100%)]'
            : 'top-app-bar right-0 bottom-0 w-100 border-y-0 border-r-0 [--slide-from:translateX(100%)]'"
          :aria-describedby="undefined"
          @close-auto-focus="onCloseAutoFocus"
        >
          <SessionDetail
            v-if="selected"
            :session="selected"
          />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
