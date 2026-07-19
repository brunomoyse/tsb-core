import { type ComputedRef, computed } from 'vue'
import type { CartItem } from '@/types'
import { deliveryFeeForDistance, isExcludedPostcode } from '~/lib/delivery'
import { roundToNearest10Cents } from '~/utils/money'
import { useCartStore } from '@/stores/cart'

/*
 * Single source of truth for cart totals across every surface that shows them:
 * SideCart, CartMobile, FloatingCartBar, pages/cart.vue, CheckoutProductSummary.
 *
 * The contract mirrors what the backend charges (see tsb-service/pkg/money/rounding.go):
 * subtotal stays raw, pickupDiscount is rounded individually, and displayTotal is rounded
 * once after summing — identical to CheckoutProductSummary.finalTotal sans transactionFee.
 */

const PICKUP_DISCOUNT_THRESHOLD = 20
const PICKUP_DISCOUNT_RATE = 0.1
const DELIVERY_MIN = 25

export interface CartTotals {
    getItemUnitPrice: (item: CartItem) => number
    subtotal: ComputedRef<number>
    pickupDiscount: ComputedRef<number>
    deliveryFee: ComputedRef<number>
    couponDiscount: ComputedRef<number>
    displayTotal: ComputedRef<number>
    hasBreakdown: ComputedRef<boolean>
    isMinimumReached: ComputedRef<boolean>
}

export function useCartTotals(): CartTotals {
    const cartStore = useCartStore()

    const getItemUnitPrice = (item: CartItem): number => {
        const base = Number(item.product.price)
        const selections = item.selectedChoices ?? []
        if (selections.length > 0) {
            const choiceMap = new Map((item.product.choices ?? []).map((choice) => [choice.id, choice]))
            return base + selections.reduce((sum, selection) => {
                const choice = choiceMap.get(selection.choiceId)
                return choice ? sum + Number(choice.priceModifier) * selection.quantity : sum
            }, 0)
        }
        return base + (item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0)
    }

    const subtotal = computed(() =>
        cartStore.products.reduce((acc, item) => acc + getItemUnitPrice(item) * item.quantity, 0),
    )

    const pickupDiscount = computed(() => {
        if (cartStore.collectionOption !== 'PICKUP' || subtotal.value < PICKUP_DISCOUNT_THRESHOLD) return 0
        const raw = cartStore.products.reduce((acc, item) =>
            item.product.isDiscountable
                ? acc + getItemUnitPrice(item) * item.quantity * PICKUP_DISCOUNT_RATE
                : acc, 0)
        return roundToNearest10Cents(raw)
    })

    const deliveryFee = computed(() => {
        if (cartStore.collectionOption !== 'DELIVERY' || !cartStore.address) return 0
        if (isExcludedPostcode(cartStore.address.postcode)) return -1
        return deliveryFeeForDistance(cartStore.address.distance)
    })

    const couponDiscount = computed(() => cartStore.couponDiscount)

    const displayTotal = computed(() => {
        const fee = cartStore.collectionOption === 'DELIVERY' ? Math.max(deliveryFee.value, 0) : 0
        const raw = subtotal.value + fee - pickupDiscount.value - couponDiscount.value
        return roundToNearest10Cents(Math.max(raw, 0))
    })

    const hasBreakdown = computed(() =>
        cartStore.collectionOption === 'DELIVERY' ||
        pickupDiscount.value > 0 ||
        couponDiscount.value > 0,
    )

    const isMinimumReached = computed(() =>
        cartStore.collectionOption === 'DELIVERY' ? subtotal.value >= DELIVERY_MIN : true,
    )

    return {
        getItemUnitPrice,
        subtotal,
        pickupDiscount,
        deliveryFee,
        couponDiscount,
        displayTotal,
        hasBreakdown,
        isMinimumReached,
    }
}
