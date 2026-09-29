<script setup lang="ts">
import { mdiGithub, mdiTranslate } from '@mdi/js'

const { version } = useRuntimeConfig().public
const { locale, locales, localeProperties, setLocale } = useI18n()
</script>

<template>
  <footer class="footer text-small text-medium-emphasis">
    <span>MeshCore Vitals v{{ version }}</span>
    <span aria-hidden="true">·</span>
    <a :href="REPOSITORY_URL" target="_blank" rel="noopener">
      <AppIcon :icon="mdiGithub" size="14" />
      {{ $t('footer.source') }}
    </a>
    <span aria-hidden="true">·</span>
    <DropdownMenuRoot>
      <DropdownMenuTrigger class="language" :aria-label="$t('footer.language', { name: localeProperties.name })">
        <AppIcon :icon="mdiTranslate" size="14" />
        {{ locale.toUpperCase() }}
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent side="top" align="end" :side-offset="4" class="glass-dense languages">
          <DropdownMenuRadioGroup :model-value="locale" @update:model-value="setLocale($event as typeof locale)">
            <DropdownMenuRadioItem v-for="option in locales" :key="option.code" :value="option.code" :lang="option.language" class="language-option">
              {{ option.name }}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
    <i18n-t keypath="footer.elevation" tag="span" class="credit" scope="global">
      <template #dem><a href="https://doi.org/10.5270/ESA-c5d3d65" target="_blank" rel="noopener">Copernicus DEM GLO-90</a></template>
      <template #api><a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></template>
    </i18n-t>
  </footer>
</template>

<style scoped lang="scss">
.footer {
  margin-top: auto;
  padding: 6px 16px max(6px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--glass-border);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 8px;
  white-space: nowrap;

  a,
  .language {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 28px;
    color: inherit;
    text-decoration: none;

    &:hover {
      color: rgb(var(--theme-primary));
    }
  }

  .credit {
    flex-basis: 100%;
    text-align: center;
  }

  .language {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    cursor: pointer;
  }
}

.languages {
  z-index: 30;
  min-width: 140px;
  padding: 4px 0;
  border-radius: 4px;
}

.language-option {
  padding: 8px 16px;
  cursor: pointer;
  outline: none;

  &[data-highlighted] {
    background: rgba(var(--theme-on-surface), 0.08);
  }

  &[data-state='checked'] {
    color: rgb(var(--theme-primary));
    background: rgba(var(--theme-primary), 0.12);
  }
}
</style>
