<template>
    <aside
        data-testid="side-cart"
        class="
            bg-tsb-two
            rounded-l-xl
            flex
            flex-col
            divide-y
            divide-neutral-200
            max-h-[calc(100vh-32px)]
            overflow-y-auto
            mt-4
         "
    >
        <!-- Header with Toggle -->
        <header class="px-4 py-5 flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
            <h2 class="text-xl font-bold text-neutral-900">
                {{ $t('cart.title') }}
            </h2>
            <div class="flex gap-1 rounded-full bg-neutral-100 p-1">
                <button v-for="option in collectionOptions" :key="option.value"
                        :data-testid="option.value === 'DELIVERY' ? 'cart-option-delivery' : 'cart-option-pickup'"
                        type="button"
                        :aria-pressed="cartStore.collectionOption === option.value"
                        :disabled="option.disabled"
                        :title="option.disabled ? `${option.label}: ${$t('delivery.comingSoon')}` : undefined"
                        :class="[
          'flex min-h-9 items-center gap-1 whitespace-nowrap px-2 py-1 text-xs font-medium rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          option.disabled ? 'cursor-not-allowed opacity-40' : '',
          cartStore.collectionOption === option.value
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-600 hover:bg-tsb-four/40'
        ]"
                        @click="handleOrderType(option.value)">
                    <img alt="" :src="option.icon" class="w-4 h-4 shrink-0"/>
                    <span>{{ option.label }}</span>
                    <span v-if="option.value === 'PICKUP'" class="rounded-full bg-tsb-four px-1 py-0.5 text-[10px] font-semibold text-primary-700">{{ $t('cart.pickupDiscountShort') }}</span>
                </button>
            </div>
        </header>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <p v-if="cartStore.products.length === 0" class="text-neutral-600 text-center py-8">
                {{ $t('cart.empty') }}
            </p>
            <div v-else class="space-y-4">
                <div v-for="(item, lineIndex) in cartStore.products" :key="lineKeys[lineIndex]"
                     data-testid="cart-item"
                     class="group relative grid grid-cols-[auto_1fr] gap-4 p-3 bg-white rounded-xl"
                     :class="{ 'animate-cart-flash': highlightedKey === getItemKey(item) }">
                    <!-- Product Image -->
                    <div
                        class="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                        @click="openLightbox(item.product?.id, item.product.name)"
                    >
                        <picture>
                            <source
                                :srcset="`${productImageBase(item.product?.id)}.avif`"
                                type="image/avif"/>
                            <source
                                :srcset="`${productImageBase(item.product?.id)}.webp`"
                                type="image/webp"/>
                            <img
                                 ref="itemImageElements"
                                 :alt="item.product.name"
                                 :src="`${productImageBase(item.product?.id)}.png`"
                                 class="max-w-full max-h-full"
                                 width="48"
                                 height="48"
                                 draggable="false"
                                 @error="handleProductImageError"/>
                        </picture>
                    </div>

                    <!-- Product Details -->
                    <div class="flex flex-col justify-between gap-2">
                        <!-- Product Info and Price -->
                        <div class="flex justify-between items-start gap-2">
                            <div class="flex flex-col min-w-0 flex-1">
                                <p v-if="itemLabelMeta(item)" class="text-xs text-neutral-600 truncate">
                                    {{ itemLabelMeta(item) }}
                                </p>
                                <h3 class="text-sm font-medium text-neutral-900 leading-snug line-clamp-2">
                                    {{ itemLabelName(item) }}
                                </h3>
                                <span v-if="itemChoice(item)" class="text-xs text-primary-700">
                                    ({{ itemChoice(item) }})
                                </span>
                                <span v-if="item.product.pieceCount" class="text-xs text-neutral-600">
                                    {{ item.product.pieceCount }}
                                    {{ item.product.pieceCount === 1 ? $t('menu.pc') : $t('menu.pcs') }}
                                </span>
                            </div>
                            <span class="text-sm font-medium whitespace-nowrap flex-shrink-0 self-start">
                                {{ formatCents(getItemLineTotalCents(item)) }}
                            </span>
                        </div>

                        <!-- What the server quote says about this line, with the way out -->
                        <CartLineIssues :item="item" :line-key="lineKeys[lineIndex]" />

                        <!-- Quantity Controls and Remove -->
                        <div class="flex items-center justify-between mt-auto">
                            <!-- Customized lines carry per-line selections, so they are edited in the modal -->
                            <div v-if="hasChoices(item)" class="flex items-center gap-2">
                                <span data-testid="cart-item-quantity" class="min-w-6 text-center text-sm font-semibold tabular-nums text-primary-700">×{{ item.quantity }}</span>
                                <UiButton variant="secondary" size="sm" data-testid="cart-item-edit" @click="editItem(item)">
                                    {{ $t('cart.editItem') }}
                                </UiButton>
                            </div>
                            <QuantityStepper
                                v-else
                                size="sm"
                                :value="item.quantity"
                                :inc-disabled="item.quantity >= MAX_ITEM_QUANTITY"
                                dec-testid="cart-item-decrement"
                                inc-testid="cart-item-increment"
                                value-testid="cart-item-quantity"
                                @decrement="handleDecrementQuantity(item)"
                                @increment="handleIncrementQuantity(item)"
                            />
                            <button type="button" data-testid="cart-item-remove"
                                    class="min-h-9 rounded-lg px-2 text-xs font-medium text-neutral-600 hover:text-red-800 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    @click="removeWithUndo(item)">
                                {{ $t('cart.removeItem') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="p-4 space-y-4 flex-none">
            <!-- Price Breakdown -->
            <div class="space-y-2">
                <div v-if="hasBreakdown" class="flex justify-between items-center text-sm text-neutral-600">
                    <span>{{ $t('cart.subtotal') }}:</span>
                    <span class="tabular-nums">{{ formatCents(subtotalCents) }}</span>
                </div>
                <div v-if="cartStore.collectionOption === 'DELIVERY'" class="flex justify-between items-center text-sm text-neutral-600">
                    <span>{{ $t('cart.deliveryFee') }}:</span>
                    <span v-if="!cartStore.address?.distance" class="text-neutral-600 italic text-xs">
                        {{ $t('cart.deliveryTbd') }}
                    </span>
                    <span v-else-if="deliveryFeeCents === -1" class="text-red-700 font-medium text-xs inline-flex flex-wrap items-center justify-end gap-x-2 text-right">
                        {{ $t(deliveryUnavailableKey) }}
                        <button type="button" data-testid="cart-out-of-zone-switch-to-pickup" class="underline min-h-11 px-1 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded" @click="switchToPickup">{{ $t('delivery.modal.switchToPickup') }}</button>
                    </span>
                    <span v-else-if="deliveryFeeCents === 0" class="inline-flex items-center px-2 py-0.5 rounded-full bg-tsb-four text-primary-700 text-[11px] font-semibold uppercase tracking-wide">
                        {{ $t('checkout.free') }}
                    </span>
                    <span v-else class="tabular-nums">{{ formatCents(deliveryFeeCents) }}</span>
                </div>
                <div v-if="pickupDiscountCents > 0" class="flex justify-between items-center text-sm text-green-800">
                    <span>{{ $t('cart.pickupDiscount') }}:</span>
                    <span class="tabular-nums">-{{ formatCents(pickupDiscountCents) }}</span>
                </div>
                <div v-if="couponDiscountCents > 0" class="flex justify-between items-center text-sm text-green-800">
                    <span>{{ $t('coupon.discount') }}<span v-if="cartStore.couponCode"> ({{ cartStore.couponCode }})</span>:</span>
                    <span class="tabular-nums">-{{ formatCents(couponDiscountCents) }}</span>
                </div>
                <div v-if="onlineFeeCents > 0" class="flex justify-between items-center text-sm text-neutral-600">
                    <span>{{ $t('cart.onlineFee') }}:</span>
                    <span class="tabular-nums">{{ formatCents(onlineFeeCents) }}</span>
                </div>
                <div class="flex justify-between items-center text-lg font-medium border-t pt-2">
                    <span>{{ $t('cart.total') }}:</span>
                    <span class="inline-flex items-baseline gap-2"><QuoteUpdatingHint /><span data-testid="cart-total" class="tabular-nums">{{ formatCents(payableCents) }}</span></span>
                </div>
            </div>

            <!-- Delivery minimum (delivery only — pickup has no minimum) -->
            <div v-if="!isMinimumReached" data-testid="cart-minimum-warning" class="text-sm text-primary-700 text-center">
                <p>{{ $t('cart.addForDelivery', { amount: formatCents(amountToDeliveryMinimumCents) }) }}</p>
                <button type="button" data-testid="cart-switch-to-pickup" class="mt-1 min-h-11 px-3 font-medium underline hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg" @click="switchToPickup">
                    {{ $t('delivery.modal.switchToPickup') }}
                </button>
            </div>

            <!-- Ordering Unavailable Warning -->
            <div v-if="!isOrderingAvailable" class="text-sm text-amber-800 text-center">
                {{ $t('cart.orderingUnavailable') }}
            </div>
            <div v-else-if="preorderTime" data-testid="cart-preorder-hint" class="text-sm text-amber-800 text-center">
                {{ $t('ordering.closedPreorder', { time: preorderTime }) }}
            </div>

            <!-- Checkout Button -->
            <UiButton
                to="/checkout"
                size="lg"
                block
                data-testid="cart-checkout-link"
                :disabled="!isMinimumReached || !isOrderingAvailable"
            >
                {{ $t('cart.checkout') }}
            </UiButton>
        </footer>
    </aside>
    <ImageLightbox ref="lightboxRef" :src="lightboxSrc" :alt="lightboxAlt" />
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { cartLineKey, cartLineKeys } from '#engine/utils/cartLines'
import { computed, onUnmounted, ref, useRuntimeConfig, watch } from '#imports'
import { useEventBus, useMediaQuery } from '@vueuse/core'
import type { CartItem } from '#engine/types'
import CartLineIssues from '#engine/components/CartLineIssues.vue'
import ImageLightbox from '~/components/ImageLightbox.vue' // eslint-disable-line typescript-eslint/consistent-type-imports
import QuoteUpdatingHint from '#engine/components/QuoteUpdatingHint.vue'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatCents } from '#engine/lib/price'
import { orderItemLabelParts } from '#engine/utils/orderItemLabel'
import { MAX_ITEM_QUANTITY, useCartStore } from '#engine/stores/cart'
import { useCartRemoval } from '#engine/composables/useCartRemoval'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { DELIVERY_MINIMUM } from '#engine/lib/fees'
import { useCartItemActions } from '#engine/composables/useCartItemActions'
import { useHaptics } from '#engine/composables/useHaptics'
import { useI18n } from 'vue-i18n'
import { useOrderQuote } from '#engine/composables/useOrderQuote'
import { useTracking } from '#engine/composables/useTracking'

const { showProductCode = false, deliveryEnabled = true } = useAppConfig().brand


const { isOrderingAvailable = true, preorderTime = null } = defineProps<{ isOrderingAvailable?: boolean; preorderTime?: string | null }>()

const config = useRuntimeConfig();
const cartStore = useCartStore();
const { impact } = useHaptics()
const {t} = useI18n()
const { trackEvent } = useTracking()
const { removeWithUndo, editItem } = useCartItemActions()
const {
    getItemLineTotalCents,
    subtotalCents,
    pickupDiscountCents,
    deliveryFeeCents,
    deliveryUnavailableKey,
    couponDiscountCents,
    onlineFeeCents,
    payableCents,
    amountToDeliveryMinimumCents,
    switchToPickup,
    hasBreakdown,
    isMinimumReached,
} = useCartTotals()
// Keeps the server quote of the cart up to date (shared by every cart surface): its totals replace the client's maths once it answers.
// The side cart only exists from the `lg` breakpoint up (the parent hides it below): on a phone the drawer asks when it opens, so a cart change there costs no request.
const isDesktop = useMediaQuery('(min-width: 1024px)')
useOrderQuote({ active: isDesktop })

const lightboxRef = ref<InstanceType<typeof ImageLightbox> | null>(null)
const lightboxSrc = ref('')
const lightboxAlt = ref('')

const openLightbox = (id: string, name: string) => {
    lightboxSrc.value = productImage.productImageBase(config.public.s3bucketUrl, id, 'classic')
    lightboxAlt.value = name
    lightboxRef.value?.open()
}

const { handleProductImageError } = productImage
const productImageBase = (id?: string | null) => productImage.productImageBase(config.public.s3bucketUrl, id)
const itemImageElements = ref<HTMLImageElement[]>([])

// Flash-highlight for newly added items
const highlightedKey = ref<string | null>(null)
let highlightTimeout: NodeJS.Timeout | null = null

const getItemKey = (item: CartItem) => cartLineKey(item)
// Unique even if an old persisted cart still holds two lines that share a key.
const lineKeys = computed(() => cartLineKeys(cartStore.products))

const hasChoices = (item: CartItem): boolean =>
    (item.selectedChoices?.length ?? 0) > 0 || Boolean(item.selectedChoice)

const onCartItemAdded = (payload: { productId: string; choiceId?: string; selectionSignature?: string }) => {
    const key = `${payload.productId}-${payload.selectionSignature || payload.choiceId || 'none'}`
    highlightedKey.value = key
    if (highlightTimeout) clearTimeout(highlightTimeout)
    highlightTimeout = setTimeout(() => {
        highlightedKey.value = null
    }, 1500)
}

// Client only: the bus is a module singleton and SSR never disposes scopes.
// A server-side listener would pin every rendered request (heap leak, 2026-10).
if (import.meta.client) useEventBus(cartItemAddedKey).on(onCartItemAdded)

watch(itemImageElements, () => {
    itemImageElements.value.forEach((img) => productImage.ensureProductImageFallback(img))
}, { flush: 'post' })

onUnmounted(() => {
    if (highlightTimeout) clearTimeout(highlightTimeout)
})

// Delivery options setup. A takeaway-only brand (brand.deliveryEnabled false)
// keeps delivery visible but disabled ("available soon").
const collectionOptions = [
    {value: 'DELIVERY', label: t('cart.delivery'), icon: '/icons/moped-icon.svg', disabled: !deliveryEnabled},
    {value: 'PICKUP', label: t('cart.pickup'), icon: '/icons/shopping-bag-icon.svg', disabled: false}
];

const handleOrderType = (option: string) => {
    const from = cartStore.collectionOption
    cartStore.collectionOption = option as 'DELIVERY' | 'PICKUP';
    trackEvent('cart_collection_option_changed', { from, to: option })
};

const itemLabelParts = (item: CartItem) => orderItemLabelParts({
    code: item.product.code,
    categoryName: item.product.category?.name,
    productName: item.product.name,
})

const itemLabelMeta = (item: CartItem): string | undefined => {
    const parts = itemLabelParts(item)
    // The internal menu code ("E1") only shows for brands that print it.
    const meta = [showProductCode ? parts.code : null, parts.category].filter(Boolean).join('·')
    return meta || undefined
}

const itemLabelName = (item: CartItem): string => itemLabelParts(item).name

const itemChoice = (item: CartItem): string | undefined =>
    (item.selectedChoices?.length ?? 0) > 0
        ? (item.selectedChoices ?? [])
            .map((selection) => {
                const choice = item.product.choices.find((productChoice) => productChoice.id === selection.choiceId)
                if (!choice) return ''
                return selection.quantity > 1 ? `${choice.name} x${selection.quantity}` : choice.name
            })
            .filter(Boolean)
            .join(', ') || undefined
        : orderItemLabelParts({
            code: item.product.code,
            categoryName: item.product.category?.name,
            productName: item.product.name,
            choiceName: item.selectedChoice?.name,
        }).choice

// Cart actions
const handleIncrementQuantity = (cartItem: CartItem): void => {
    impact('Light')
    cartStore.incrementQuantity(cartItem.product, {
        choice: cartItem.selectedChoice,
        selections: cartItem.selectedChoices,
        quantity: cartItem.quantity,
    });
    trackEvent('product_quantity_incremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
};

// The "−" and the remove button share one flow with every other cart surface: the last unit going down is a removal, and every removal offers Undo.
const { decrementLine: handleDecrementQuantity } = useCartRemoval()

</script>
