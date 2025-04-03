<template>
    <div class="max-w-7xl mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">{{ $t('checkout.title', 'Checkout') }}</h1>
        <!-- Add items-start so columns don't stretch to the same height -->
        <div class="flex flex-col lg:flex-row gap-8 items-start">
            <!-- Order Summary / Cart -->
            <aside class="bg-white rounded-lg shadow p-4 w-full lg:w-1/2">
                <h2 class="text-xl font-semibold mb-4">{{ $t('checkout.orderSummary', 'Your Order') }}</h2>
                <div v-if="cartStore.products.length === 0" class="text-gray-500 text-center">
                    {{ $t('checkout.emptyCart', 'Your cart is empty.') }}
                </div>
                <div v-else class="space-y-4">
                    <div
                        v-for="item in cartStore.products"
                        :key="item.product.id"
                        class="flex items-center justify-between border-b pb-2"
                    >
                        <div class="flex items-center">
                            <!-- Product Picture -->
                            <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mr-3">
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
                                        alt="Product Image"
                                        class="w-full h-full object-cover"
                                    />
                                </picture>
                            </div>
                            <!-- Product Details -->
                            <div>
                                <p class="font-medium">
                                    {{ (item.product.code ? item.product.code + ' - ' : '') + (item.product.category?.name || '') + ' ' + item.product.name }}
                                </p>
                                <p class="text-sm text-gray-500">x{{ item.quantity }}</p>
                            </div>
                        </div>
                        <p class="font-medium">{{ formatPrice(item.product.price * item.quantity) }}</p>
                    </div>
                    <!-- Subtotal -->
                    <div class="flex justify-between text-gray-700">
                        <span>{{ $t('checkout.subtotal', 'Subtotal:') }}</span>
                        <span>{{ formatPrice(cartTotal) }}</span>
                    </div>
                    <!-- Delivery Fee (only for delivery orders) -->
                    <div v-if="cartStore.deliveryOption === 'DELIVERY'" class="flex justify-between text-gray-700">
                        <span>{{ $t('checkout.deliveryFee', 'Delivery Fee:') }}</span>
                        <span>{{ formatPrice(authStore.deliveryFee) }}</span>
                    </div>
                    <!-- Delivery Address (only for delivery orders) -->
                    <div v-if="cartStore.deliveryOption === 'DELIVERY' && authStore.user && authStore.user.address" class="flex flex-col text-gray-700">
                        <span class="font-medium">{{ $t('checkout.deliveryAddress', 'Delivery Address:') }}</span>
                        <span>{{ authStore.user.address }}</span>
                    </div>
                    <!-- Final Total -->
                    <div class="flex justify-between font-semibold text-lg mt-4">
                        <span>{{ $t('checkout.total', 'Total:') }}</span>
                        <span>{{ formatPrice(finalTotal) }}</span>
                    </div>
                </div>
            </aside>

            <!-- Extras & Payment Options -->
            <section class="bg-white rounded-lg shadow p-4 w-full lg:w-1/2">
                <h2 class="text-xl font-semibold mb-4">{{ $t('checkout.extrasAndPayment', 'Extras & Payment') }}</h2>

                <!-- Payment Method -->
                <div class="mb-6">
                    <h3 class="font-medium mb-2">{{ $t('checkout.paymentMethod', 'Payment Method') }}</h3>
                    <div class="flex gap-4">
                        <!-- Online Payment Card -->
                        <div
                            @click="isOnlinePayment = true"
                            :class="isOnlinePayment ? 'border-red-500' : 'border-gray-300 bg-gray-50'"
                            class="cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md"
                        >
                            <img src="/icons/online-payment-icon.svg" alt="Online Payment" class="w-10 h-10 mb-2" />
                            <span class="font-semibold">{{ $t('checkout.online', 'Online Payment') }}</span>
                        </div>
                        <!-- Cash -->
                        <div
                            @click="isOnlinePayment = false"
                            :class="!isOnlinePayment ? 'border-red-500' : 'border-gray-300 bg-gray-50'"
                            class="cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md"
                        >
                            <img src="/icons/cash-payment-icon.svg" alt="Cash" class="w-10 h-10 mb-2" />
                            <span class="font-semibold">{{ $t('checkout.cash', 'Cash') }}</span>
                        </div>
                    </div>
                </div>

                <!-- Extras -->
                <div class="mb-6">
                    <h3 class="font-medium text-lg mb-4">{{ $t('checkout.extras', 'Extras') }}</h3>
                    <div class="grid grid-cols-1 gap-4">
                        <!-- Chopsticks Card -->
                        <div class="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <input
                                type="checkbox"
                                id="chopsticks"
                                v-model="addChopsticks"
                                class="mr-4 h-5 w-5 text-red-500 border-gray-300 rounded"
                            />
                            <label for="chopsticks" class="text-gray-700 font-medium">
                                {{ $t('checkout.addChopsticks', 'Add Chopsticks') }}
                            </label>
                        </div>

                        <!-- Soy Sauce Options Card -->
                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <p class="font-medium text-gray-700 mb-3">
                                {{ $t('checkout.soySauce', 'Soy Sauce (choose up to 2):') }}
                            </p>
                            <div class="flex flex-col sm:flex-row gap-4">
                                <div class="flex-1">
                                    <label for="sauce1" class="block text-sm text-gray-600 mb-1">Sauce 1</label>
                                    <select id="sauce1" v-model="sauce1" class="block w-full border border-gray-300 rounded p-2">
                                        <option value="none">{{ $t('checkout.none', 'None') }}</option>
                                        <option value="sweet">{{ $t('checkout.sweet', 'Sweet') }}</option>
                                        <option value="salty">{{ $t('checkout.salty', 'Salty') }}</option>
                                    </select>
                                </div>
                                <div class="flex-1">
                                    <label for="sauce2" class="block text-sm text-gray-600 mb-1">Sauce 2</label>
                                    <select id="sauce2" v-model="sauce2" class="block w-full border border-gray-300 rounded p-2">
                                        <option value="none">{{ $t('checkout.none', 'None') }}</option>
                                        <option value="sweet">{{ $t('checkout.sweet', 'Sweet') }}</option>
                                        <option value="salty">{{ $t('checkout.salty', 'Salty') }}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Go to Payment Button -->
                <button
                    @click="handleCheckout"
                    :disabled="isCheckoutProcessing"
                    class="w-full py-3 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                    {{ isOnlinePayment ?  $t('checkout.goToPayment', 'Go to Payment') : $t('checkout.placeOrder', 'Place Order') }}
                </button>
            </section>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import { formatPrice } from '~/lib/price'
