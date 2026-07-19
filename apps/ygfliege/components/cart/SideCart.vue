<template>
    <aside
        data-testid="side-cart"
        class="
            bg-ygf-cream
            rounded-l-[var(--radius-lg)]
            flex
            flex-col
            divide-y
            divide-ygf-gray-200
            max-h-[calc(100vh-32px)]
            overflow-y-auto
            mt-4
         "
    >
        <!-- Header with Toggle -->
        <header class="px-4 py-5 flex items-center justify-between gap-4">
            <h2 class="text-xl font-bold text-ygf-black">
                {{ $t('cart.title') }}
            </h2>
            <div class="flex gap-1 rounded-[var(--radius-btn)] bg-ygf-white border border-ygf-gray-200 p-1">
                <button v-for="option in collectionOptions" :key="option.value"
                        :data-testid="option.value === 'DELIVERY' ? 'cart-option-delivery' : 'cart-option-pickup'"
                        :disabled="option.disabled"
                        :title="option.disabled ? `${option.label} — ${$t('delivery.comingSoon')}` : option.label"
                        :aria-label="option.disabled ? `${option.label} — ${$t('delivery.comingSoon')}` : option.label"
                        :class="[
          'chip text-sm transition-all',
          option.disabled ? 'opacity-40 cursor-not-allowed' : '',
          cartStore.collectionOption === option.value
            ? 'chip-selected'
            : ''
        ]"
                        @click="handleOrderType(option.value)">
                    <img :alt="option.label" :src="option.icon" class="w-5 h-5"/>
                    <span v-if="cartStore.collectionOption === option.value">{{ option.label }}</span>
                </button>
            </div>
        </header>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <p v-if="cartStore.products.length === 0" class="text-ygf-gray-400 text-center py-8">
                {{ $t('cart.empty') }}
            </p>
            <div v-else class="space-y-4">
                <div v-for="item in cartStore.products" :key="getItemKey(item)"
                     data-testid="cart-item"
                     class="card group relative grid grid-cols-[auto_1fr] gap-4 p-3"
                     :class="{ 'card-selected': highlightedKey === getItemKey(item) }">
                    <!-- Product Image -->
                    <div
                        class="w-12 h-12 rounded-[var(--radius-md)] overflow-hidden bg-ygf-gray-100 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
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
                                <p v-if="itemLabelMeta(item)" class="text-xs text-ygf-gray-400 truncate">
                                    {{ itemLabelMeta(item) }}
                                </p>
                                <h3 class="text-sm font-medium text-ygf-black leading-snug line-clamp-2">
                                    {{ itemLabelName(item) }}
                                </h3>
                                <span v-if="itemChoice(item)" class="text-xs text-ygf-orange-text">
                                    ({{ itemChoice(item) }})
                                </span>
                                <span v-if="item.product.pieceCount" class="text-xs text-ygf-gray-400">
                                    {{ item.product.pieceCount }}
                                    {{ item.product.pieceCount === 1 ? $t('menu.pc') : $t('menu.pcs') }}
                                </span>
                            </div>
                            <span class="text-sm font-medium whitespace-nowrap flex-shrink-0 self-start text-ygf-black">
                                {{ formatPrice(getItemUnitPrice(item) * item.quantity) }}
                            </span>
                        </div>

                        <!-- Quantity Controls and Remove -->
                        <div class="flex items-center justify-between mt-auto">
                            <div class="stepper">
                                <button data-testid="cart-item-decrement"
                                        class="stepper-btn"
                                        :disabled="hasChoices(item)"
                                        :title="hasChoices(item) ? t('cart.customizedItemHint') : undefined"
                                        @click="handleDecrementQuantity(item)">
                                    <span class="sr-only">{{ $t('cart.decreaseQty') }}</span>
                                    −
                                </button>
                                <span data-testid="cart-item-quantity" class="stepper-value">{{ item.quantity }}</span>
                                <button data-testid="cart-item-increment"
                                        class="stepper-btn"
                                        :disabled="hasChoices(item)"
                                        :title="hasChoices(item) ? t('cart.customizedItemHint') : undefined"
                                        @click="handleIncrementQuantity(item)">
                                    <span class="sr-only">{{ $t('cart.increaseQty') }}</span>
                                    +
                                </button>
                            </div>
                            <button data-testid="cart-item-remove" class="btn-link text-xs"
                                    @click="handleRemoveFromCart(item)">
                                {{ $t('cart.removeItem') }}
                            </button>
                        </div>
                        <p v-if="hasChoices(item)" class="text-[11px] text-ygf-gray-400 italic mt-1">
                            {{ $t('cart.customizedItemHint') }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="p-4 space-y-4 flex-none">
            <!-- Price Breakdown -->
            <div class="space-y-2">
                <div v-if="hasBreakdown" class="flex justify-between items-center text-sm text-ygf-gray-600">
                    <span>{{ $t('cart.subtotal') }}:</span>
                    <span class="tabular-nums">{{ formatPrice(subtotal) }}</span>
                </div>
                <div v-if="cartStore.collectionOption === 'DELIVERY'" class="flex justify-between items-center text-sm text-ygf-gray-600">
                    <span>{{ $t('cart.deliveryFee') }}:</span>
                    <span v-if="!cartStore.address?.distance" class="text-ygf-gray-400 italic text-xs">
                        {{ $t('cart.deliveryTbd') }}
                    </span>
                    <span v-else-if="deliveryFee === -1" class="text-ygf-red font-medium text-xs">
                        {{ $t('checkout.tooFar') }}
                    </span>
                    <span v-else-if="deliveryFee === 0" class="chip chip-static bg-ygf-orange-bg text-ygf-orange-text text-[11px]">
                        {{ $t('checkout.free') }}
                    </span>
                    <span v-else class="tabular-nums">{{ formatPrice(deliveryFee) }}</span>
                </div>
                <div v-if="pickupDiscount > 0" class="flex justify-between items-center text-sm text-ygf-success">
                    <span>{{ $t('cart.pickupDiscount') }}:</span>
                    <span class="tabular-nums">-{{ formatPrice(pickupDiscount) }}</span>
                </div>
                <div v-if="couponDiscount > 0" class="flex justify-between items-center text-sm text-ygf-orange-text">
                    <span>{{ $t('coupon.discount') }}<span v-if="cartStore.couponCode"> ({{ cartStore.couponCode }})</span>:</span>
                    <span class="tabular-nums">-{{ formatPrice(couponDiscount) }}</span>
                </div>
                <div class="flex justify-between items-center text-lg font-medium border-t border-ygf-gray-200 pt-2 text-ygf-black">
                    <span>{{ $t('cart.total') }}:</span>
                    <span data-testid="cart-total" class="tabular-nums">{{ formatPrice(displayTotal) }}</span>
                </div>
            </div>

            <!-- Minimum Order Warning (delivery only — pickup has no minimum) -->
            <div v-if="!isMinimumReached" data-testid="cart-minimum-warning" class="text-sm text-ygf-orange-text text-center">
                {{ $t('cart.minimumDelivery', { amount: 25}) }}
            </div>

            <!-- Ordering Unavailable Warning -->
            <div v-if="!isOrderingAvailable" class="text-sm text-ygf-red text-center">
                {{ $t('cart.orderingUnavailable') }}
            </div>

            <!-- Checkout Button -->
            <NuxtLinkLocale
                to="checkout"
                data-testid="cart-checkout-link"
                :class="[
                    'btn block text-center',
                    isMinimumReached && isOrderingAvailable
                      ? 'btn-primary'
                      : 'opacity-45 pointer-events-none'
                ]"
                :tabindex="isMinimumReached && isOrderingAvailable ? 0 : -1"
                :aria-disabled="!isMinimumReached || !isOrderingAvailable"
            >
                {{ $t('cart.checkout') }}
            </NuxtLinkLocale>
        </footer>
    </aside>
    <ImageLightbox ref="lightboxRef" :src="lightboxSrc" :alt="lightboxAlt" />
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { onUnmounted, ref, useAppConfig, useRuntimeConfig, watch } from '#imports'
import type { CartItem } from '#engine/types'
import ImageLightbox from '~/components/ImageLightbox.vue' // eslint-disable-line typescript-eslint/consistent-type-imports
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatPrice } from '#engine/lib/price'
import { orderItemLabelParts } from '#engine/utils/orderItemLabel'
import { useCartStore } from '#engine/stores/cart'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useEventBus } from '@vueuse/core'
import { useHaptics } from '#engine/composables/useHaptics'
import { useI18n } from 'vue-i18n'
import { useTracking } from '#engine/composables/useTracking'


