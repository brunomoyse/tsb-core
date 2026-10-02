import { unwrapGqlError } from './gqlError.ts'

/*
 * The ordering rules the backend enforces when it prices a basket (tsb-service `RestaurantConfig.policy`,
 * audit PR 4.5), as the web consumes them: integers only (cents, meters, basis points, minutes).
 *
 * The API serves money as decimal strings ("25.00"), distances in km and the discount as a fraction
 * (0.10): `orderingPolicyFromApi` turns them into integers once, at the edge. Every pure function of the
 * engine that needs a number (the cart maths, the delivery zone, the slot cut-off) takes an `OrderingPolicy`
 * as a parameter, so it stays testable with plain node; the reactive side is `useOrderingPolicy()`.
 *
 * `DEFAULT_ORDERING_POLICY` is what the backend served before the policy existed. It is used while the
 * config is loading and for a backend that has no `policy` field yet, so an old service keeps working.
 */

export interface DeliveryFeeTierCents {
    /** Exclusive upper bound of the tier, in meters: a distance d pays the first tier with d < upToMeters. */
    upToMeters: number
    feeCents: number
}

export interface OrderingPolicy {
    /** False for a takeaway-only instance: delivery orders are refused. */
    deliveryEnabled: boolean
    /** Minimum basket for delivery: goods only, before the delivery fee. */
    deliveryMinimumCents: number
    /** Addresses at or beyond this distance are out of zone. */
    deliveryMaxMeters: number
    /** Ascending by `upToMeters`; the last bound equals `deliveryMaxMeters`. */
    deliveryFeeTiers: DeliveryFeeTierCents[]
    /** Postcodes never delivered to, whatever the distance. */
    excludedPostcodes: string[]
    /** Share of the discountable products taken off a pickup order, in basis points (0.10 = 1000). */
    pickupDiscountRateBp: number
    /** Minimum pickup basket (goods + delivery fee) for the discount. */
    pickupDiscountMinimumCents: number
    /** Added to the total of an online payment. */
    onlinePaymentFeeCents: number
    /** Every total is rounded to a multiple of this amount. */
    totalRoundingStepCents: number
    /** Ready-time slots are generated on, and aligned to, this many minutes. */
    slotIntervalMinutes: number
    /** Floor under the restaurant's preparation time when a ready time is validated. */
    minimumPreparationMinutes: number
}

/** What `restaurantConfig.policy` answers (the GraphQL `OrderingPolicy` type). */
export interface ApiOrderingPolicy {
    deliveryEnabled: boolean
    deliveryMinimum: string
    deliveryMaxDistanceKm: number
    deliveryFeeTiers: { upToKm: number; fee: string }[]
    excludedPostcodes: string[]
    pickupDiscountRate: number
    pickupDiscountMinimum: string
    onlinePaymentFee: string
    totalRoundingStep: string
    slotIntervalMinutes: number
    minimumPreparationMinutes: number
}

/** The selection of `policy` in the restaurant config query and subscription. */
export const ORDERING_POLICY_SELECTION = `
    policy {
        deliveryEnabled
        deliveryMinimum
        deliveryMaxDistanceKm
        deliveryFeeTiers { upToKm fee }
        excludedPostcodes
        pickupDiscountRate
        pickupDiscountMinimum
        onlinePaymentFee
        totalRoundingStep
        slotIntervalMinutes
        minimumPreparationMinutes
    }
`

/*
 * Fee in whole EUR = index of the first tier the distance is under: < 3 km → 0 (free), 3-4 km → 1, ... 8-9 km → 6.
 * Same numbers as `DefaultOrderingPolicy` in tsb-service restaurant/domain/policy.go.
 */
const deepFreeze = <T extends object>(value: T): T => {
    for (const child of Object.values(value)) if (child && typeof child === 'object') deepFreeze(child)
    return Object.freeze(value)
}

/** Frozen all the way down: the default is shared by every caller, so no one can edit the grid under the others. */
export const DEFAULT_ORDERING_POLICY: OrderingPolicy = deepFreeze({
    deliveryEnabled: true,
    deliveryMinimumCents: 2500,
    deliveryMaxMeters: 9000,
    deliveryFeeTiers: [
        { upToMeters: 3000, feeCents: 0 },
        { upToMeters: 4000, feeCents: 100 },
        { upToMeters: 5000, feeCents: 200 },
        { upToMeters: 6000, feeCents: 300 },
        { upToMeters: 7000, feeCents: 400 },
        { upToMeters: 8000, feeCents: 500 },
        { upToMeters: 9000, feeCents: 600 },
    ],
    excludedPostcodes: ['4610'], // Beyne-Heusay
    pickupDiscountRateBp: 1000,
    pickupDiscountMinimumCents: 2000,
    onlinePaymentFeeCents: 30,
    totalRoundingStepCents: 10,
    slotIntervalMinutes: 15,
    minimumPreparationMinutes: 15,
} satisfies OrderingPolicy)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** A decimal string of money ("25.00") in cents, or `fallback` when it is not a non-negative amount. */
const centsOr = (value: unknown, fallback: number): number => {
    if (typeof value !== 'string' || value.trim() === '') return fallback
    const amount = Number(value)
    return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : fallback
}

const positiveIntOr = (value: unknown, fallback: number): number =>
    isFiniteNumber(value) && value > 0 ? Math.round(value) : fallback

const nonNegativeIntOr = (value: unknown, fallback: number): number =>
    isFiniteNumber(value) && value >= 0 ? Math.round(value) : fallback

