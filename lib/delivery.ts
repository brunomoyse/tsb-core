export const DELIVERY_ZONE_METERS = 9000

export const DELIVERY_FEE_TIERS_METERS = [4000, 5000, 6000, 7000, 8000, 9000] as const

// Returns fee in EUR for a distance in meters. -1 means out of range (>= DELIVERY_ZONE_METERS).
export const deliveryFeeForDistance = (distance: number): number => {
    if (distance >= DELIVERY_ZONE_METERS) return -1
    const idx = DELIVERY_FEE_TIERS_METERS.findIndex(t => distance < t)
    return idx === -1 ? 0 : idx
}
