import type { BrowserContext } from '@playwright/test'

export const LOCALES = ['fr', 'en', 'nl', 'zh'] as const
export type Locale = (typeof LOCALES)[number]

/** `Accept-Language` of a browser set to each language, as the project config sends `fr-BE` for the default context. */
export const ACCEPT_LANGUAGE: Record<Locale, string> = {
  fr: 'fr-BE,fr;q=0.9',
  en: 'en-US,en;q=0.9',
  nl: 'nl-BE,nl;q=0.9',
  zh: 'zh-CN,zh;q=0.9',
}

/*
 * The apps redirect a first visit to the language of the browser, on every path (`detectBrowserLanguage.redirectOn:
 * 'all'`, cookie `i18n_redirected`): a French browser asking for /nl/menu lands on /fr/menu. A spec about another
 * language therefore tells the context which one the visitor has chosen, as the language picker would have: the cookie
 * (which wins over the browser's language) and the header.
 */
export async function chooseLocale(
  context: BrowserContext,
  baseURL: string,
  locale: Locale,
): Promise<void> {
  await context.addCookies([{ name: 'i18n_redirected', value: locale, url: baseURL }])
  await context.setExtraHTTPHeaders({ 'Accept-Language': ACCEPT_LANGUAGE[locale] })
}
