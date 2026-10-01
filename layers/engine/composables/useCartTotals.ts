import { type ComputedRef, computed } from 'vue'
import { exactUnitPriceCents, lineTotalCents } from '#engine/utils/pricing'
import { isQuoteBlocking, isQuoteUsableForTotals, totalsFromQuote } from '#engine/utils/orderQuote'
import type { CartItem } from '@/types'
import { computeCartTotals } from '#engine/utils/cartTotals'
import { isExcludedPostcode } from '#engine/lib/delivery'
import { useCartStore } from '@/stores/cart'
import { useQuoteStore } from '#engine/stores/quote'
import { useTracking } from '#engine/composables/useTracking'

/*
 * Single source of truth for cart totals across every surface that shows them:
 * SideCart, CartMobile, FloatingCartBar, pages/cart.vue, checkout pay bar and CheckoutProductSummary.
 *
 * Every amount is an INTEGER NUMBER OF CENTS (audit M13); templates format them with
 * `formatCents` and only the API boundary turns them into decimal strings. The maths lives in
 * `#engine/utils/cartTotals` (pure, covered by the backend parity test); this composable just
 * makes it reactive.
 *
 * When the server's quote of the CURRENT cart is available (`useOrderQuote` keeps it up to date)
 * its numbers are shown instead of the client's maths: they are what createOrder will charge.
 * While a quote is pending or failed, and on a backend without quoteOrder, the client's maths
 * (parity-tested against the backend) is shown, so a surface never waits on the network to show a total.
 *
 * The contract mirrors what the backend charges (see tsb-service/pkg/money/rounding.go and
 * `computePayableCents`): subtotal stays raw, the discounts are rounded individually, and
 * payableCents — the amount Mollie is asked for — is rounded once after summing everything,
 * including the delivery fee and the online payment fee.
 */

export interface CartTotals {
    /** Line amount in cents: base × qty + Σ(modifier × selection qty). See #engine/utils/pricing. */
    getItemLineTotalCents: (item: CartItem) => number
    /** Per-unit price in cents, only when it multiplies back to the line total exactly (else null). */
    getItemExactUnitCents: (item: CartItem) => number | null
    subtotalCents: ComputedRef<number>
    pickupDiscountCents: ComputedRef<number>
    /** 0 for pickup / unknown address, -1 (OUT_OF_ZONE) when the address cannot be delivered to. */
    deliveryFeeCents: ComputedRef<number>
    /** The i18n key that explains WHY the address is refused when deliveryFeeCents is -1 (excluded postcode vs too far). */
    deliveryUnavailableKey: ComputedRef<'checkout.notDeliverableArea' | 'checkout.tooFar'>
    couponDiscountCents: ComputedRef<number>
    /** 30 cents when the selected payment option is ONLINE, else 0. */
    onlineFeeCents: ComputedRef<number>
    /** What the customer pays: subtotal − discounts (clamped ≥ 0) + delivery fee + online fee. */
    payableCents: ComputedRef<number>
    hasBreakdown: ComputedRef<boolean>
    isMinimumReached: ComputedRef<boolean>
    /** Delivery only: how much more the basket needs to reach the minimum (0 when reached / pickup). */
    amountToDeliveryMinimumCents: ComputedRef<number>
    /** The totals above are the server's quote (true), not the client's maths. */
    isQuoted: ComputedRef<boolean>
    /** A quote of the current cart is on its way: the totals shown may still move ("updating…"). */
    isQuotePending: ComputedRef<boolean>
    /** The order cannot be placed now: the quote is pending, or the fresh quote reports blocking issues. */
    isOrderBlocked: ComputedRef<boolean>
    /** Switches the order to pickup (the "or switch to pickup" action of the minimum notice). */
    switchToPickup: () => void
}

export function useCartTotals(): CartTotals {
    const cartStore = useCartStore()
    const { trackEvent } = useTracking()

    const quoteStore = useQuoteStore()

    const clientTotals = computed(() => computeCartTotals({
        lines: cartStore.products,
        collectionOption: cartStore.collectionOption,
        address: cartStore.address,
        paymentOption: cartStore.paymentOption,
        couponDiscountCents: cartStore.couponDiscountCents,
    }))
    const quote = computed(() => {
        const fresh = quoteStore.freshQuote
        return fresh && cartStore.products.length > 0 && isQuoteUsableForTotals(fresh) ? fresh : null
    })
    const totals = computed(() => quote.value ? totalsFromQuote(quote.value, cartStore.collectionOption) : clientTotals.value)

    const switchToPickup = () => {
        if (cartStore.collectionOption === 'PICKUP') return
        trackEvent('cart_collection_option_changed', { from: cartStore.collectionOption, to: 'PICKUP' })
        cartStore.collectionOption = 'PICKUP'
    }

    return {
        getItemLineTotalCents: lineTotalCents,
        getItemExactUnitCents: exactUnitPriceCents,
        subtotalCents: computed(() => totals.value.subtotalCents),
        pickupDiscountCents: computed(() => totals.value.pickupDiscountCents),
        deliveryFeeCents: computed(() => totals.value.deliveryFeeCents),
        deliveryUnavailableKey: computed(() => isExcludedPostcode(cartStore.address?.postcode) ? 'checkout.notDeliverableArea' : 'checkout.tooFar'),
        couponDiscountCents: computed(() => totals.value.couponDiscountCents),
        onlineFeeCents: computed(() => totals.value.onlineFeeCents),
        payableCents: computed(() => totals.value.payableCents),
        hasBreakdown: computed(() => totals.value.hasBreakdown),
        isMinimumReached: computed(() => totals.value.isMinimumReached),
        amountToDeliveryMinimumCents: computed(() => totals.value.amountToDeliveryMinimumCents),
        isQuoted: computed(() => quote.value !== null),
        isQuotePending: computed(() => quoteStore.pending),
        isOrderBlocked: computed(() => quoteStore.pending || (quoteStore.freshQuote !== null && isQuoteBlocking(quoteStore.freshQuote))),
        switchToPickup,
    }
}
