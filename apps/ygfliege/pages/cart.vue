<template>
    <div class="flex flex-col" :class="cartPageMinHeightClass">

        <!-- ═══ HEADER ═══ -->
        <div class="px-4 pt-5 pb-2 flex items-baseline justify-between">
            <h1 class="text-2xl font-bold text-ygf-black">{{ $t('cart.title') }}</h1>
            <span v-if="cartStore.totalItems > 0" class="text-sm text-ygf-gray-400 font-medium">
                {{ cartStore.totalItems }} {{ cartStore.totalItems === 1 ? $t('cart.item') : $t('cart.items') }}
            </span>
        </div>

        <!-- ═══ ITEMS LIST ═══ -->
        <div v-if="cartStore.products.length > 0" class="px-4 pb-4 space-y-2">
            <!-- Swipeable cart item wrapper -->
            <div
                v-for="item in cartStore.products"
                :key="getItemKey(item)"
                class="relative overflow-hidden rounded-[var(--radius-lg)]"
            >
                <!-- Delete action (revealed on swipe) -->
                <div class="absolute inset-y-0 right-0 flex items-center bg-ygf-red rounded-[var(--radius-lg)]">
                    <button
                        type="button"
                        :aria-label="$t('cart.removeItem')"
                        class="h-full px-6 flex items-center justify-center text-ygf-white font-medium text-sm"
                        @click="handleRemoveItem(item)"
                    >
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>

                <!-- Card content (slides on swipe) -->
                <div
                    class="card relative px-3 py-2.5 flex items-center gap-3 transition-transform duration-200 ease-out touch-pan-y"
                    :style="{ transform: `translateX(${getSwipeOffset(item)}px)` }"
                    @touchstart="onTouchStart($event, item)"
                    @touchmove="onTouchMove($event, item)"
                    @touchend="onTouchEnd(item)"
                >
                    <!-- IMAGE — square, rounded, no crop -->
                    <div class="w-[68px] h-[68px] shrink-0 rounded-[var(--radius-lg)] bg-ygf-gray-100 flex items-center justify-center overflow-hidden">
                        <picture>
                            <source
                                :srcset="`${productImageBase(item.product.slug)}.avif`"
                                type="image/avif"
                            />
                            <source
                                :srcset="`${productImageBase(item.product.slug)}.webp`"
                                type="image/webp"
                            />
                            <img
                                ref="itemImageElements"
                                :src="`${productImageBase(item.product.slug)}.png`"
                                :alt="item.product.name"
                                class="w-full h-full object-contain p-1"
                                width="68"
                                height="68"
                                draggable="false"
                                @error="handleProductImageError"
                            />
                        </picture>
                    </div>

                    <!-- INFO + CONTROLS -->
                    <div class="flex-1 min-w-0">
                        <!-- Row 1: Metadata (small, gray, truncated) -->
                        <p v-if="itemLabelMeta(item)" class="text-[11px] text-ygf-gray-400 truncate leading-tight mb-0.5">
                            {{ itemLabelMeta(item) }}
                        </p>

                        <!-- Row 2: Product name (bold, wraps up to 2 lines) -->
                        <p class="text-[15px] font-semibold text-ygf-black leading-tight line-clamp-2 pr-1">
                            {{ itemLabelName(item) }}
                        </p>

                        <!-- Row 3: Choice (orange text) -->
                        <p v-if="itemChoice(item)" class="text-xs text-ygf-orange-text mt-0.5 truncate">
                            ({{ itemChoice(item) }})
                        </p>

                        <!-- Row 4: Price + Quantity stepper + remove -->
                        <div class="flex items-center justify-between mt-1.5 gap-2">
                            <div class="min-w-0 flex flex-col leading-tight">
                                <span class="text-[15px] font-bold text-ygf-black tabular-nums">
                                    {{ formatPrice(getItemUnitPrice(item) * item.quantity) }}
                                </span>
                                <span v-if="item.quantity > 1" class="text-[11px] text-ygf-gray-400 tabular-nums">
                                    {{ item.quantity }} × {{ formatPrice(getItemUnitPrice(item)) }}
                                </span>
                            </div>

                            <div class="flex items-center gap-1">
                                <!-- Stepper: compact pill -->
                                <div class="stepper">
                                    <button
                                        type="button"
                                        :aria-label="$t('cart.decreaseQty')"
                                        class="stepper-btn"
                                        @click="handleDecrementQuantity(item)"
                                    >
                                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                            <line x1="5" y1="12" x2="19" y2="12"/>
                                        </svg>
                                    </button>
                                    <span class="stepper-value">
                                        {{ item.quantity }}
                                    </span>
                                    <button
                                        type="button"
                                        :aria-label="$t('cart.increaseQty')"
                                        class="stepper-btn"
                                        @click="handleIncrementQuantity(item)"
                                    >
                                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                            <line x1="12" y1="5" x2="12" y2="19"/>
                                            <line x1="5" y1="12" x2="19" y2="12"/>
                                        </svg>
                                    </button>
                                </div>

                                <!-- Explicit remove -->
                                <button
                                    type="button"
                                    :aria-label="$t('cart.removeItem')"
                                    class="w-11 h-11 flex items-center justify-center rounded-full text-ygf-gray-400 hover:text-ygf-orange-text hover:bg-ygf-orange-bg active:bg-ygf-orange-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2"
                                    @click="handleRemoveItem(item)"
                                >
                                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- ═══ ORDER SUMMARY ═══ -->
        <div v-if="cartStore.products.length > 0" class="px-4 pb-4">
            <div class="card rounded-[var(--radius-lg)] px-4 py-3 space-y-1 text-sm">
                <div v-if="hasBreakdown" class="flex justify-between text-ygf-gray-600">
                    <span>{{ $t('cart.subtotal') }}</span>
                    <span class="tabular-nums">{{ formatPrice(subtotal) }}</span>
                </div>
                <div v-if="cartStore.collectionOption === 'DELIVERY'" class="flex justify-between text-ygf-gray-600">
                    <span>{{ $t('cart.deliveryFee') }}</span>
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
                <div v-if="pickupDiscount > 0" class="flex justify-between text-ygf-success">
                    <span>{{ $t('cart.pickupDiscount') }}</span>
                    <span class="tabular-nums">-{{ formatPrice(pickupDiscount) }}</span>
                </div>
                <div v-if="cartStore.couponDiscount > 0" class="flex justify-between text-ygf-orange-text">
                    <span>{{ $t('coupon.discount') }}<span v-if="cartStore.couponCode"> ({{ cartStore.couponCode }})</span></span>
                    <span class="tabular-nums">-{{ formatPrice(cartStore.couponDiscount) }}</span>
                </div>
                <div class="flex justify-between items-baseline pt-2 mt-1 border-t border-ygf-gray-200 text-ygf-black">
                    <span class="font-bold">{{ $t('cart.total') }}</span>
                    <span class="font-bold text-lg tabular-nums">{{ formatPrice(displayTotal) }}</span>
                </div>
            </div>
        </div>

        <!-- Spacer pushes checkout bar to the bottom -->
        <div v-if="cartStore.products.length > 0" class="flex-1" />

        <!-- ═══ BOTTOM CHECKOUT BAR ═══ -->
        <div
            v-if="cartStore.products.length > 0"
            class="sticky bottom-0 z-30 bg-ygf-white border-t border-ygf-gray-200 shadow-ygf-md p-4"
        >
            <NuxtLinkLocale
                to="checkout"
                :class="[
                    'btn flex min-h-11 items-center justify-between w-full active:scale-[0.98] transition-all rounded-[var(--radius-lg)]',
                    isCheckoutAvailable
                        ? 'btn-primary'
                        : 'opacity-45 pointer-events-none'
                ]"
                :tabindex="isCheckoutAvailable ? 0 : -1"
                :aria-disabled="!isCheckoutAvailable"
            >
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    <span class="text-sm uppercase tracking-wide">{{ $t('cart.checkout') }}</span>
                </div>
                <span class="font-bold text-base tabular-nums">{{ formatPrice(displayTotal) }}</span>
            </NuxtLinkLocale>
            <p v-if="!isCheckoutAvailable" class="mt-2 text-center text-sm text-ygf-red">
                {{ $t('cart.orderingUnavailable') }}
            </p>
            <div class="safe-area-spacer-bottom" />
        </div>

        <!-- ═══ EMPTY STATE ═══ -->
        <div v-else data-testid="cart-empty" class="flex-1 flex flex-col items-center justify-center px-8">
            <div class="w-20 h-20 rounded-full bg-ygf-gray-100 flex items-center justify-center mb-5">
                <svg class="w-9 h-9 text-ygf-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
            </div>
            <p class="text-lg font-semibold text-ygf-black mb-1">{{ $t('cart.empty') }}</p>
            <p class="text-sm text-ygf-gray-400 text-center mb-6">{{ $t('cart.emptyHint', 'Browse the menu to add your favorites') }}</p>
            <NuxtLinkLocale
                to="/menu"
                class="btn btn-primary rounded-[var(--radius-lg)]"
            >
                {{ $t('nav.menu') }}
            </NuxtLinkLocale>
        </div>

    </div>
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import type { CartItem, ProductChoice, ProductChoiceSelection } from '#engine/types'
import { computed, reactive, ref } from 'vue'
import { formatPrice } from '#engine/lib/price'
import { orderItemLabelParts } from '#engine/utils/orderItemLabel'
import { useCartStore } from '#engine/stores/cart'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useHaptics } from '#engine/composables/useHaptics'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useRestaurantConfig } from '#engine/composables/useRestaurantConfig'
import { useRuntimeConfig } from '#imports'
import { useTracking } from '#engine/composables/useTracking'

