import type { OrderingPolicy } from '../utils/orderingPolicy.ts'

/*
 * The delivery zone rules, as pure functions of the API's ordering policy (`useOrderingPolicy()`):
 * radius, fee tiers and excluded postcodes are the backend's numbers (RestaurantConfig.policy), not web constants.
 */

/** Sentinel of `deliveryFeeCentsForDistance`: the distance is outside the delivery zone. */
export const OUT_OF_ZONE = -1

/** Postcodes we never deliver to, regardless of distance. */
export const isExcludedPostcode = (policy: OrderingPolicy, postcode?: string | null): boolean =>
  policy.excludedPostcodes.includes((postcode ?? '').trim())

/**
 * The fee in CENTS for a distance in meters: the first tier the distance is under (a distance on a bound pays
 * the next tier), OUT_OF_ZONE (-1) when it is at or beyond the radius. Mirror of `OrderingPolicy.DeliveryFee`
 * in the backend.
 */
export const deliveryFeeCentsForDistance = (policy: OrderingPolicy, distance: number): number => {
  if (distance >= policy.deliveryMaxMeters) return OUT_OF_ZONE
  const tier = policy.deliveryFeeTiers.find((candidate) => distance < candidate.upToMeters)
  return tier ? tier.feeCents : OUT_OF_ZONE
}

// True when the address is eligible for delivery (within zone and not excluded).
export const isDeliverable = (
  policy: OrderingPolicy,
  distance: number,
  postcode?: string | null,
): boolean =>
  deliveryFeeCentsForDistance(policy, distance) !== OUT_OF_ZONE &&
  !isExcludedPostcode(policy, postcode)

export type DeliveryZoneStatus = 'ok' | 'tooFar' | 'excluded'

/**
 * Why (or whether) an address can be delivered to. `excluded` wins over `tooFar` so the customer is told the
 * more specific reason. Every surface (picker, chip, checkout gate) goes through this, never through the
 * distance alone.
 */
export const deliveryZoneStatus = (
  policy: OrderingPolicy,
  address: { distance?: number | null; postcode?: string | null },
): DeliveryZoneStatus => {
  if (isExcludedPostcode(policy, address.postcode)) return 'excluded'
  return isDeliverable(policy, address.distance ?? 0, address.postcode) ? 'ok' : 'tooFar'
}
