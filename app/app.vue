<script setup lang="ts">
const { locale } = useI18n()
const routeBaseName = useRouteBaseName()

const theme = Object.entries(THEME_COLORS)
  .map(([name, hex]) => `--theme-${name}: ${[1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)).join(', ')}`)
  .join('; ')

useHead({ htmlAttrs: { lang: locale, style: theme } })
</script>

<template>
  <NuxtPwaManifest />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage :page-key="route => String(routeBaseName(route))" />
  </NuxtLayout>
</template>
