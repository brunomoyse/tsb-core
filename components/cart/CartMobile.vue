<template>
    <Transition class="lg:hidden" name="slide-down">
        <aside
            v-if="cartStore.isCartVisible"
            class="fixed inset-0 top-20 bg-tsb-one shadow-lg z-40 flex flex-col"
        >
            <!-- HEADER -->
            <header class="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 id="cart-heading" class="text-xl font-semibold text-gray-800">
                    {{ $t('cart.title') }}
                </h2>
                <button
                    aria-label="Close Cart"
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
                    :key="item.product.id"
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
                            draggable="false"
                        />
                    </picture>

                    <!-- PRODUCT INFO -->
                    <div class="col-span-3 flex flex-col justify-center text-sm">
                        <span class="font-medium text-gray-800">{{ item.product.name }}</span>
                        <span class="text-gray-500">{{ item.product.category.name }}</span>
                        <span
                            v-if="item.product.pieceCount"
                            class="text-gray-500 text-xs mt-1"
                        >
                          {{ item.product.pieceCount }}
                          {{ item.product.pieceCount === 1 ? $t('menu.pc') : $t('menu.pcs') }}
                        </span>
                    </div>

                    <!-- QTY CONTROLS -->
                    <div class="col-span-2 grid grid-cols-3 items-center">
                        <button
                            aria-label="Decrement Quantity"
                            class="p-1 bg-gray-200 rounded-full hover:bg-gray-300 flex items-center justify-center h-8 w-8"
                            @click="handleDecrementQuantity(item.product)"
                        >
                            <img
                                src="/icons/minus-icon.svg"
                                alt="Minus icon"
                                class="h-4 w-4 flex-shrink-0"
                            />
                        </button>
                        <span class="text-center text-gray-700">{{ item.quantity }}</span>
                        <button
                            aria-label="Increment Quantity"
                            class="p-1 bg-gray-200 rounded-full hover:bg-gray-300 flex items-center justify-center h-8 w-8"
                            @click="handleIncrementQuantity(item.product.id)"
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
                        alt="Plus icon"
                        class="h-12 w-12 mb-4 flex-shrink-0"
                    />
                    <p>{{ $t('cart.empty') }}</p>
                </li>
            </ul>

            <!-- FOOTER: TOTAL + CHECKOUT -->
            <footer v-if="cartStore.products.length" class="p-4 border-t border-gray-200 bg-white">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-sm font-medium text-gray-700">{{ $t('cart.total') }}:</span>
                    <span class="text-lg font-semibold text-gray-900">{{ formatPrice(cartStore.totalPrice) }}</span>
                </div>
                <NuxtLinkLocale
                    to="checkout"
                    class="block text-center bg-red-500 text-white uppercase py-3 rounded-lg hover:bg-tsb-red-dark transition"
                >
                    {{ $t('cart.checkout') }}
                </NuxtLinkLocale>
            </footer>
        </aside>
    </Transition>
</template>

<script lang="ts" setup>
import {useRuntimeConfig} from "#imports";
import {useCartStore} from "@/stores/cart";
import {formatPrice} from "~/lib/price";
import type {Product} from "@/types";

const config = useRuntimeConfig();
const cartStore = useCartStore();

const handleIncrementQuantity = (productId: string): void => {
    const product = getProductById(productId);
    cartStore.incrementQuantity(product);
};

const handleDecrementQuantity = (product: Product): void => {
    cartStore.decrementQuantity(product);
};

const handleRemoveFromCart = (product: Product): void => {
    cartStore.removeFromCart(product);
};

const getProductById = (productId: string): Product => {
    const cartItem = cartStore.products.find(item => item.product.id === productId);
    if (cartItem) {
        return cartItem.product;
    } else {
        throw new Error(`Product with ID ${productId} not found in cart.`);
    }
};
</script>
