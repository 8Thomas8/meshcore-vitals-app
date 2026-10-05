<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

const { connection } = useMeshCore()
const smAndDown = useMediaQuery(SM_AND_DOWN_QUERY)
const route = useRoute()
const { shown: footerShown } = useFooter()
</script>

<template>
  <div>
    <template v-if="connection">
      <!-- A bar along the top edge, only its bottom border shows. -->
      <header class="glass fixed inset-x-0 top-0 z-(--z-bar) flex h-app-bar border-x-0 border-t-0">
        <!-- Same width and gutter as the cards below. -->
        <div class="mx-auto flex w-full max-w-page items-center gap-3 px-4">
          <img src="/favicon.svg" alt="" width="28" height="28">
          <span class="text-title">MeshCore Vitals</span>
          <nav v-if="!smAndDown" class="ms-auto flex gap-1">
            <NuxtLink
              v-for="item in NAV_ITEMS"
              :key="item.to"
              :to="item.to"
              class="flex h-10 items-center gap-2 rounded-full px-4 text-label font-medium hover:bg-on-surface/6 aria-[current=page]:bg-primary/14 aria-[current=page]:text-primary"
            >
              <AppIcon :icon="item.icon" size="20" />
              <span>{{ $t(item.title) }}</span>
            </NuxtLink>
          </nav>
        </div>
      </header>
      <!-- Floats above the page, clear of the screen edges and the home indicator. -->
      <nav v-if="smAndDown" class="glass fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-(--z-bar) flex h-14 gap-1 rounded-full p-1.5">
        <NuxtLink
          v-for="item in NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          class="flex flex-1 flex-col items-center justify-center rounded-full text-small font-medium hover:bg-on-surface/6 aria-[current=page]:bg-primary/14 aria-[current=page]:text-primary"
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
    <AppToasts />
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
