<script setup lang="ts">
import { mdiGithub, mdiTranslate } from '@mdi/js'

const { version } = useRuntimeConfig().public
const { locale, locales, localeProperties, setLocale } = useI18n()
</script>

<template>
  <footer class="mt-auto flex flex-wrap items-center justify-center gap-x-2 border-t border-glass-border px-4 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] text-small whitespace-nowrap text-medium">
    <span>MeshCore Vitals v{{ version }}</span>
    <span aria-hidden="true">·</span>
    <a :href="REPOSITORY_URL" target="_blank" rel="noopener" class="link">
      <AppIcon :icon="mdiGithub" size="14" />
      {{ $t('footer.source') }}
    </a>
    <span aria-hidden="true">·</span>
    <DropdownMenuRoot>
      <DropdownMenuTrigger class="link" :aria-label="$t('footer.language', { name: localeProperties.name })">
        <AppIcon :icon="mdiTranslate" size="14" />
        {{ locale.toUpperCase() }}
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent side="top" align="end" :side-offset="4" class="glass-dense z-(--z-overlay) min-w-35 rounded-sm py-1">
          <DropdownMenuRadioGroup :model-value="locale" @update:model-value="setLocale($event as typeof locale)">
            <DropdownMenuRadioItem
              v-for="option in locales"
              :key="option.code"
              :value="option.code"
              :lang="option.language"
              class="cursor-pointer px-4 py-2 outline-none data-highlighted:not-data-[state=checked]:bg-on-surface/8 data-[state=checked]:bg-primary/12 data-[state=checked]:text-primary"
            >
              {{ option.name }}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
    <i18n-t keypath="footer.elevation" tag="span" class="basis-full text-center" scope="global">
      <template #dem><a href="https://doi.org/10.5270/ESA-c5d3d65" target="_blank" rel="noopener" class="link">Copernicus DEM GLO-90</a></template>
      <template #api><a href="https://open-meteo.com/" target="_blank" rel="noopener" class="link">Open-Meteo</a></template>
    </i18n-t>
  </footer>
</template>

<style scoped lang="scss">
.link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;

  &:hover {
    color: var(--color-primary);
  }
}
</style>
