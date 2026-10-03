/*
 * The signed-in customer's saved address pre-fills the cart address exactly once. Never again after that: an address the
 * customer cleared (or replaced) on the checkout must not come back when the user record is re-set. The auth-sync plugin
 * repairs a missing record a moment after first paint (plugins/auth-sync.client.ts), so the pre-fill can also happen after
 * mount. And if the session turns out to be dead (the persisted user is dropped after a failed renewal), the address taken
 * from that user goes with it: no stale address stays in the cart behind the sign-in step.
 */
export interface AddressPrefillIo<A extends { id: string }> {
  userAddress: () => A | null | undefined
  cartAddress: () => A | null | undefined
  setCartAddress: (address: A | null) => void
}

export function createAddressPrefill<A extends { id: string }>(io: AddressPrefillIo<A>) {
  let prefilled = false
  let prefilledId: string | null = null

  /** Copies the user's address into an empty cart, once. */
  const prefill = (): void => {
    const address = io.userAddress()
    if (prefilled || !address || io.cartAddress()) return
    io.setCartAddress(address)
    prefilled = true
    prefilledId = address.id
  }

  /** Call when the user record changes: a dropped user takes the address it provided along, and the pre-fill may run again. */
  const onUserChanged = (user: unknown): void => {
    if (user || !prefilled) return
    if (io.cartAddress()?.id === prefilledId) io.setCartAddress(null)
    prefilled = false
    prefilledId = null
  }

  return { prefill, onUserChanged }
}
