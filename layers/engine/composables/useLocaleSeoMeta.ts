import { useI18n } from '#imports'

const OG_LOCALE_MAP: Record<string, string> = {
    fr: 'fr_BE',
    en: 'en_US',
    zh: 'zh_CN',
    nl: 'nl_BE',
}

export function useLocaleSeoMeta() {
    const { locale } = useI18n()
    const current = OG_LOCALE_MAP[locale.value] ?? OG_LOCALE_MAP.fr
    const ogLocaleAlternate = Object.entries(OG_LOCALE_MAP)
        .filter(([code]) => code !== locale.value)
        .map(([, og]) => og)
    return { ogLocale: current, ogLocaleAlternate }
}
