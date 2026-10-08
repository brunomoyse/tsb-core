/*
 * Integer-cents money helpers, shared by the cart, checkout and every price display.
 *
 * Rule (workspace CLAUDE.md, audit M13): money is an integer number of cents everywhere inside
 * the app. Decimal strings ("24.15", what the GraphQL API sends and expects) are parsed ONCE with
 * `toCents` when they enter the app and written back with `centsToDecimalString` when they leave;
 * formatted strings ("24,15 €") only exist at display time (`formatCents`, lib/price.ts).
 *
 * `roundCentsToNearest10` mirrors `tsb-service/pkg/money/rounding.go`. The backend is the source
 * of truth; the cart uses it to preview the same total the customer will be charged (see backend
 * Go tests for the spec).
 */

export type MoneyLike = string | number | null | undefined

/** "12.5" / 12.5 → 1250. Missing or non-numeric values count as 0. */
export function toCents(value: MoneyLike): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/**
 * Cents → the decimal string the API takes ("24.15"). Pure integer arithmetic, no float round
 * trip, so it is exact for any amount.
 */
export function centsToDecimalString(cents: number): string {
  const whole = Math.round(cents)
  const sign = whole < 0 ? '-' : ''
  const abs = Math.abs(whole)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/**
 * Cents → a euro number. ONLY for display-edge consumers that want a number (an i18n
 * `{amount}` placeholder, an analytics payload field): never feed the result back into maths.
 */
export const centsToEuros = (cents: number): number => cents / 100

/**
 * Rounds an amount in cents to the nearest multiple of `stepCents` (the backend's `totalRoundingStep`, 0,10 € = 10).
 * Ties (half a step) always round up, so 0,05 € ties resolve in favour of the restaurant; negative amounts
 * round symmetrically, away from zero on ties.
 */
export function roundCentsToStep(cents: number, stepCents: number): number {
  if (!Number.isFinite(cents)) return cents
  if (!Number.isFinite(stepCents) || stepCents <= 1)
    return Math.round(cents) === 0 ? 0 : Math.round(cents)

  const sign = cents < 0 ? -1 : 1
  const abs = Math.round(Math.abs(cents))
  const rest = abs % stepCents
  const rounded = rest * 2 < stepCents ? abs - rest : abs + (stepCents - rest)

  // Normalise -0 → 0 so callers comparing with === 0 behave intuitively.
  return rounded === 0 ? 0 : sign * rounded
}

/**
 * Rounds an amount in cents to the nearest 0,10 €. Inputs whose last cent digit is 0 stay
 * unchanged, 1-4 round down, 5-9 round up, so 0,05 € ties always resolve in favour of the
 * restaurant (negative amounts round symmetrically, away from zero on ties).
 *
 * Examples:
 *   2442 → 2440   (.x2 down)
 *   2445 → 2450   (.x5 tie → up)
 *   1293 → 1290   (.x3 down)
 *   1295 → 1300   (.x5 tie → up, carries)
 *
 * Idempotent: roundCentsToNearest10(roundCentsToNearest10(x)) === roundCentsToNearest10(x).
 */
export const roundCentsToNearest10 = (cents: number): number => roundCentsToStep(cents, 10)

/**
 * The Intl locale each app locale formats euros with (V11): Belgian conventions for the two
 * Belgian languages, Irish English for euro formatting in English ("€24.15"), simplified Chinese
 * for zh. Always EUR, whatever the locale.
 */
const INTL_LOCALES: Record<string, string> = {
  fr: 'fr-BE',
  nl: 'nl-BE',
  en: 'en-IE',
  zh: 'zh-CN',
}

export const intlLocaleFor = (locale?: string | null): string =>
  INTL_LOCALES[(locale ?? 'fr').toLowerCase().split('-')[0]!] ?? INTL_LOCALES.fr!

const formatters = new Map<string, Intl.NumberFormat>()

/** "24,15 €" (fr), "€ 24,15" (nl), "€24.15" (en, zh). The one place cents become a number for Intl. */
export function formatCentsForLocale(cents: number, locale?: string | null): string {
  const intlLocale = intlLocaleFor(locale)
  let formatter = formatters.get(intlLocale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'EUR' })
    formatters.set(intlLocale, formatter)
  }
  return formatter.format(cents / 100)
}
