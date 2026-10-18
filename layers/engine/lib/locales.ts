/*
 * The languages the shop serves, for the i18n module (nuxt.config.ts) and for code that must not depend on it at
 * runtime: `$i18n` only exists once the i18n plugin has set up, and when a startup plugin fails the auth middleware
 * still runs on the error page (TSB-CORE-R).
 */
export const LOCALES = [
  { code: 'fr', language: 'fr-BE' },
  { code: 'en', language: 'en' },
  { code: 'zh', language: 'zh-CN' },
  { code: 'nl', language: 'nl-BE' },
] as const

export const LOCALE_CODES: readonly string[] = LOCALES.map((l) => l.code)
