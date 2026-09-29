<script setup lang="ts">
import { mdiMenu } from '@mdi/js'
import { useMediaQuery } from '@vueuse/core'

const { connection } = useMeshCore()
const smAndDown = useMediaQuery(SM_AND_DOWN_QUERY)
const route = useRoute()
const menuOpen = ref(false)
</script>

<template>
  <div>
    <template v-if="connection">
      <header class="glass app-bar">
        <div class="page-width app-bar-content d-flex align-center ga-3">
          <button v-if="!smAndDown" type="button" class="btn btn-icon menu-button" :aria-label="$t('nav.openMenu')" @click="menuOpen = true">
            <AppIcon :icon="mdiMenu" />
          </button>
          <img class="d-block" src="/favicon.svg" alt="" width="28" height="28">
          <span class="text-title">MeshCore Vitals</span>
        </div>
      </header>
      <nav v-if="smAndDown" class="glass bottom-nav">
        <NuxtLink v-for="item in NAV_ITEMS" :key="item.to" :to="item.to" class="nav-item">
          <AppIcon :icon="item.icon" size="20" />
          <span>{{ $t(item.title) }}</span>
        </NuxtLink>
      </nav>
      <DialogRoot v-else v-model:open="menuOpen">
        <DialogPortal>
          <DialogOverlay class="overlay" />
          <DialogContent class="glass drawer" :aria-describedby="undefined">
            <DialogTitle class="d-sr-only">MeshCore Vitals</DialogTitle>
            <nav class="d-flex flex-column ga-1">
              <NuxtLink v-for="item in NAV_ITEMS" :key="item.to" :to="item.to" class="drawer-item" @click="menuOpen = false">
                <AppIcon :icon="item.icon" />
                <span>{{ $t(item.title) }}</span>
              </NuxtLink>
            </nav>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </template>
    <div class="backdrop" aria-hidden="true" />
    <main class="content" :class="{ 'below-bar': connection, 'above-nav': connection && smAndDown }">
      <ConnectScreen v-if="!connection" />
      <!-- Every page needs a node, they only show once one is connected. -->
      <slot v-if="connection" />
      <AppFooter v-if="!connection || route.path === '/companion'" />
    </main>
    <UpdateBanner />
    <QuotaToast />
  </div>
</template>

<style scoped lang="scss">
@use '~/assets/scss/variables' as *;

.backdrop {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle 260px at calc(100% - 90px) 120px, var(--backdrop-halo), transparent),
    radial-gradient(circle 220px at 60px calc(100% - 124px), var(--backdrop-halo), transparent);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, var(--backdrop-dot) 1px, transparent 1.5px) 0 0 / 18px 18px;
    mask-image: radial-gradient(ellipse at center, black, transparent 85%);
  }
}

.content {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;

  &.below-bar {
    padding-top: $app-bar-height;
  }

  // Room for the floating menu, clear of the home indicator.
  &.above-nav {
    padding-bottom: calc(68px + env(safe-area-inset-bottom));
  }
}

// A bar along the top edge, only its bottom border shows.
.app-bar {
  position: fixed;
  inset: 0 0 auto;
  z-index: 10;
  height: $app-bar-height;
  display: flex;
  border-width: 0 0 1px;
}

// Same width and gutter as the cards below.
.app-bar-content {
  padding-inline: 16px;
}

.menu-button {
  margin-inline-start: -10px;
}

// Floats above the page, clear of the screen edges and the home indicator.
.bottom-nav {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  z-index: 10;
  height: 56px;
  display: flex;
  gap: 4px;
  padding: 6px;
  border-radius: 999px;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: inherit;
  font-size: 11px;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    background: rgba(var(--theme-on-surface), 0.06);
  }
}

.drawer {
  position: fixed;
  top: $app-bar-height;
  bottom: 0;
  left: 0;
  z-index: 30;
  width: 260px;
  padding: 8px;
  border-width: 0 1px 0 0;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 32px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  color: inherit;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    background: rgba(var(--theme-on-surface), 0.06);
  }
}

.nav-item,
.drawer-item {
  &.router-link-exact-active {
    background: rgba(var(--theme-primary), 0.14);
    color: rgb(var(--theme-primary));
  }
}
</style>
