<script setup lang="ts">
import { mdiArrowLeft, mdiCellphoneLock, mdiChartBar, mdiMapOutline, mdiScaleBalance, mdiShareVariantOutline } from '@mdi/js'

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

const privacy = computed(() => [
  { icon: mdiChartBar, title: t('legal.privacy.analytics.title'), text: t('legal.privacy.analytics.text') },
  { icon: mdiMapOutline, title: t('legal.privacy.services.title'), text: t('legal.privacy.services.text') },
  { icon: mdiCellphoneLock, title: t('legal.privacy.local.title'), text: t('legal.privacy.local.text') },
  { icon: mdiShareVariantOutline, title: t('legal.privacy.share.title'), text: t('legal.privacy.share.text') }
])

function back() {
  if (history.state?.back) router.back()
  else navigateTo(localePath('/'))
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-page flex-col gap-10 px-gutter pt-6 pb-section">
    <div class="flex flex-col items-start gap-6">
      <button type="button" class="btn -ms-3 px-3 text-primary" @click="back">
        <AppIcon :icon="mdiArrowLeft" size="20" />
        {{ $t('legal.back') }}
      </button>
      <h1 class="text-headline text-balance">{{ $t('legal.title') }}</h1>
      <p class="max-w-[60ch] text-lead text-medium">{{ $t('legal.lead') }}</p>
    </div>

    <section class="flex flex-col gap-5">
      <h2 class="text-title leading-7">{{ $t('legal.privacy.title') }}</h2>
      <ul class="grid gap-3 sm:grid-cols-2">
        <li v-for="item in privacy" :key="item.title" class="panel card flex gap-4 p-5">
          <AppIcon class="text-primary" :icon="item.icon" />
          <span class="flex flex-col gap-1">
            <span class="text-subtitle font-medium">{{ item.title }}</span>
            <span class="text-body leading-[1.55] text-medium">{{ item.text }}</span>
          </span>
        </li>
        <li class="panel card flex gap-4 p-5 sm:col-span-2">
          <AppIcon class="text-primary" :icon="mdiScaleBalance" />
          <span class="flex flex-col gap-1">
            <span class="text-subtitle font-medium">{{ $t('legal.privacy.rights.title') }}</span>
            <i18n-t keypath="legal.privacy.rights.text" tag="span" class="text-body leading-[1.55] text-medium" scope="global">
              <template #github><a :href="`${REPOSITORY_URL}/issues`" target="_blank" rel="noopener" class="text-primary underline">GitHub</a></template>
            </i18n-t>
          </span>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-5">
      <h2 class="text-title leading-7">{{ $t('legal.notice.title') }}</h2>
      <dl class="flex flex-col">
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-8 gap-y-1.5 border-t border-line py-5">
          <dt class="text-subtitle font-medium">{{ $t('legal.notice.publisher.title') }}</dt>
          <dd class="text-body leading-[1.55] text-medium">{{ $t('legal.notice.publisher.text') }}</dd>
        </div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-8 gap-y-1.5 border-t border-line py-5">
          <dt class="text-subtitle font-medium">{{ $t('legal.notice.host.title') }}</dt>
          <dd class="text-body leading-[1.55] text-medium">{{ $t('legal.notice.host.text') }}</dd>
        </div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-8 gap-y-1.5 border-y border-line py-5">
          <dt class="text-subtitle font-medium">{{ $t('legal.notice.contact.title') }}</dt>
          <i18n-t keypath="legal.notice.contact.text" tag="dd" class="text-body leading-[1.55] text-medium" scope="global">
            <template #github><a :href="`${REPOSITORY_URL}/issues`" target="_blank" rel="noopener" class="text-primary underline">GitHub</a></template>
          </i18n-t>
        </div>
      </dl>
    </section>
  </div>
</template>
