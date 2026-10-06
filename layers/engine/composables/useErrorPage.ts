import type { NuxtError } from '#app'
import {
  clearError,
  computed,
  onMounted,
  ref,
  reloadNuxtApp,
  useHead,
  useLocaleHead,
  useLocalePath,
  useNuxtApp,
  useRoute,
} from '#imports'
import { useI18n } from 'vue-i18n'
import {
  fallbackHtmlLang,
  fallbackLocale,
  fallbackLocalePath,
  fallbackTranslate,
} from '#engine/utils/errorPageFallback'
import { reportPageError } from '#engine/utils/reportError'

/**
 * Everything a brand's error.vue needs besides its markup: texts, document language, the locale-prefixed way back,
 * the retry, and the Sentry report of the error being shown.
 *
 * It also works when i18n never got installed: when a plugin that runs before it fails at startup (payload, head,
 * router), Nuxt still mounts error.vue, and `useI18n()` would throw vue-i18n error 27 (NOT_INSTALLED), leaving a
 * blank page and hiding the first error in Sentry (TSB-CORE-C, Safari on iOS, v1.1.0). Then the texts come from
 * utils/errorPageFallback.ts in the URL's language.
 */
export function useErrorPage(error: () => NuxtError | undefined) {
  const nuxtApp = useNuxtApp()
  const hasI18n = Boolean((nuxtApp as { $i18n?: unknown }).$i18n)

  let t: (key: string, fallback?: string) => string
  let localePath: (path: string) => string
  let htmlLang: () => string
  if (hasI18n) {
    const i18n = useI18n()
    t = (key, fallback) => (fallback === undefined ? i18n.t(key) : i18n.t(key, fallback))
    const toLocalePath = useLocalePath()
    localePath = (path) => toLocalePath(path)
    // The error page replaces the layout, which is what sets the document language (WCAG 3.1.1): same ISO code as the layout (zh-CN, fr-BE...).
    const localeHead = useLocaleHead()
    htmlLang = () => localeHead.value.htmlAttrs?.lang ?? 'fr'
  } else {
    const locale = fallbackLocale(useRoute().path)
    t = fallbackTranslate(locale)
    localePath = fallbackLocalePath(locale)
    htmlLang = () => fallbackHtmlLang(locale)
  }
  useHead({ htmlAttrs: { lang: computed(htmlLang) } })

  const statusCode = computed(() => error()?.statusCode || 500)
  const isServerError = computed(() => statusCode.value >= 500)

  const errorTitle = computed(() => {
    switch (error()?.statusCode) {
      case 404:
        return t('error.title404')
      case 403:
        return t('error.title403')
      case 500:
        return t('error.title500')
      default:
        return t('error.titleGeneric')
    }
  })

  const errorMessage = computed(() => {
    switch (error()?.statusCode) {
      case 404:
        return t('error.notFound')
      case 403:
        return t('error.forbidden')
      case 500:
        return t('error.serverError')
      default:
        return t('error.generic')
    }
  })

  // Locale-prefixed targets: "/" and "/menu" would land on the default locale whatever language the visitor is reading.
  const goHome = () => clearError({ redirect: localePath('/') })
  const goMenu = () => clearError({ redirect: localePath('/menu') })

  // Clears the error, then reloads the current URL for real so the page that failed runs its data fetching again.
  const recovering = ref(false)
  const retry = async () => {
    recovering.value = true
    await clearError()
    reloadNuxtApp({
      path: `${window.location.pathname}${window.location.search}`,
      force: true,
      persistState: false,
    })
  }

  // In the browser only (onMounted). A 5xx rendered on the server is also sent by the server SDK, so it can show up
  // once per side; tolerated, it is rare and the browser event carries the device and URL.
  onMounted(() => {
    reportPageError(error())
  })

  return {
    t,
    statusCode,
    isServerError,
    errorTitle,
    errorMessage,
    goHome,
    goMenu,
    recovering,
    retry,
  }
}