import {
    definePageMeta,
    navigateTo,
    useAsyncData,
    useAuthStore,
    useLocalePath,
    useNuxtApp,
    useRuntimeConfig
} from '#imports'
import type {CreateOrderRequest, OrderResponse} from '~/types'

definePageMeta({
    public: false
})

const localePath = useLocalePath()
const authStore = useAuthStore()
const cartStore = useCartStore()
const config = useRuntimeConfig()
const { $api } = useNuxtApp()

const isCheckoutProcessing = ref(false)
const isOnlinePayment = ref(true) // Default to online payment

// Extras: add chopsticks, and choose up to 2 soy sauces (default is "none")
const addChopsticks = ref(true)
const sauce1 = ref('sweet')
const sauce2 = ref('salty')

// Calculate the cart subtotal (products only)
const cartTotal = computed(() =>
    cartStore.products.reduce((total, item) => total + item.product.price * item.quantity, 0)
)

// Calculate final total including delivery fee if applicable
const finalTotal = computed(() =>
    cartTotal.value + (cartStore.deliveryOption === 'DELIVERY' ? authStore.deliveryFee : 0)
)

const handleCheckout = async () => {
    if (isCheckoutProcessing.value) return
    isCheckoutProcessing.value = true

    if (cartStore.products.length === 0) {
        console.error('Cart is empty')
        return
    }

    if (cartTotal.value < 20) {
        console.error('Minimum order not reached')
        return
    }

    if (!authStore.accessValid) {
        console.error('User is not authenticated')
        return
    }

    const orderExtra: { name: string; options?: string[] }[] = [];

    if (addChopsticks.value) {
        orderExtra.push({ name: 'chopsticks' });
    }

    if (sauce1.value !== 'none' || sauce2.value !== 'none') {
        const paramSauce: { name: string; options: string[] } = {
            name: 'sauce',
            options: []
        };

        if (sauce1.value !== 'none') {
            paramSauce.options.push(sauce1.value);
        }
        if (sauce2.value !== 'none') {
            paramSauce.options.push(sauce2.value);
        }
        orderExtra.push(paramSauce);
    }

    const orderData: CreateOrderRequest = {
        orderType: cartStore.deliveryOption,
        isOnlinePayment: isOnlinePayment.value,
        addressId: null,
        addressExtra: null,
        extraComment: null,
        orderExtra: orderExtra,
        orderProducts: cartStore.products.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
        })),
    }

    try {
        const { data: orderResponse } = await useAsyncData<OrderResponse>('order', () =>
            $api('/orders', {
                method: 'POST',
                body: JSON.stringify(orderData),
            })
        )

        if (isOnlinePayment.value && orderResponse.value?.payment?.paymentUrl) {
            navigateTo(orderResponse.value?.payment?.paymentUrl, { external: true })
        } else {
            if (orderResponse.value?.order.id) {
                // If the order is completed, navigate to the order completed page
                const orderId = orderResponse.value?.order.id
                navigateTo(localePath(`/order-completed/${orderId}`))
            }
        }

        cartStore.clearCart()
        cartStore.toggleCartVisibility()
    } catch (error) {
        console.error('Payment processing failed:', error)
    }
}
</script>
