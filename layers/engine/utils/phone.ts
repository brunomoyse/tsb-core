/**
 * `tel:` href for a display phone number such as `+32 4 222 98 88`
 * (whitespace stripped, as `brand.phone` is stored in international format).
 */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s/gu, '')}`
}

/** National display form of a Belgian international number: `+32 4 286 68 20` -> `04 286 68 20`. */
export function nationalPhone(phone: string): string {
  return phone.replace(/^\+32\s?/u, '0')
}
