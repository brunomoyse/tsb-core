/*
 * What the checkout does with the answers of `createOrder`, kept pure so `checkoutSubmit.test.mjs` pins it
 * (pages/checkout.vue owns the request, the notifications and the navigation).
 */

/**
 * The name of the cart item a line-level `createOrder` error points at (`extensions.productId`), so the message can
 * say WHICH item to remove. Undefined when the error names no product or the cart no longer has it.
 */
export function blockingProductName(
  productId: unknown,
  cartProducts: { product: { id: string; name: string } }[],
): string | undefined {
  if (typeof productId !== 'string') return undefined
  return cartProducts.find((item) => item.product.id === productId)?.product.name
}

export interface PlacedOrder {
  id?: string | null
  payment?: { links?: { checkout: { href: string } } | null } | null
}

export type OrderPlacementRoute =
  /** Online payment: leave for the Mollie checkout page. */
  | { kind: 'payment'; href: string }
  /** No payment page (cash): straight to the confirmation of the order. */
  | { kind: 'confirmation'; orderId: string }
  /** The answer carried neither: stay on the page. */
  | { kind: 'none' }

/** Where a created order sends the customer: the payment page when the backend gave a link, the confirmation otherwise. */
export function orderPlacementRoute(order: PlacedOrder | null | undefined): OrderPlacementRoute {
  const links = order?.payment?.links
  if (links !== undefined && links !== null) return { kind: 'payment', href: links.checkout.href }
  const id = order?.id
  if (id !== undefined && id !== null && id !== '') return { kind: 'confirmation', orderId: id }
  return { kind: 'none' }
}
