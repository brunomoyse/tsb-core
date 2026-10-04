import { defineI18nConfig } from '#imports'

/*
 * The messages are not here: they are one file per language, merged with the brand's overrides at build time and
 * loaded lazily by the language module (build/i18n-messages.ts, audit PR 6.2, P11).
 */

/**
 * French counts 0 as singular ("0 article"), where vue-i18n's default for a two-form message ("article | articles")
 * picks the plural for 0. Three-form messages ("aucun | 1 | {count}") keep the default zero / one / many split.
 */
const frenchPlural = (choice: number, choicesLength: number): number => {
  const n = Math.abs(choice)
  if (choicesLength === 2) return n >= 2 ? 1 : 0
  return Math.min(n, 2)
}

export default defineI18nConfig(() => ({
  legacy: false,
  // Missing keys fall back to French instead of rendering the raw key path.
  fallbackLocale: 'fr',
  pluralRules: { fr: frenchPlural },
}))
