<script setup lang="ts">
const { t } = useI18n()
const { currentRoute } = useRouter()
const routeBaseName = useRouteBaseName()

const theme = Object.entries(THEME_COLORS)
  .map(([name, hex]) => `--theme-${name}: ${[1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)).join(', ')}`)
  .join('; ')
const SEO = {
  index: { title: 'seo.index.title', description: 'seo.index.description' },
  companion: { title: 'seo.companion.title', description: 'seo.companion.description' },
  history: { title: 'seo.history.title', description: 'seo.history.description' },
  legal: { title: 'seo.legal.title', description: 'seo.legal.description' }
}
const page = () => String(routeBaseName(currentRoute.value) ?? 'index')
const seo = () => SEO[page() as keyof typeof SEO] ?? SEO.index
const title = () => t(seo().title)
const description = () => t(seo().description)

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
          'operatingSystem': 'Windows, macOS, ChromeOS, Android, iOS',
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
  // Without a Companion, these pages show the same connect screen as the home,
  // and the legal notice has nothing to rank for.
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
