/*
 * Texts of the error page for when vue-i18n is not there. When a plugin that runs before i18n fails at startup (payload,
 * head, router), Nuxt still mounts error.vue, but `useI18n()` would throw (vue-i18n error 27, NOT_INSTALLED) and the
 * visitor would get a blank page instead of a way back. Only the keys error.vue reads, in the engine's four languages;
 * `errorPageFallback.test.ts` keeps them equal to layers/engine/locales/*.json.
 */
export const ERROR_PAGE_KEYS = [
  'error.title404',
  'error.title403',
  'error.title500',
  'error.titleGeneric',
  'error.notFound',
  'error.forbidden',
  'error.serverError',
  'error.generic',
  'error.homeButton',
  'error.menuButton',
  'common.retry',
] as const

export type ErrorPageKey = (typeof ERROR_PAGE_KEYS)[number]
export type ErrorPageLocale = 'fr' | 'en' | 'nl' | 'zh'

export const ERROR_PAGE_FALLBACK: Record<ErrorPageLocale, Record<ErrorPageKey, string>> = {
  fr: {
    'error.title404': "Rien dans l'assiette",
    'error.title403': 'Accès refusé',
    'error.title500': 'Souci en cuisine',
    'error.titleGeneric': 'Faux mouvement',
    'error.notFound': 'Oups ! Cette page semble avoir disparu…',
    'error.forbidden': "Accès refusé. Vous n'avez pas l'autorisation de voir cette page.",
    'error.serverError': 'Une erreur est survenue. Veuillez réessayer plus tard.',
    'error.generic': "Quelque chose s'est mal passé. Veuillez réessayer.",
    'error.homeButton': "Retour à l'accueil",
    'error.menuButton': 'Voir le menu',
    'common.retry': 'Réessayer',
  },
  en: {
    'error.title404': 'Nothing on the plate',
    'error.title403': 'Off limits',
    'error.title500': 'Kitchen trouble',
    'error.titleGeneric': 'Chopstick slip',
    'error.notFound': 'Oops! This page seems to have disappeared…',
    'error.forbidden': "Access denied. You don't have permission to view this page.",
    'error.serverError': 'Something went wrong on our side. Please try again later.',
    'error.generic': 'Something went wrong. Please try again.',
    'error.homeButton': 'Back to home',
    'error.menuButton': 'View menu',
    'common.retry': 'Try again',
  },
  nl: {
    'error.title404': 'Niets op het bord',
    'error.title403': 'Toegang geweigerd',
    'error.title500': 'Probleem in de keuken',
    'error.titleGeneric': 'Oeps, foutje',
    'error.notFound': 'Oeps! Deze pagina lijkt verdwenen…',
    'error.forbidden': 'Toegang geweigerd. U hebt geen toestemming om deze pagina te bekijken.',
    'error.serverError': 'Er is een fout opgetreden. Probeer het later opnieuw.',
    'error.generic': 'Er is iets misgegaan. Probeer het opnieuw.',
    'error.homeButton': 'Terug naar de startpagina',
    'error.menuButton': 'Bekijk het menu',
    'common.retry': 'Opnieuw proberen',
  },
  zh: {
    'error.title404': '盘中无物',
    'error.title403': '此处禁入',
    'error.title500': '厨房小状况',
    'error.titleGeneric': '筷子打滑了',
    'error.notFound': '哎呀！这个页面好像不见了…',
    'error.forbidden': '禁止访问。您没有权限查看此页面。',
    'error.serverError': '服务器错误。请稍后再试。',
    'error.generic': '出了点问题，请重试。',
    'error.homeButton': '返回首页',
    'error.menuButton': '查看菜单',
    'common.retry': '重试',
  },
}

const HTML_LANG: Record<ErrorPageLocale, string> = {
  fr: 'fr-BE',
  en: 'en',
  nl: 'nl-BE',
  zh: 'zh-CN',
}

/** The language of the URL's prefix (`/nl/menu` -> nl), French (the default locale) otherwise. */
export function fallbackLocale(path: string): ErrorPageLocale {
  const prefix = path.split('/')[1]
  return prefix && prefix in ERROR_PAGE_FALLBACK ? (prefix as ErrorPageLocale) : 'fr'
}

export function fallbackHtmlLang(locale: ErrorPageLocale): string {
  return HTML_LANG[locale]
}

/** A `t()` stand-in over the fallback texts: an unknown key falls back to the default given, then to the key. */
export function fallbackTranslate(locale: ErrorPageLocale) {
  const messages: Record<string, string> = ERROR_PAGE_FALLBACK[locale]
  return (key: string, fallback?: string): string => messages[key] ?? fallback ?? key
}

/** A `localePath()` stand-in: the same prefixed path the i18n `prefix` strategy builds. */
export function fallbackLocalePath(locale: ErrorPageLocale) {
  return (path: string): string => `/${locale}${path === '/' ? '' : path}`
}
