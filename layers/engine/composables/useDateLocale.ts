import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

// The regional flavour each UI language formats dates and numbers in.
const DATE_LOCALES: Record<string, string> = { fr: 'fr-BE', en: 'en-GB', zh: 'zh-CN', nl: 'nl-BE' }

/** The BCP 47 locale to pass to Intl for the current UI language (Belgian French by default). */
export function useDateLocale() {
    const { locale } = useI18n()
    return computed(() => DATE_LOCALES[locale.value] || 'fr-BE')
}
