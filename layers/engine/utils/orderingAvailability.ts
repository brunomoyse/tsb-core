/*
 * THE rule for "can this customer place an order right now?", used by every surface that gates
 * checkout (pay buttons, the /cart and drawer links, the menu banner, the post-login redirect).
 *
 * The backend (tsb-service `order_pricing.go` + `validatePreferredReadyTime`) accepts an order while
 * the restaurant is closed as long as it carries a fixed same-day slot that is inside the day's
 * ordering intervals, so ordering is possible when
 *
 *   orderingEnabled && (isOrderingCurrentlyOpen || there is still a bookable slot today)
 *
 * (audit finding M6: the gate used to check only isOrderingCurrentlyOpen, which made the
 * "pick a time for today" flow of the collection options unreachable).
 */

export interface OrderingTimeSlot {
    /** Wall-clock "HH:MM" in the restaurant's time zone. */
    label: string
    /** The exact instant (ISO 8601). */
    value: string
}

export interface OrderingConfigInput {
    orderingEnabled?: boolean | null
    isOrderingCurrentlyOpen?: boolean | null
    availableSlotsToday?: OrderingTimeSlot[] | null
    preparationMinutes?: number | null
}

/**
 * Open: orders as soon as possible; preorder: closed right now but a slot today can still be booked;
 * closed: nothing can be ordered right now; disabled: ordering is switched off.
 */
export type OrderingStatus = 'open' | 'preorder' | 'closed' | 'disabled'

// Used while the config has no preparation time (not loaded, or a malformed value).
const DEFAULT_PREPARATION_MINUTES = 30
// The backend never accepts a slot closer than this, whatever preparation time is configured.
const MIN_PREPARATION_MINUTES = 15

/**
 * How far ahead of now a slot must be: the backend's rule (`validatePreferredReadyTime` in tsb-service:
 * `max(preparationMinutes, 15 min)`, and a slot exactly on the line is accepted). A missing or malformed
 * preparation time falls back to the 30 minute default.
 */
export const preparationBufferMs = (preparationMinutes: number | null | undefined): number => {
    const minutes = typeof preparationMinutes === 'number' && Number.isFinite(preparationMinutes) ? preparationMinutes : DEFAULT_PREPARATION_MINUTES
    return Math.max(minutes, MIN_PREPARATION_MINUTES) * 60_000
}

/**
 * The slots of today that can still be booked at `nowMs`: the same cut-off the backend applies when the
 * order is placed, so the gate, the picker and the order never disagree on a stale config.
 */
export function bookableSlots(
    slots: OrderingTimeSlot[] | null | undefined,
    preparationMinutes: number | null | undefined,
    nowMs: number,
): OrderingTimeSlot[] {
    const cutoff = nowMs + preparationBufferMs(preparationMinutes)
    return (slots ?? []).filter((slot) => new Date(slot.value).getTime() >= cutoff)
}

export function orderingStatus(config: OrderingConfigInput | null | undefined, nowMs: number): OrderingStatus {
    if (!config?.orderingEnabled) return 'disabled'
    if (config.isOrderingCurrentlyOpen) return 'open'
    return bookableSlots(config.availableSlotsToday, config.preparationMinutes, nowMs).length > 0 ? 'preorder' : 'closed'
}

/** The one gate: ordering is enabled and either open or still bookable ahead today. */
export const canPlaceOrder = (config: OrderingConfigInput | null | undefined, nowMs: number): boolean => {
    const status = orderingStatus(config, nowMs)
    return status === 'open' || status === 'preorder'
}
