<template>
    <!-- Slide-in Cart Drawer -->
    <transition
      enter-active-class="transform transition ease-in-out duration-300"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform transition ease-in-out duration-300"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="cartStore.isCartVisible"
        class="z-50 fixed top-0 right-0 h-screen w-[300px] bg-tsb-two shadow-xl rounded-l-xl flex flex-col"
      >
        <!-- Header -->
        <header class="p-4 flex items-center justify-between border-b border-gray-300">
          <h2 class="font-bold text-lg">Your Cart</h2>
          <button
            class="text-black hover:opacity-75 transition"
            @click="cartStore.toggleCartVisibility"
          >
            Close
          </button>
        </header>
  
        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto p-4">
          <p v-if="cartStore.products.length === 0" class="text-sm text-gray-700">
            Your cart is empty.
          </p>
          <div v-else class="space-y-2">
            <div
              v-for="(item, index) in cartStore.products"
              :key="item.product.id"
              class="flex items-center justify-between bg-white text-black p-2 rounded"
            >
              <!-- Item info + increment/decrement -->
              <div class="flex flex-col w-3/5">
                <picture
                                    class="w-16 h-16 object-cover rounded-md mr-4 cursor-pointer pointer-events-none">
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
                <span class="text-sm font-semibold">{{ item.product.name }}</span>
                <div class="flex items-center mt-1">
                  <button
                    class="px-2 py-1 text-sm bg-gray-200 rounded-l"
                    @click="handleDecrementQuantity(item.product)"
                  >
                    -
                  </button>
                  <span class="px-2 text-sm">
                    {{ item.quantity }}
                  </span>
                  <button
                    class="px-2 py-1 text-sm bg-gray-200 rounded-r"
                    @click="handleIncrementQuantity(item.product.id)"
                  >
                    +
                  </button>
                </div>
              </div>
  
              <!-- Price + remove button -->
              <div class="flex flex-col items-end">
                <span class="text-sm font-semibold">
                  {{ formatPrice(item.product.price * item.quantity) }}
                </span>
                <button
                  class="mt-1 text-xs text-red-500 hover:underline"
                  @click="handleRemoveFromCart(item.product)"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Footer -->
        <footer class="p-4 border-t border-gray-300">
          <div class="flex items-center justify-between mb-3">
            <span class="font-semibold">Total:</span>
            <span class="font-bold">{{ formatPrice(cartTotal) }}</span>
          </div>
          <button
            class="w-full bg-tsb-four text-black py-2 rounded hover:bg-tsb-two/90 transition"
            @click="handlePayment"
          >
            Checkout
          </button>
        </footer>
      </aside>
    </transition>
  </template>
  
  <script setup lang="ts">
  import { computed } from 'vue'
  import { useNuxtApp, useRuntimeConfig, useFetch, navigateTo } from "#app";
  import { useCartStore } from "@/stores/cart";
  import { useAuthStore } from "@/stores/auth";
  import { formatPrice } from "~/lib/price";
  import type { Product, Order } from "@/types";
  
  /**
   * -------------------------------------
   *  CART & AUTH STORES
   * -------------------------------------
   */
  const authStore = useAuthStore();
  const { $apiBaseUrl } = useNuxtApp();
  const config = useRuntimeConfig();
  const cartStore = useCartStore();
  
  /**
   * -------------------------------------
   *  COMPUTED: CART TOTAL
   * -------------------------------------
   */
  const cartTotal = computed(() => {
    return cartStore.products.reduce((acc, item) => {
      return acc + (item.product.price * item.quantity);
    }, 0);
  });
  
  /**
   * -------------------------------------
   *  HANDLERS
   * -------------------------------------
   */
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
  
  const handlePayment = async () => {
    if (cartStore.products.length === 0) {
      console.error("Cart is empty.");
      return;
    }
  
    if (authStore.accessToken === null) {
      console.error("User is not authenticated.");
      return;
    }
  
    // Create an order on your backend
    const { data: order } = await useFetch<Order>(`${$apiBaseUrl()}/orders`, {
      method: "POST",
      body: JSON.stringify({
        // @TODO: add shippingAddress if needed
        products: cartStore.products
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      credentials: "include",
    });
  
    // Redirect to payment
    if (order.value?.molliePaymentUrl) {
      navigateTo(order.value.molliePaymentUrl, { external: true });
    }
  
    // After successful payment, clear the cart and hide the sidebar
    cartStore.clearCart();
    cartStore.toggleCartVisibility();
  };
  
  /**
   * -------------------------------------
   *  UTILS
   * -------------------------------------
   */
  const getProductById = (productId: string): Product => {
    const cartItem = cartStore.products.find(item => item.product.id === productId);
    if (cartItem) {
      return cartItem.product;
    }
    throw new Error(`Product with ID ${productId} not found in cart.`);
  };
  </script>