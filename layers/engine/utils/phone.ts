/**
 * `tel:` href for a display phone number such as `+32 4 222 98 88`
 * (whitespace stripped, as `brand.phone` is stored in international format).
 */
export function telHref(phone: string): string {
    return `tel:${phone.replace(/\s/gu, '')}`
}
