<template>
    <div class="flex flex-col h-[calc(100%-5rem)]">
        <!-- Header with Title and Close Button -->
        <div class="flex justify-between items-center mb-4">
            <h2 id="cart-heading" class="text-2xl font-semibold text-gray-800">
                {{ $t('cart.title') }}
            </h2>
            <button @click="cartStore.toggleCartVisibility" aria-label="Close Cart"
                class="text-gray-500 hover:text-gray-700 focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Cart Items or Empty State -->
        <div class="flex-1 overflow-y-auto">
            <div v-if="cartStore.products.length === 0"
                class="flex flex-col items-center justify-center h-full text-gray-500">
                <!-- Cart SVG Icon -->
                <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" class="h-12 w-12 mb-4 fill-current">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z">
                    </path>
                </svg>
                <p>{{ $t('cart.empty') }}</p>
            </div>

            <div v-else>
                <div v-for="item in cartStore.products" :key="item.product.id" class="mb-4">
                    <!-- Cart Item -->
                    <div class="flex items-center p-4 bg-white shadow rounded-lg border border-gray-200">
                        <!-- Product Image -->

                        <picture class="w-16 h-16 object-cover rounded-md mr-4 cursor-pointer pointer-events-none">
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product?.slug}.avif`"
                                type="image/avif" />
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product?.slug}.webp`"
                                type="image/webp" />
                            <img :src="`${config.public.s3bucketUrl}/images/thumbnails/${item.product?.slug}.png`"
                                :alt="item.product.name" class="h-auto max-h-32 pointer-events-none"
                                :draggable="false" />
                        </picture>

                        <!-- Product Details -->
                        <div class="flex-1">
                            <h3 class="text-lg font-medium text-gray-800">{{ item.product.name }}</h3>
                            <p class="text-sm text-gray-500">{{ item.product.description }}</p>
                            <p class="mt-2 text-sm text-gray-600">Prix unitaire: {{ formatPrice(item.product.price) }}
                            </p>
                        </div>

                        <!-- Quantity Controls and Price -->
                        <div class="flex items-center">
                            <!-- Decrement Button -->
                            <button @click="handleDecrementQuantity(item.product.id, 1)" aria-label="Decrement Quantity"
                                class="p-1 bg-gray-200 rounded-full hover:bg-gray-300 focus:outline-none">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-700" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M18 12H6" />
                                </svg>
                            </button>

                            <!-- Quantity Display -->
                            <span class="mx-2 w-6 text-center text-gray-700">{{ item.quantity }}</span>

                            <!-- Increment Button -->
                            <button @click="handleIncrementQuantity(item.product.id)" aria-label="Increment Quantity"
                                class="p-1 bg-gray-200 rounded-full hover:bg-gray-300 focus:outline-none">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-700" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 6v12m6-6H6" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Remove Item Button -->
                    <button @click="cartStore.removeFromCart(item.product.id)" aria-label="Remove Item"
                        class="mt-2 text-sm text-red-500 hover:underline focus:outline-none">
                        {{ $t('cart.removeItem') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Total and Payment Button -->
        <div v-if="cartStore.products.length > 0" class="mt-auto">
            <div class="flex justify-between items-center mb-4">
                <span class="text-lg font-medium text-gray-700">
                    {{ $t('cart.total') }}:</span>
                <span class="text-xl font-semibold text-gray-900">{{ formatPrice(cartStore.totalPrice) }}</span>
            </div>
            <button @click="handlePayment"
                class="w-full bg-tsb-red text-white uppercase py-2 px-4 rounded-lg hover:bg-tsb-red-dark transition duration-200 focus:outline-none focus:ring-2 focus:ring-tsb-red focus:ring-offset-2">
                {{ $t('cart.checkout') }}
            </button>
        </div>
    </div>
</template>


<script setup lang="ts">
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "~/lib/price";
import type { ProductInfo, Order } from "@/types";

const authStore = useAuthStore();
const { $apiBaseUrl } = useNuxtApp()
const config = useRuntimeConfig();
// Initialize the cart store
const cartStore = useCartStore();

/**
 * Handles incrementing the quantity of a product in the cart.
 * @param productId - The ID of the product to increment.
 */
const handleIncrementQuantity = (productId: string): void => {
    const product = getProductById(productId);
    cartStore.addToCart(product);
    console.log(`Incremented quantity for product ${productId}`);
};

/**
 * Handles decrementing the quantity of a product in the cart.
 * @param productId - The ID of the product to decrement.
 */
const handleDecrementQuantity = (productId: string, quantity: number): void => {
    cartStore.removeFromCart(productId, quantity);
    console.log(`Decremented quantity for product ${productId}`);
};

/**
 * Handles the payment process.
 * This is a placeholder and should be replaced with actual payment logic.
 */
const handlePayment = async () => {
    if (cartStore.products.length === 0) {
        console.error("Cart is empty.");
        return;
    }

    if (authStore.accessToken === null) {
        console.error("User is not authenticated.");
        return;
    }

    // Implement your payment logic here
    const { data: order } = await useFetch<Order>(`${$apiBaseUrl()}/user/orders`, {
        method: "POST",
        body: JSON.stringify({
            // @TODO: add shipping address
            // shippingAddress: ''
            products: cartStore.products
        }),
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authStore.accessToken}`,
        },
        credentials: "include",
    });

    // Redirect to payment
    navigateTo(order.value?.molliePaymentUrl, { external: true });

    // After successful payment, clear the cart and hide the sidebar
    cartStore.clearCart();
    cartStore.toggleCartVisibility();
};

/**
 * Retrieves a product by its ID from the cart.
 * Useful for ensuring correct product data when incrementing.
 * @param productId - The ID of the product to retrieve.
 * @returns The ProductInfo object.
 */
const getProductById = (productId: string): ProductInfo => {
    const cartItem = cartStore.products.find(item => item.product.id === productId);
    if (cartItem) {
        return cartItem.product;
    } else {
        throw new Error(`Product with ID ${productId} not found in cart.`);
    }
};
</script>

<style scoped>
/* Additional Styles (if any) */
</style>