import { type ComputedRef, computed } from 'vue'
import { exactUnitPriceCents, lineTotalCents } from '#engine/utils/pricing'
import type { CartItem } from '@/types'
import { computeCartTotals } from '#engine/utils/cartTotals'
import { useCartStore } from '@/stores/cart'
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
    couponDiscountCents: ComputedRef<number>
    /** 30 cents when the selected payment option is ONLINE, else 0. */
    onlineFeeCents: ComputedRef<number>
    /** What the customer pays: subtotal − discounts (clamped ≥ 0) + delivery fee + online fee. */
    payableCents: ComputedRef<number>
    hasBreakdown: ComputedRef<boolean>
    isMinimumReached: ComputedRef<boolean>
    /** Delivery only: how much more the basket needs to reach the minimum (0 when reached / pickup). */
    amountToDeliveryMinimumCents: ComputedRef<number>
    /** Switches the order to pickup (the "or switch to pickup" action of the minimum notice). */
    switchToPickup: () => void
}

export function useCartTotals(): CartTotals {
    const cartStore = useCartStore()
    const { trackEvent } = useTracking()

    const totals = computed(() => computeCartTotals({
        lines: cartStore.products,
        collectionOption: cartStore.collectionOption,
        address: cartStore.address,
        paymentOption: cartStore.paymentOption,
        couponDiscountCents: cartStore.couponDiscountCents,
    }))

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
        couponDiscountCents: computed(() => totals.value.couponDiscountCents),
        onlineFeeCents: computed(() => totals.value.onlineFeeCents),
        payableCents: computed(() => totals.value.payableCents),
        hasBreakdown: computed(() => totals.value.hasBreakdown),
        isMinimumReached: computed(() => totals.value.isMinimumReached),
        amountToDeliveryMinimumCents: computed(() => totals.value.amountToDeliveryMinimumCents),
        switchToPickup,
    }
}
