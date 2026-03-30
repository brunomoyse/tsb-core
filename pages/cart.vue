<template>
    <div class="flex flex-col" :class="cartStore.products.length > 0 ? 'pb-24' : ''">

        <!-- ═══ HEADER ═══ -->
        <div class="px-4 pt-5 pb-2 flex items-baseline justify-between">
            <h1 class="text-2xl font-bold text-gray-900">{{ $t('cart.title') }}</h1>
            <span v-if="cartStore.totalItems > 0" class="text-sm text-gray-400 font-medium">
                {{ cartStore.totalItems }} {{ cartStore.totalItems === 1 ? $t('cart.item') : $t('cart.items') }}
            </span>
        </div>

        <!-- ═══ ITEMS LIST ═══ -->
        <div v-if="cartStore.products.length > 0" class="px-4 pb-6 space-y-2.5">
            <!-- Swipeable cart item wrapper -->
            <div
                v-for="item in cartStore.products"
                :key="`${item.product.id}-${item.selectedChoice?.id ?? 'none'}`"
                class="relative overflow-hidden rounded-2xl"
            >
                <!-- Delete action (revealed on swipe) -->
                <div class="absolute inset-y-0 right-0 flex items-center bg-red-500 rounded-2xl">
                    <button
                        class="h-full px-6 flex items-center justify-center text-white font-medium text-sm"
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
                    class="relative bg-white border border-gray-100 p-3 flex items-center gap-3 transition-transform duration-200 ease-out touch-pan-y"
                    :style="{ transform: `translateX(${getSwipeOffset(item)}px)` }"
                    @touchstart="onTouchStart($event, item)"
                    @touchmove="onTouchMove($event, item)"
                    @touchend="onTouchEnd(item)"
                >
                    <!-- IMAGE — square, rounded, no crop -->
                    <div class="w-[72px] h-[72px] shrink-0 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                        <picture>
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product.slug}.avif`"
                                type="image/avif"
                            />
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product.slug}.webp`"
                                type="image/webp"
                            />
                            <img
                                :src="`${config.public.s3bucketUrl}/images/thumbnails/${item.product.slug}.png`"
                                :alt="item.product.name"
                                class="w-full h-full object-contain p-1"
                                width="72"
                                height="72"
                                draggable="false"
                            />
                        </picture>
                    </div>

                    <!-- INFO + CONTROLS -->
                    <div class="flex-1 min-w-0">
                        <!-- Row 1: Name + Code -->
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="text-[15px] font-semibold text-gray-900 truncate leading-tight">
                                    <span v-if="item.product.code" class="text-gray-400 font-normal text-xs mr-1">{{ item.product.code }}</span>
                                    {{ item.product.name }}
                                </p>
                                <p class="text-xs text-gray-400 mt-0.5 truncate">
                                    {{ item.product.category.name }}
                                    <template v-if="item.selectedChoice">
                                        &middot; <span class="text-red-500">{{ item.selectedChoice.name }}</span>
                                    </template>
                                    <template v-if="item.product.pieceCount">
                                        &middot; {{ item.product.pieceCount }} {{ item.product.pieceCount === 1 ? $t('menu.pc') : $t('menu.pcs') }}
                                    </template>
                                </p>
                            </div>
                        </div>

                        <!-- Row 2: Price + Quantity stepper -->
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-[15px] font-bold text-gray-900">
                                {{ formatPrice(getItemUnitPrice(item) * item.quantity) }}
                            </span>

                            <!-- Stepper: compact pill -->
                            <div class="flex items-center gap-0 bg-gray-100 rounded-full">
                                <button
                                    :aria-label="$t('cart.decreaseQty')"
                                    class="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 active:bg-gray-200 transition-colors"
                                    @click="handleDecrementQuantity(item)"
                                >
                                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                </button>
                                <span class="w-7 text-center text-sm font-semibold text-gray-800 tabular-nums select-none">
                                    {{ item.quantity }}
                                </span>
                                <button
                                    :aria-label="$t('cart.increaseQty')"
                                    class="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 active:bg-gray-200 transition-colors"
                                    @click="handleIncrementQuantity(item)"
                                >
                                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- ═══ EXTRAS SUGGESTION ═══ -->
        <div v-if="cartStore.products.length > 0" class="px-4 pb-6">
            <CheckoutExtrasSuggestion />
        </div>

        <!-- ═══ FIXED BOTTOM CHECKOUT BAR ═══ -->
        <div
            v-if="cartStore.products.length > 0"
            class="fixed inset-x-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] p-4"
            :style="{ bottom: isCapacitor ? 'var(--cap-tab-clearance, 0px)' : '0' }"
        >
            <NuxtLinkLocale
                to="checkout"
                class="flex items-center justify-between w-full bg-red-500 hover:bg-red-600 text-white py-3.5 px-5 rounded-2xl active:scale-[0.98] transition-all"
            >
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    <span class="font-semibold text-sm uppercase tracking-wide">{{ $t('cart.checkout') }}</span>
                </div>
                <span class="font-bold text-base">{{ formatPrice(cartStore.totalPrice) }}</span>
            </NuxtLinkLocale>
            <div v-if="!isCapacitor" class="safe-area-spacer-bottom" />
        </div>

        <!-- ═══ EMPTY STATE ═══ -->
        <div v-else class="flex-1 flex flex-col items-center justify-center px-8">
            <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                <svg class="w-9 h-9 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
            </div>
            <p class="text-lg font-semibold text-gray-800 mb-1">{{ $t('cart.empty') }}</p>
            <p class="text-sm text-gray-400 text-center mb-6">{{ $t('cart.emptyHint', 'Browse the menu to add your favorites') }}</p>
            <NuxtLinkLocale
                to="/menu"
                class="px-8 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold active:scale-[0.97] transition-transform"
            >
                {{ $t('nav.menu') }}
            </NuxtLinkLocale>
        </div>

    </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import type { CartItem } from '@/types'