definePageMeta({ public: true })

const config = useRuntimeConfig()
const cartStore = useCartStore()
const notifications = useNotificationsStore()
const { impact: hapticImpact } = useHaptics()
const { trackEvent } = useTracking()
const { t } = useI18n()
const { handleProductImageError } = productImage
const productImageBase = (slug?: string | null) => productImage.productImageBase(config.public.s3bucketUrl, slug)
const itemImageElements = ref<HTMLImageElement[]>([])
const { config: restaurantConfig } = await useRestaurantConfig()
const {
    getItemUnitPrice,
    subtotal,
    pickupDiscount,
    deliveryFee,
    couponDiscount,
    displayTotal,
    hasBreakdown,
} = useCartTotals()
const isCheckoutAvailable = computed(() => {
    const orderingEnabled = restaurantConfig.value?.restaurantConfig?.orderingEnabled ?? false
    const isOrderingCurrentlyOpen = restaurantConfig.value?.restaurantConfig?.isOrderingCurrentlyOpen ?? false
    return orderingEnabled && isOrderingCurrentlyOpen
})

watch(itemImageElements, () => {
    itemImageElements.value.forEach((img) => productImage.ensureProductImageFallback(img))
}, { flush: 'post' })

const cartPageMinHeightClass = 'min-h-[100dvh]'

