/**
 * Takeaway-only mode: the pure rules behind `useDeliveryMode`.
 *
 * `deliveryOffered` is whether the brand and the API's delivery policy both offer home delivery.
 * When it does not, a cart starts on PICKUP and nothing may set it back to DELIVERY, not even a cart persisted
 * before the flag existed.
 */
export type CollectionOption = 'DELIVERY' | 'PICKUP'

/** The brand flag: delivery is offered unless the brand says `deliveryEnabled: false`. */
export const brandOffersDelivery = (deliveryEnabled: boolean | undefined): boolean =>
  deliveryEnabled !== false

/** The option a fresh cart starts on. */
export const defaultCollectionOption = (deliveryOffered: boolean): CollectionOption =>
  deliveryOffered ? 'DELIVERY' : 'PICKUP'

/** The option to keep: DELIVERY is snapped back to PICKUP while delivery is not offered. */
export const enforcedCollectionOption = (
  option: CollectionOption,
  deliveryOffered: boolean,
): CollectionOption => (option === 'DELIVERY' && !deliveryOffered ? 'PICKUP' : option)
