// Each page is prerendered in every language, the English one without prefix.
// An English page switches to the remembered or browser language, once
// hydration is over, async pages included. A prefixed page keeps its language.
export default defineNuxtPlugin((nuxtApp) => {
  const cookie = useCookie<string | null>(LOCALE_COOKIE)
  const switchLocalePath = useSwitchLocalePath()
  const i18n = nuxtApp.$i18n
  const available: string[] = i18n.localeCodes.value
  const browser = navigator.languages.map(tag => tag.split('-')[0]!).find(code => available.includes(code))
  const wanted = (cookie.value && available.includes(cookie.value) ? cookie.value : browser) as typeof i18n.locale.value | undefined
  const loading = wanted && i18n.locale.value === i18n.defaultLocale && wanted !== i18n.locale.value && i18n.loadLocaleMessages(wanted)

  nuxtApp.hooks.hookOnce('app:suspense:resolve', async () => {
    if (loading) {
      await loading
      await navigateTo(switchLocalePath(wanted!), { replace: true })
    }
  })
})
