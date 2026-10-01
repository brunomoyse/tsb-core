export const DELIVERY_ZONE_METERS = 9000

// Fee in whole EUR = index of the first tier the distance is under: < 3000 → 0 (free),
// 3000-4000 → 1, 4000-5000 → 2, … 8000-9000 → 6. (Mirror of deliveryFeeFromDistance in the backend.)
export const DELIVERY_FEE_TIERS_METERS = [3000, 4000, 5000, 6000, 7000, 8000, 9000] as const

// Postcodes we never deliver to, regardless of distance.
export const EXCLUDED_POSTCODES = ['4610'] as const // 4610 = Beyne-Heusay

export const isExcludedPostcode = (postcode?: string | null): boolean =>
    (EXCLUDED_POSTCODES as readonly string[]).includes((postcode ?? '').trim())

// True when the address is eligible for delivery (within zone and not excluded).
export const isDeliverable = (distance: number, postcode?: string | null): boolean =>
    distance < DELIVERY_ZONE_METERS && !isExcludedPostcode(postcode)

/** Sentinel of `deliveryFeeCentsForDistance`: the distance is outside the delivery zone. */
export const OUT_OF_ZONE = -1

// Returns the fee in CENTS for a distance in meters. OUT_OF_ZONE (-1) means out of range (>= DELIVERY_ZONE_METERS).
export const deliveryFeeCentsForDistance = (distance: number): number => {
    if (distance >= DELIVERY_ZONE_METERS) return OUT_OF_ZONE
    const idx = DELIVERY_FEE_TIERS_METERS.findIndex(t => distance < t)
    return idx === -1 ? 0 : idx * 100
}
