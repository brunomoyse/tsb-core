<template>
    <div class="flex flex-col">

        <!-- ═══ CHECKOUT BAR (sticky top — always visible) ═══ -->
        <div
            v-if="cartStore.products.length > 0"
            class="sticky top-0 z-10 bg-tsb-one/95 backdrop-blur-md border-b border-gray-200/60"
        >
            <div class="px-4 py-3">
                <NuxtLinkLocale
                    to="checkout"
                    class="flex items-center justify-between w-full bg-gray-900 text-white py-3.5 px-5 rounded-2xl active:scale-[0.98] transition-transform"
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
            </div>
        </div>

        <!-- ═══ HEADER ═══ -->
        <div class="px-4 pt-5 pb-2 flex items-baseline justify-between">
            <h1 class="text-2xl font-bold text-gray-900">{{ $t('cart.title') }}</h1>
            <span v-if="cartStore.totalItems > 0" class="text-sm text-gray-400 font-medium">
                {{ cartStore.totalItems }} {{ cartStore.totalItems === 1 ? $t('cart.item') : $t('cart.items') }}
            </span>
        </div>

        <!-- ═══ ITEMS LIST ═══ -->
        <div v-if="cartStore.products.length > 0" class="px-4 pb-6 space-y-2.5">
            <div
                v-for="item in cartStore.products"
                :key="`${item.product.id}-${item.selectedChoice?.id ?? 'none'}`"
                class="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3"
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

            <!-- ADD MORE -->
            <NuxtLinkLocale
                to="/menu"
                class="flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {{ $t('cart.addMore', 'Add more items') }}
            </NuxtLinkLocale>
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
import type { CartItem } from '@/types'
import { formatPrice } from '~/lib/price'
import { useCartStore } from '@/stores/cart'
import { useRuntimeConfig } from '#imports'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: true })

const config = useRuntimeConfig()
const cartStore = useCartStore()
const { trackEvent } = useTracking()

const getItemUnitPrice = (item: CartItem): number =>
    Number(item.product.price) +
    (item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0)

const handleIncrementQuantity = (cartItem: CartItem): void => {
    cartStore.incrementQuantity(cartItem.product, cartItem.selectedChoice)
    trackEvent('product_quantity_incremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
}

const handleDecrementQuantity = (cartItem: CartItem): void => {
    cartStore.decrementQuantity(cartItem.product, cartItem.selectedChoice)
    trackEvent('product_quantity_decremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
}
</script>
