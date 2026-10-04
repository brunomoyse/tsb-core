import { defineI18nConfig } from '#imports'

/*
 * The messages are not here: they are one file per language, merged with the brand's overrides at build time and
 * loaded lazily by the language module (build/i18n-messages.ts, audit PR 6.2, P11).
 */
export default defineI18nConfig(() => ({
  legacy: false,
  // Missing keys fall back to French instead of rendering the raw key path.
  fallbackLocale: 'fr',
}))
