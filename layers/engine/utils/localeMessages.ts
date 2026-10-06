/*
 * The messages of one language of one brand, as the browser gets them (audit PR 6.2, P11): the engine's base messages
 * with the brand's overrides merged in, and the brand's name and phone number written into the `__BRAND__` and
 * `__PHONE__` placeholders. Base strings stay brand-neutral while every brand renders its own.
 *
 * This used to run in the browser (and on every server render) for all four languages at once, from four static
 * imports. It now runs once per language at build time (build/i18n-messages.ts writes the result, one file per
 * language, which the language module loads lazily: only the visitor's language is fetched).
 *
 * Pure (no Nuxt imports) so it is unit-tested with node: layers/engine/utils/localeMessages.test.mjs.
 */

export type Messages = Record<string, unknown>

const isPlainObject = (value: unknown): value is Messages =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Deep-merge brand overrides onto the base messages (the brand wins on leaf keys). */
export function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const current = out[key]
    out[key] = isPlainObject(value) && isPlainObject(current) ? deepMerge(current, value) : value
  }
  return out
}

/** Replace the `__BRAND__` and `__PHONE__` tokens in every string of the tree. */
export function applyBrand(node: Messages, brandName: string, phone: string): Messages
export function applyBrand(node: unknown, brandName: string, phone: string): unknown
export function applyBrand(node: unknown, brandName: string, phone: string): unknown {
  if (typeof node === 'string')
    return node.replaceAll('__BRAND__', brandName).replaceAll('__PHONE__', phone)
  if (Array.isArray(node)) return node.map((child) => applyBrand(child, brandName, phone))
  if (isPlainObject(node)) {
    const out: Messages = {}
    for (const [key, value] of Object.entries(node)) out[key] = applyBrand(value, brandName, phone)
    return out
  }
  return node
}

/** The finished messages of one language: base + brand overrides, tokens replaced (`brandName` is the brand's own, per language). */
export function buildLocaleMessages(base: Messages, brand: Messages, phone: string): Messages {
  const merged = deepMerge(base, brand)
  const brandName = typeof merged.brandName === 'string' ? merged.brandName : ''
  return applyBrand(merged, brandName, phone)
}