/** A decimal string of money in cents, or null when it is not a non-negative amount (so a bad fee never reads as 0). */
const strictCents = (value: unknown): number | null => {
    const cents = centsOr(value, -1)
    return cents < 0 ? null : cents
}

/**
 * The fee grid from the API, or null when ANY tier is malformed: a tier whose fee does not parse must not become a
 * free delivery, and dropping one tier silently would shift the others' bands, so the whole grid falls back.
 */
const tiersFromApi = (raw: unknown): DeliveryFeeTierCents[] | null => {
    if (!Array.isArray(raw) || raw.length === 0) return null
    const tiers: DeliveryFeeTierCents[] = []
    for (const tier of raw) {
        const feeCents = strictCents(tier?.fee)
        if (!isFiniteNumber(tier?.upToKm) || tier.upToKm <= 0 || feeCents === null) return null
        tiers.push({ upToMeters: kmToMeters(tier.upToKm), feeCents })
    }
    return tiers.toSorted((a, b) => a.upToMeters - b.upToMeters)
}

const kmToMeters = (km: number): number => Math.round(km * 1000)

/**
 * The policy in integers. A missing policy (an old backend) gives the default one; a field that is missing or
 * malformed falls back to the default for that field alone, so a partial answer never breaks the cart maths.
 */
export function orderingPolicyFromApi(raw: Partial<ApiOrderingPolicy> | null | undefined): OrderingPolicy {
    if (!raw || typeof raw !== 'object') return DEFAULT_ORDERING_POLICY
    const fallback = DEFAULT_ORDERING_POLICY

    const deliveryFeeTiers = tiersFromApi(raw.deliveryFeeTiers) ?? fallback.deliveryFeeTiers.map((tier) => ({ ...tier }))
    const lastTier = deliveryFeeTiers[deliveryFeeTiers.length - 1]!

    return {
        deliveryEnabled: typeof raw.deliveryEnabled === 'boolean' ? raw.deliveryEnabled : fallback.deliveryEnabled,
        deliveryMinimumCents: centsOr(raw.deliveryMinimum, fallback.deliveryMinimumCents),
        deliveryMaxMeters: isFiniteNumber(raw.deliveryMaxDistanceKm) && raw.deliveryMaxDistanceKm > 0
            ? kmToMeters(raw.deliveryMaxDistanceKm)
            : lastTier.upToMeters,
        deliveryFeeTiers,
        excludedPostcodes: Array.isArray(raw.excludedPostcodes)
            ? raw.excludedPostcodes.filter((code): code is string => typeof code === 'string').map((code) => code.trim())
            : [...fallback.excludedPostcodes],
        // A fraction: capped to 0..1, so a malformed rate can never take more than the whole price off.
        pickupDiscountRateBp: isFiniteNumber(raw.pickupDiscountRate) && raw.pickupDiscountRate >= 0
            ? Math.round(Math.min(raw.pickupDiscountRate, 1) * 10_000)
            : fallback.pickupDiscountRateBp,
        pickupDiscountMinimumCents: centsOr(raw.pickupDiscountMinimum, fallback.pickupDiscountMinimumCents),
        onlinePaymentFeeCents: centsOr(raw.onlinePaymentFee, fallback.onlinePaymentFeeCents),
        totalRoundingStepCents: Math.max(centsOr(raw.totalRoundingStep, fallback.totalRoundingStepCents), 1),
        slotIntervalMinutes: positiveIntOr(raw.slotIntervalMinutes, fallback.slotIntervalMinutes),
        // As served: the backend floors the preparation time at max(prep, this), and 0 is a legitimate "no floor".
        minimumPreparationMinutes: nonNegativeIntOr(raw.minimumPreparationMinutes, fallback.minimumPreparationMinutes),
    }
}

export interface DeliveryFeeRow {
    /** Start of the band in km, null for the first one ("less than {toKm} km"). */
    fromKm: number | null
    toKm: number
    feeCents: number
}

/** The fee grid as display rows (km bands), cut at the delivery radius: what the "delivery fees" tooltip lists. */
export function deliveryFeeRows(policy: OrderingPolicy): DeliveryFeeRow[] {
    const rows: DeliveryFeeRow[] = []
    let fromMeters = 0
    for (const tier of policy.deliveryFeeTiers) {
        if (fromMeters >= policy.deliveryMaxMeters) break
        rows.push({
            fromKm: fromMeters === 0 ? null : fromMeters / 1000,
            toKm: Math.min(tier.upToMeters, policy.deliveryMaxMeters) / 1000,
            feeCents: tier.feeCents,
        })
        fromMeters = tier.upToMeters
    }
    return rows
}

/** The pickup discount as a percentage for a label ("10"; "7.5" when it is not whole). */
export const pickupDiscountPercent = (policy: OrderingPolicy): number => policy.pickupDiscountRateBp / 100

/** The delivery radius in km for a label ("9", "7.5"). */
export const deliveryMaxKm = (policy: OrderingPolicy): number => policy.deliveryMaxMeters / 1000

/**
 * An old backend has no `policy` on RestaurantConfig: the server answers GRAPHQL_VALIDATION_FAILED
 * mentioning the field. The caller remembers it and re-asks without the field for good (same pattern as
 * `isQuoteUnsupportedError` for the quote and the legacy validateCoupon query).
 */
export function isPolicyUnsupportedError(err: unknown): boolean {
    const gqlError = unwrapGqlError(err)
    return Boolean(gqlError?.hasCode('GRAPHQL_VALIDATION_FAILED') && /\bpolicy\b|OrderingPolicy/u.test(gqlError.message))
}
