<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const routeBaseName = useRouteBaseName()

const theme = Object.entries(THEME_COLORS)
  .map(([name, hex]) => `--theme-${name}: ${[1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)).join(', ')}`)
  .join('; ')
const page = () => String(routeBaseName(route) ?? 'index')
const title = () => t(`seo.${page()}.title`)
const description = () => t(`seo.${page()}.description`)

useHead({ htmlAttrs: { style: theme } })
const localeHead = useLocaleHead()
// en and fr already cover en-US and fr-FR.
useHead(() => ({ ...localeHead.value, link: localeHead.value.link.filter(link => !('hreflang' in link) || !/^[a-z]+-[A-Z]+$/.test(link.hreflang)) }))
useHead(() => ({
  script: page() === 'index'
    ? [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          'name': 'MeshCore Vitals',
          'url': localeHead.value.link.find(link => link.rel === 'canonical')?.href,
          'description': description(),
          'applicationCategory': 'UtilitiesApplication',
          'operatingSystem': 'Windows, macOS, ChromeOS, Android',
          'isAccessibleForFree': true,
          'offers': { '@type': 'Offer', 'price': 0, 'priceCurrency': 'EUR' }
        })
      }]
    : []
}))

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogImageAlt: () => t('seo.imageAlt'),
  twitterImageAlt: () => t('seo.imageAlt'),
  // Without a Companion, these pages show the same connect screen as the home.
  robots: () => page() === 'index' ? undefined : 'noindex, follow'
})
</script>

<template>
  <NuxtPwaManifest />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage :page-key="route => String(routeBaseName(route))" />
  </NuxtLayout>
</template>