const { isOrderingAvailable = true } = defineProps<{ isOrderingAvailable?: boolean }>()

const config = useRuntimeConfig();
const cartStore = useCartStore();
const { impact } = useHaptics()
const {t} = useI18n()
const { trackEvent } = useTracking()
const {
    getItemUnitPrice,
    subtotal,
    pickupDiscount,
    deliveryFee,
    couponDiscount,
    displayTotal,
    hasBreakdown,
    isMinimumReached,
} = useCartTotals()

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

const toSelectionSignature = (item: CartItem): string =>
    (item.selectedChoices ?? [])
        .map((selection) => `${selection.groupId}:${selection.choiceId}:${selection.quantity}`)
        .sort()
        .join('|')

const getItemKey = (item: CartItem) => `${item.product.id}-${toSelectionSignature(item) || (item.selectedChoice?.id ?? 'none')}`

const hasChoices = (item: CartItem): boolean =>
    (item.selectedChoices?.length ?? 0) > 0 || Boolean(item.selectedChoice)

const onCartItemAdded = (payload: { productId: string; choiceId?: string; selectionSignature?: string }) => {
    const key = `${payload.productId}-${payload.selectionSignature ?? payload.choiceId ?? 'none'}`
    highlightedKey.value = key
    if (highlightTimeout) clearTimeout(highlightTimeout)
    highlightTimeout = setTimeout(() => {
        highlightedKey.value = null
    }, 1500)
}

