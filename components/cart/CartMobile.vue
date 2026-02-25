<template>
    <div class="lg:hidden">
        <!-- Backdrop -->
        <Transition name="fade">
            <div
                v-if="cartStore.isCartVisible"
                class="fixed inset-0 bg-black/30 z-30"
                @click="cartStore.toggleCartVisibility"
            />
        </Transition>

        <!-- Cart Panel -->
        <Transition name="slide-up">
            <aside
                v-if="cartStore.isCartVisible"
                aria-labelledby="cart-heading"
                class="fixed bottom-0 inset-x-0 bg-tsb-one z-40 flex flex-col max-h-[85vh] rounded-t-2xl shadow-2xl"
            >
            <!-- Drag Handle -->
            <div class="flex justify-center pt-3 pb-1">
                <div class="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <!-- HEADER -->
            <header class="flex items-center justify-between px-4 pb-3 border-b border-gray-200">
                <h2 id="cart-heading" class="text-xl font-semibold text-gray-800">
                    {{ $t('cart.title') }}
                </h2>
                <button
                    :aria-label="$t('cart.closeCart')"
                    class="p-2 rounded-full hover:bg-gray-100"
                    @click="cartStore.toggleCartVisibility"
                >
                    <svg class="h-6 w-6 text-gray-700" fill="none" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </header>

            <!-- ITEMS LIST -->
            <ul class="flex-1 overflow-y-auto p-4 space-y-3">
                <li
                    v-for="item in cartStore.products"
                    :key="`${item.product.id}-${item.selectedChoice?.id ?? 'none'}`"
                    class="grid grid-cols-6 gap-3 bg-white rounded-lg shadow p-3 items-center"
                >
                    <!-- IMAGE -->
                    <picture class="col-span-1 flex items-center justify-center w-16 h-16 bg-gray-50 rounded-md overflow-hidden">
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
                            class="object-cover w-full h-full"
                            width="64"
                            height="64"
                            draggable="false"
                        />
                    </picture>

                    <!-- PRODUCT INFO -->
                    <div class="col-span-3 flex flex-col justify-center text-sm">
                        <span class="font-medium text-gray-800">{{ item.product.name }}</span>
                        <span class="text-gray-500">{{ item.product.category.name }}</span>
                        <span v-if="item.selectedChoice" class="text-xs text-red-600">
                            {{ item.selectedChoice.name }}
                        </span>
                        <span
                            v-if="item.product.pieceCount"
                            class="text-gray-500 text-xs mt-1"
                        >
                          {{ item.product.pieceCount }}
                          {{ item.product.pieceCount === 1 ? $t('menu.pc') : $t('menu.pcs') }}
                        </span>
                        <span class="text-gray-800 font-medium text-xs mt-1">
                            {{ formatPrice(getItemUnitPrice(item) * item.quantity) }}
                        </span>
                    </div>

                    <!-- QTY CONTROLS -->
                    <div class="col-span-2 grid grid-cols-3 items-center">
                        <button
                            :aria-label="$t('cart.decreaseQty')"
                            class="p-1 bg-gray-200 rounded-full hover:bg-gray-300 flex items-center justify-center h-10 w-10"
                            @click="handleDecrementQuantity(item)"
                        >
                            <img
                                src="/icons/minus-icon.svg"
                                alt="Minus icon"
                                class="h-4 w-4 flex-shrink-0"
                            />
                        </button>
                        <span class="text-center text-gray-700">{{ item.quantity }}</span>
                        <button
                            :aria-label="$t('cart.increaseQty')"
                            class="p-1 bg-gray-200 rounded-full hover:bg-gray-300 flex items-center justify-center h-10 w-10"
                            @click="handleIncrementQuantity(item)"
                        >
                            <img
                                src="/icons/plus-icon.svg"
                                alt="Plus icon"
                                class="h-4 w-4 flex-shrink-0"
                            />
                        </button>
                    </div>
                </li>

                <!-- EMPTY STATE -->
                <li v-if="cartStore.products.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-500">
                    <img
                        src="/icons/shopping-bag-icon.svg"
                        alt="Empty cart"
                        class="h-12 w-12 mb-4 flex-shrink-0"
                    />
                    <p>{{ $t('cart.empty') }}</p>
                </li>
            </ul>

            <!-- FOOTER: TOTAL + CHECKOUT -->
            <footer v-if="cartStore.products.length" class="p-4 border-t border-gray-200 bg-white rounded-b-none">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-sm font-medium text-gray-700">{{ $t('cart.total') }}:</span>
                    <span class="text-lg font-semibold text-gray-900">{{ formatPrice(cartStore.totalPrice) }}</span>
                </div>
                <NuxtLinkLocale
                    to="checkout"
                    class="block text-center bg-gray-800 text-white uppercase py-3 rounded-lg hover:bg-gray-900 transition-all active:scale-[0.97]"
                >
                    {{ $t('cart.checkout') }}
                </NuxtLinkLocale>
            </footer>
            </aside>
        </Transition>
    </div>
</template>

<script lang="ts" setup>
import type { CartItem } from '@/types'
import { formatPrice } from '~/lib/price'
import { useCartStore } from '@/stores/cart'
import { useRuntimeConfig } from '#imports'
import { useTracking } from '~/composables/useTracking'

const config = useRuntimeConfig();
const cartStore = useCartStore();
const { trackEvent } = useTracking();

const getItemUnitPrice = (item: CartItem): number =>
    Number(item.product.price) +
    (item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0)

const handleIncrementQuantity = (cartItem: CartItem): void => {
    cartStore.incrementQuantity(cartItem.product, cartItem.selectedChoice);
    trackEvent('product_quantity_incremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
};

const handleDecrementQuantity = (cartItem: CartItem): void => {
    cartStore.decrementQuantity(cartItem.product, cartItem.selectedChoice);
    trackEvent('product_quantity_decremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
};
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.35s cubic-bezier(0.33, 1, 0.68, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