const itemLabelParts = (item: CartItem) => orderItemLabelParts({
    code: item.product.code,
    categoryName: item.product.category?.name,
    productName: item.product.name,
})

const itemLabelMeta = (item: CartItem): string | undefined => {
    const parts = itemLabelParts(item)
    const bits: string[] = []
    if (parts.code) bits.push(parts.code)
    if (parts.category) bits.push(parts.category)
    if (item.product.pieceCount) {
        const suffix = item.product.pieceCount === 1 ? t('menu.pc') : t('menu.pcs')
        bits.push(`${item.product.pieceCount} ${suffix}`)
    }
    return bits.length > 0 ? bits.join(' · ') : undefined
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

// ── Cart mutations with undo support
const restoreItem = (item: {
    product: CartItem['product'];
    choice: ProductChoice | null;
    selections: ProductChoiceSelection[];
    quantity: number;
}): void => {
    cartStore.addProduct(item.product, item.quantity, {
        choice: item.choice,
        selections: item.selections,
    })
    hapticImpact('Light')
    trackEvent('product_removal_undone', { product_id: item.product.id, quantity: item.quantity })
}

const emitRemoveUndoToast = (item: CartItem): void => {
    const { product, selectedChoice, selectedChoices, quantity } = item
    notifications.notify({
        message: t('cart.removedUndo', { name: product.name }),
        duration: 4000,
        variant: 'neutral',
        action: {
            label: t('cart.undo'),
            handler: () => restoreItem({
                product,
                choice: selectedChoice,
                selections: selectedChoices,
                quantity,
            }),
        },
    })
}

const handleIncrementQuantity = (cartItem: CartItem): void => {
    cartStore.incrementQuantity(cartItem.product, {
        choice: cartItem.selectedChoice,
        selections: cartItem.selectedChoices,
    })
    hapticImpact('Light')
    trackEvent('product_quantity_incremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
}

const handleDecrementQuantity = (cartItem: CartItem): void => {
    if (cartItem.quantity === 1) {
        // Route decrement-to-zero through the remove-with-undo path
        handleRemoveItem(cartItem)
        return
    }
    cartStore.decrementQuantity(cartItem.product, {
        choice: cartItem.selectedChoice,
        selections: cartItem.selectedChoices,
    })
    hapticImpact('Light')
    trackEvent('product_quantity_decremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
}

const handleRemoveItem = (cartItem: CartItem): void => {
    // Snapshot before removal so undo can restore the exact quantity
    emitRemoveUndoToast(cartItem)
    cartStore.removeFromCart(cartItem.product, {
        choice: cartItem.selectedChoice,
        selections: cartItem.selectedChoices,
    })
    hapticImpact('Medium')
    trackEvent('product_removed_from_cart', { product_id: cartItem.product.id })
}

// ── Swipe-to-delete state
const SWIPE_THRESHOLD = 72
const swipeState = reactive<Record<string, { startX: number; currentX: number; swiping: boolean; open: boolean }>>({})
const swipingItemKey = ref<string | null>(null)

const getItemKey = (item: CartItem) => {
    const signature = (item.selectedChoices ?? [])
        .map((selection) => `${selection.groupId}:${selection.choiceId}:${selection.quantity}`)
        .sort()
        .join('|')
    return `${item.product.id}-${signature || (item.selectedChoice?.id ?? 'none')}`
}

const getSwipeOffset = (item: CartItem) => {
    const key = getItemKey(item)
    const state = swipeState[key]
    if (!state) return 0
    if (state.open) return -SWIPE_THRESHOLD
    if (!state.swiping) return 0
    const delta = state.currentX - state.startX
    return Math.min(0, Math.max(-SWIPE_THRESHOLD, delta))
}

const onTouchStart = (e: TouchEvent, item: CartItem) => {
    const key = getItemKey(item)
    // Close any other open swipe
    if (swipingItemKey.value && swipingItemKey.value !== key && swipeState[swipingItemKey.value]) {
        swipeState[swipingItemKey.value]!.open = false
    }
    const touch = e.touches[0]!
    swipeState[key] = {
        startX: touch.clientX,
        currentX: touch.clientX,
        swiping: false,
        open: swipeState[key]?.open ?? false,
    }
    if (swipeState[key]!.open) {
        swipeState[key]!.startX = touch.clientX - (-SWIPE_THRESHOLD)
    }
    swipingItemKey.value = key
}

const onTouchMove = (e: TouchEvent, item: CartItem) => {
    const key = getItemKey(item)
    const state = swipeState[key]
    if (!state) return
    const touch = e.touches[0]!
    state.currentX = touch.clientX
    state.swiping = true
}

const onTouchEnd = (item: CartItem) => {
    const key = getItemKey(item)
    const state = swipeState[key]
    if (!state) return
    const delta = state.currentX - state.startX
    state.swiping = false
    if (delta < -SWIPE_THRESHOLD / 2) {
        state.open = true
        hapticImpact('Light')
    } else {
        state.open = false
    }
}
</script>