// SSR-safe: VueUse useEventBus auto-cleans via tryOnScopeDispose
useEventBus(cartItemAddedKey).on(onCartItemAdded)

watch(itemImageElements, () => {
    itemImageElements.value.forEach((img) => productImage.ensureProductImageFallback(img))
}, { flush: 'post' })

onUnmounted(() => {
    if (highlightTimeout) clearTimeout(highlightTimeout)
})

// Delivery options setup. Takeaway-only launch: delivery stays visible but
// disabled ("available soon") while brand.deliveryEnabled is false.
const deliveryEnabled = useAppConfig().brand.deliveryEnabled !== false
const collectionOptions = [
    {value: 'DELIVERY', label: t('cart.delivery'), icon: '/icons/moped-icon.svg', disabled: !deliveryEnabled},
    {value: 'PICKUP', label: t('cart.pickup'), icon: '/icons/shopping-bag-icon.svg', disabled: false}
];

const handleOrderType = (option: string) => {
    if (option === 'DELIVERY' && !deliveryEnabled) return
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
    // Category name only: the internal menu code ("E1") read like debug
    // output next to the product name.
    return itemLabelParts(item).category || undefined
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
    });
    trackEvent('product_quantity_incremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
};

const handleDecrementQuantity = (cartItem: CartItem): void => {
    impact('Light')
    cartStore.decrementQuantity(cartItem.product, {
        choice: cartItem.selectedChoice,
        selections: cartItem.selectedChoices,
    });
    trackEvent('product_quantity_decremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
};

const handleRemoveFromCart = (cartItem: CartItem): void => {
    trackEvent('product_removed_from_cart', { product_id: cartItem.product.id, product_name: cartItem.product.name })
    cartStore.removeFromCart(cartItem.product, {
        choice: cartItem.selectedChoice,
        selections: cartItem.selectedChoices,
    });
};

</script>
