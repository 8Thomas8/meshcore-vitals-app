<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

const { connection } = useMeshCore()
const smAndDown = useMediaQuery(SM_AND_DOWN_QUERY)
const route = useRoute()
const localePath = useLocalePath()
const routeBaseName = useRouteBaseName()
const { shown: footerShown } = useFooter()
</script>

<template>
  <div>
    <template v-if="connection">
      <!-- A bar along the top edge, only its bottom border shows. -->
      <header class="panel fixed inset-x-0 top-0 z-(--z-bar) flex h-app-bar border-x-0 border-t-0">
        <!-- Same width and gutter as the cards below. -->
        <div class="mx-auto flex w-full max-w-page items-center gap-3 px-4">
          <img src="/favicon.svg" alt="" width="28" height="28">
          <span class="text-title">MeshCore Vitals</span>
          <nav v-if="!smAndDown" class="ms-auto flex gap-1">
            <NuxtLink
              v-for="item in NAV_ITEMS"
              :key="item.to"
              :to="localePath(item.to)"
              class="flex h-10 items-center gap-2 rounded-lg px-4 text-label font-medium hover:bg-on-surface/6 aria-[current=page]:bg-primary/14 aria-[current=page]:text-primary"
            >
              <AppIcon :icon="item.icon" size="20" />
              <span>{{ $t(item.title) }}</span>
            </NuxtLink>
          </nav>
        </div>
      </header>
      <nav v-if="smAndDown" class="panel fixed inset-x-0 bottom-0 z-(--z-bar) flex h-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom))] border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
        <NuxtLink
          v-for="item in NAV_ITEMS"
          :key="item.to"
          :to="localePath(item.to)"
          class="flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent outline-offset-[-2px] text-small font-medium text-medium hover:bg-on-surface/6 aria-[current=page]:border-primary aria-[current=page]:text-primary"
        >
          <AppIcon :icon="item.icon" size="20" />
          <span>{{ $t(item.title) }}</span>
        </NuxtLink>
      </nav>
    </template>
    <main
      class="relative flex min-h-dvh flex-col"
      :class="{ 'pt-app-bar': connection, 'pb-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom))]': connection && smAndDown }"
    >
      <ConnectScreen v-if="!connection" />
      <!-- Every page needs a node, they only show once one is connected. -->
      <slot v-if="connection" />
      <AppFooter v-if="!connection || routeBaseName(route) !== 'index' || footerShown" />
    </main>
    <UpdateBanner />
    <AppToasts />
  </div>
</template>