import { formatPrice } from '~/lib/price'
import { useCartStore } from '@/stores/cart'
import { useHaptics } from '~/composables/useHaptics'
import { usePlatform } from '~/composables/usePlatform'
import { useRuntimeConfig } from '#imports'
import { useTracking } from '~/composables/useTracking'
import CheckoutExtrasSuggestion from '~/components/checkout/CheckoutExtrasSuggestion.vue'

definePageMeta({ public: true })

const config = useRuntimeConfig()
const cartStore = useCartStore()
const { isCapacitor } = usePlatform()
const { impact: hapticImpact } = useHaptics()
const { trackEvent } = useTracking()

const getItemUnitPrice = (item: CartItem): number =>
    Number(item.product.price) +
    (item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0)

const handleIncrementQuantity = (cartItem: CartItem): void => {
    cartStore.incrementQuantity(cartItem.product, cartItem.selectedChoice)
    hapticImpact('Light')
    trackEvent('product_quantity_incremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
}

const handleDecrementQuantity = (cartItem: CartItem): void => {
    cartStore.decrementQuantity(cartItem.product, cartItem.selectedChoice)
    hapticImpact('Light')
    trackEvent('product_quantity_decremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
}

const handleRemoveItem = (cartItem: CartItem): void => {
    cartStore.removeFromCart(cartItem.product, cartItem.selectedChoice)
    hapticImpact('Medium')
    trackEvent('product_removed_from_cart', { product_id: cartItem.product.id })
}

// Swipe-to-delete state
const SWIPE_THRESHOLD = 72
const swipeState = reactive<Record<string, { startX: number; currentX: number; swiping: boolean; open: boolean }>>({})
const swipingItemKey = ref<string | null>(null)

const getItemKey = (item: CartItem) => `${item.product.id}-${item.selectedChoice?.id ?? 'none'}`

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
