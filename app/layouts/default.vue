<script setup lang="ts">
import { mdiMenu } from '@mdi/js'
import { useMediaQuery } from '@vueuse/core'

const { connection } = useMeshCore()
const smAndDown = useMediaQuery(SM_AND_DOWN_QUERY)
const route = useRoute()
const menuOpen = ref(false)
const { shown: footerShown } = useFooter()

watch(() => route.path, () => {
  menuOpen.value = false
})
</script>

<template>
  <div>
    <template v-if="connection">
      <!-- A bar along the top edge, only its bottom border shows. -->
      <header class="glass fixed inset-x-0 top-0 z-(--z-bar) flex h-app-bar border-x-0 border-t-0">
        <!-- Same width and gutter as the cards below. -->
        <div class="mx-auto flex w-full max-w-page items-center gap-3 px-4">
          <DialogRoot v-if="!smAndDown" v-model:open="menuOpen">
            <DialogTrigger class="btn btn-icon -ms-2.5" :aria-label="$t('nav.openMenu')">
              <AppIcon :icon="mdiMenu" />
            </DialogTrigger>
            <DialogPortal>
              <DialogOverlay class="overlay" />
              <DialogContent
                class="glass fixed top-app-bar bottom-0 left-0 z-(--z-overlay) w-65 border-y-0 border-l-0 p-2 [--slide-from:translateX(-100%)] data-[state=closed]:animate-slide-out data-[state=open]:animate-slide-in"
                :aria-describedby="undefined"
              >
                <DialogTitle class="sr-only">{{ $t('nav.menu') }}</DialogTitle>
                <nav class="flex flex-col gap-1">
                  <DialogClose v-for="item in NAV_ITEMS" :key="item.to" as-child>
                    <NuxtLink
                      :to="item.to"
                      class="flex min-h-11 items-center gap-8 rounded-lg px-4 text-label font-medium hover:bg-on-surface/6 aria-[current=page]:bg-primary/14 aria-[current=page]:text-primary"
                    >
                      <AppIcon :icon="item.icon" />
                      <span>{{ $t(item.title) }}</span>
                    </NuxtLink>
                  </DialogClose>
                </nav>
              </DialogContent>
            </DialogPortal>
          </DialogRoot>
          <img src="/favicon.svg" alt="" width="28" height="28">
          <span class="text-title">MeshCore Vitals</span>
        </div>
      </header>
      <!-- Floats above the page, clear of the screen edges and the home indicator. -->
      <nav v-if="smAndDown" class="glass fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-(--z-bar) flex h-14 gap-1 rounded-full p-1.5">
        <NuxtLink
          v-for="item in NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          class="flex flex-1 flex-col items-center justify-center rounded-full text-[11px] font-medium hover:bg-on-surface/6 aria-[current=page]:bg-primary/14 aria-[current=page]:text-primary"
        >
          <AppIcon :icon="item.icon" size="20" />
          <span>{{ $t(item.title) }}</span>
        </NuxtLink>
      </nav>
    </template>
    <div class="backdrop" aria-hidden="true" />
    <main
      class="relative flex min-h-dvh flex-col"
      :class="{ 'pt-app-bar': connection, 'pb-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom))]': connection && smAndDown }"
    >
      <ConnectScreen v-if="!connection" />
      <!-- Every page needs a node, they only show once one is connected. -->
      <slot v-if="connection" />
      <AppFooter v-if="!connection || route.path !== '/' || footerShown" />
    </main>
    <UpdateBanner />
    <QuotaToast />
  </div>
</template>

<style scoped lang="scss">
.backdrop {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle 260px at calc(100% - 90px) 120px, var(--color-backdrop-halo), transparent),
    radial-gradient(circle 220px at 60px calc(100% - 124px), var(--color-backdrop-halo), transparent);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, var(--color-backdrop-dot) 1px, transparent 1.5px) 0 0 / 18px 18px;
    mask-image: radial-gradient(ellipse at center, black, transparent 85%);
  }
}
</style>
