/*
 * Small pure rules of the account page: what the avatar and the name show, which orders count as "in progress" for the
 * deletion warning, and how a stored E.164 number is split for the edit form.
 */

export interface NamedUser {
    firstName?: string | null
    lastName?: string | null
}

export const profileInitials = (user: NamedUser | null | undefined): string => {
    const first = user?.firstName?.[0] || ''
    const last = user?.lastName?.[0] || ''
    return (first + last).toUpperCase() || '?'
}

export const profileFullName = (user: NamedUser | null | undefined): string => {
    const first = user?.firstName || ''
    const last = user?.lastName || ''
    return `${first} ${last}`.trim() || '–'
}

/** Statuses of an order that is still being handled: deleting the account then loses its tracking (a soft warning, never a block). */
export const ACTIVE_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'AWAITING_PICK_UP', 'OUT_FOR_DELIVERY']

export const hasActiveOrder = (orders: readonly { status: string }[] | null | undefined): boolean =>
    (orders ?? []).some((order) => ACTIVE_ORDER_STATUSES.includes(order.status))

export interface PhoneCountry {
    code: string
    prefix: string
}

export interface SplitPhone {
    phoneLocal: string
    /** Absent when the number has no known prefix (or there is none): the form keeps its current country. */
    selectedCountry?: string
}

/** A stored number (E.164) as the country picker and the local part of the edit form. */
export function splitStoredPhone(stored: string | null | undefined, countries: readonly PhoneCountry[]): SplitPhone {
    if (!stored) return { phoneLocal: '' }
    const country = countries.find((candidate) => stored.startsWith(candidate.prefix))
    if (!country) return { phoneLocal: stored }
    return { phoneLocal: stored.substring(country.prefix.length), selectedCountry: country.code }
}
