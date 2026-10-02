import { type ComputedRef, computed } from 'vue'
import { DELIVERY_MINIMUM, TRANSACTION_FEE } from '#engine/lib/fees'
import { amountToMinimumCents, computePayableCents, pickupDiscountCents } from '#engine/utils/payable'
import { deliveryFeeForDistance, isExcludedPostcode } from '~/lib/delivery'
import { exactUnitPrice, lineTotal, lineTotalCents, toCents } from '#engine/utils/pricing'
import type { CartItem } from '@/types'
import { useCartStore } from '@/stores/cart'
import { useTracking } from '#engine/composables/useTracking'

/*
 * Single source of truth for cart totals across every surface that shows them:
 * SideCart, CartMobile, FloatingCartBar, pages/cart.vue, checkout pay bar and CheckoutProductSummary.
 *
 * The contract mirrors what the backend charges (see tsb-service/pkg/money/rounding.go and
 * `computePayableCents`): subtotal stays raw, pickupDiscount is rounded individually, and
 * payableTotal — the amount Mollie is asked for — is rounded once after summing everything,
 * including the delivery fee and the online payment fee.
 */

export interface CartTotals {
    /** Line amount: base × qty + Σ(modifier × selection qty). See #engine/utils/pricing. */
    getItemLineTotal: (item: CartItem) => number
    /** Per-unit price, only when it multiplies back to the line total exactly (else null). */
    getItemExactUnitPrice: (item: CartItem) => number | null
    subtotal: ComputedRef<number>
    pickupDiscount: ComputedRef<number>
    deliveryFee: ComputedRef<number>
    couponDiscount: ComputedRef<number>
    /** €0.30 when the selected payment option is ONLINE, else 0. */
    onlineFee: ComputedRef<number>
    /** What the customer pays: subtotal − discounts (clamped ≥ 0) + delivery fee + online fee. */
    payableTotal: ComputedRef<number>
    hasBreakdown: ComputedRef<boolean>
    isMinimumReached: ComputedRef<boolean>
    /** Delivery only: how much more the basket needs to reach the minimum (0 when reached / pickup). */
    amountToDeliveryMinimum: ComputedRef<number>
    /** Switches the order to pickup (the "or switch to pickup" action of the minimum notice). */
    switchToPickup: () => void
}

export function useCartTotals(): CartTotals {
    const cartStore = useCartStore()
    const { trackEvent } = useTracking()

    const subtotal = computed(() =>
        cartStore.products.reduce((cents, item) => cents + lineTotalCents(item), 0) / 100,
    )

    // Integer cents, same rule as the backend (see pickupDiscountCents).
    const pickupDiscount = computed(() => {
        if (cartStore.collectionOption !== 'PICKUP') return 0
        const lines = cartStore.products.map((item) => ({
            totalCents: lineTotalCents(item),
            isDiscountable: Boolean(item.product.isDiscountable),
        }))
        return pickupDiscountCents(lines, lines.reduce((cents, line) => cents + line.totalCents, 0)) / 100
    })

    const deliveryFee = computed(() => {
        if (cartStore.collectionOption !== 'DELIVERY' || !cartStore.address) return 0
        if (isExcludedPostcode(cartStore.address.postcode)) return -1
        return deliveryFeeForDistance(cartStore.address.distance)
    })

    const couponDiscount = computed(() => cartStore.couponDiscount)

    const onlineFee = computed(() => (cartStore.paymentOption === 'ONLINE' ? TRANSACTION_FEE : 0))

    const payableTotal = computed(() =>
        computePayableCents({
            subtotalCents: toCents(subtotal.value),
            pickupDiscountCents: toCents(pickupDiscount.value),
            couponDiscountCents: toCents(couponDiscount.value),
            // -1 (out of zone) and "not known yet" both count as 0, like the backend before the address resolves.
            deliveryFeeCents: cartStore.collectionOption === 'DELIVERY' ? toCents(Math.max(deliveryFee.value, 0)) : 0,
            onlineFeeCents: toCents(onlineFee.value),
        }) / 100,
    )

    const hasBreakdown = computed(() =>
        cartStore.collectionOption === 'DELIVERY' ||
        pickupDiscount.value > 0 ||
        couponDiscount.value > 0 ||
        onlineFee.value > 0,
    )

    const isMinimumReached = computed(() =>
        cartStore.collectionOption === 'DELIVERY' ? subtotal.value >= DELIVERY_MINIMUM : true,
    )

    const amountToDeliveryMinimum = computed(() =>
        cartStore.collectionOption === 'DELIVERY'
            ? amountToMinimumCents(toCents(subtotal.value), toCents(DELIVERY_MINIMUM)) / 100
            : 0,
    )

    const switchToPickup = () => {
        if (cartStore.collectionOption === 'PICKUP') return
        trackEvent('cart_collection_option_changed', { from: cartStore.collectionOption, to: 'PICKUP' })
        cartStore.collectionOption = 'PICKUP'
    }

    return {
        getItemLineTotal: lineTotal,
        getItemExactUnitPrice: exactUnitPrice,
        subtotal,
        pickupDiscount,
        deliveryFee,
        couponDiscount,
        onlineFee,
        payableTotal,
        hasBreakdown,
        isMinimumReached,
        amountToDeliveryMinimum,
        switchToPickup,
    }
}
