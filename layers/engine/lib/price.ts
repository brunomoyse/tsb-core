import { type MoneyLike, formatCentsForLocale, toCents } from '#engine/utils/money'
import { tryUseNuxtApp } from '#app'

/*
 * Display edge of the money pipeline: everything inside the app is integer cents
 * (#engine/utils/money), strings like "24,15 €" are produced only here.
 */

/*
 * The active i18n locale when called while rendering / in setup (reactive in templates, so a
 * locale switch re-renders the prices), the default locale outside of any Nuxt context.
 */
const currentLocale = (): string | undefined => {
    try {
        return (tryUseNuxtApp()?.$i18n as { locale?: { value?: string } } | undefined)?.locale?.value
    } catch {
        return undefined
    }
}

/** Formats an amount in INTEGER CENTS ("2415" → "24,15 €" in fr-BE). */
export const formatCents = (cents: number): string => formatCentsForLocale(cents, currentLocale())

/**
 * Formats an amount received from the API as a decimal euro value ("24.15" / 24.15), e.g. a
 * product price, a choice modifier or an order total. It parses to cents first (`toCents`), so
 * it is the API boundary; amounts the app computed itself are already cents → `formatCents`.
 */
export const formatPrice = (price: MoneyLike): string => formatCents(toCents(price))
