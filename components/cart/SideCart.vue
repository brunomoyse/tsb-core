<template>
    <aside class="bg-tsb-two rounded-l-xl flex flex-col divide-y divide-gray-200">
        <!-- Header with Toggle -->
        <header class="px-4 py-5 flex items-center justify-between gap-4">
            <h2 class="text-xl font-bold text-gray-900">
                {{ $t('cart.title') }}
            </h2>
            <div class="flex gap-1 rounded-full bg-gray-100 p-1">
                <button v-for="option in deliveryOptions" :key="option.value" :class="[
          'flex items-center space-x-1 px-3 py-1 text-sm rounded-full transition-colors',
          deliveryOption === option.value
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:bg-gray-50'
        ]"
                        @click="handleOrderType(option.value)">
                    <img :alt="option.label" :src="option.icon" class="w-5 h-5"/>
                    <span v-if="deliveryOption === option.value">{{ option.label }}</span>
                </button>
            </div>
        </header>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <p v-if="cartStore.products.length === 0" class="text-gray-500 text-center py-8">
                {{ $t('cart.empty') }}
            </p>
            <div v-else class="space-y-4">
                <div v-for="item in cartStore.products" :key="item.product.id"
                     class="group relative grid grid-cols-[auto_1fr] gap-4 p-3 bg-white rounded-lg">
                    <!-- Product Image -->
                    <!-- Product Image -->
                    <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        <picture>
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product?.slug}.avif`"
                                type="image/avif"/>
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product?.slug}.webp`"
                                type="image/webp"/>
                            <img :alt="item.product.name"
                                 :src="`${config.public.s3bucketUrl}/images/thumbnails/${item.product?.slug}.png`"
                                 class="max-w-full max-h-full"
                                 draggable="false"/>
                        </picture>
                    </div>

                    <!-- Product Details -->
                    <div class="flex flex-col justify-between">
                        <div class="flex justify-between items-start">
                            <h3 class="text-sm font-medium text-gray-900 line-clamp-2">
                                <!-- {{ item.product.category?.name + ' ' + item.product.name + ' ' + (item.product.pieceCount ? ('(' + item.product.pieceCount + 'x)') : '')}}-->
                                {{
                                    item.product.code ? item.product.code : item.product.category?.name + ' ' + item.product.name
                                }}
                                <span v-if="deliveryOption === 'pickup' && item.product.discountable"
                                      class="text-xs text-green-600 ml-1">
                  (-10%)
                </span>
                            </h3>
                            <span class="text-sm font-medium ml-2">
                {{ formatPrice(calculateItemPrice(item)) }}
              </span>
                        </div>

                        <!-- Quantity Controls -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <button class="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                                        @click="handleDecrementQuantity(item.product)">
                                    <span class="sr-only">Decrease quantity</span>
                                    -
                                </button>
                                <span class="text-sm w-6 text-center">{{ item.quantity }}</span>
                                <button class="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                                        @click="handleIncrementQuantity(item.product.id)">
                                    <span class="sr-only">Increase quantity</span>
                                    +
                                </button>
                            </div>
                            <button class="text-xs text-red-600 hover:text-red-700 transition-colors"
                                    @click="handleRemoveFromCart(item.product)">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="p-4 space-y-4">
            <!-- Price Breakdown -->
            <div class="space-y-2">
                <div class="flex justify-between items-center text-sm text-gray-600">
                    <span>{{ $t('cart.subtotal') }}:</span>
                    <span>{{ formatPrice(subtotal) }}</span>
                </div>
                <div v-if="deliveryOption === 'pickup'"
                     class="flex justify-between items-center text-sm text-green-600">
                    <span>{{ $t('cart.pickupDiscount') }}:</span>
                    <span>-{{ formatPrice(totalDiscount) }}</span>
                </div>
                <div v-if="deliveryOption === 'delivery'"
                     class="flex justify-between items-center text-sm text-gray-600">
                    <span>{{ $t('cart.deliveryFee') }}:</span>
                    <span>+{{ formatPrice(deliveryFee) }}</span>
                </div>
                <div class="flex justify-between items-center text-lg font-medium border-t pt-2">
                    <span>{{ $t('cart.total') }}:</span>
                    <span>{{ formatPrice(cartTotal) }}</span>
                </div>
            </div>

            <!-- Minimum Order Warning -->
            <div v-if="cartTotal < 20" class="text-sm text-red-600 text-center">
                {{ $t('cart.minimumOrderAmountIs') }}
            </div>

            <!-- Checkout Button -->
            <button :class="[
        'w-full py-3 rounded-lg font-medium transition-colors',
        cartTotal >= 20
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      ]" :disabled="cartTotal < 20" @click="handlePayment">
                Checkout
            </button>
        </footer>
    </aside>
</template>

<script lang="ts" setup>
import {computed, navigateTo, ref, useAsyncData, useNuxtApp, useRuntimeConfig} from '#imports';
import {useCartStore} from '@/stores/cart';
import {useAuthStore} from '@/stores/auth';
import {formatPrice} from '~/lib/price';
import type {CartItem, Order, Product} from '@/types';
import {useI18n} from 'vue-i18n';

const authStore = useAuthStore();
const config = useRuntimeConfig();
const cartStore = useCartStore();
const {t} = useI18n()
const {$api} = useNuxtApp();

// Delivery options setup
const deliveryOptions = [
    {value: 'delivery', label: t('cart.delivery'), icon: '/icons/moped-icon.svg'},
    {value: 'pickup', label: t('cart.pickup'), icon: '/icons/shopping-bag-icon.svg'}
];
const deliveryOption = ref<'delivery' | 'pickup'>('delivery');
const deliveryFee = 3.5;

const handleOrderType = (option: string) => {
    deliveryOption.value = option as 'delivery' | 'pickup';
};

// Price calculations
const subtotal = computed(() =>
    cartStore.products.reduce((acc, item) =>
        acc + (item.product.price * item.quantity), 0)
);

const totalDiscount = computed(() =>
    deliveryOption.value === 'pickup'
        ? cartStore.products.reduce((acc, item) =>
            item.product.discountable
                ? acc + (item.product.price * item.quantity * 0.1)
                : acc, 0)
        : 0
);

const cartTotal = computed(() => {
    let total = subtotal.value - totalDiscount.value;
    if (deliveryOption.value === 'delivery') total += deliveryFee;
    return Math.max(total, 0);
});

const calculateItemPrice = (item: CartItem) => {
    const basePrice = item.product.price * item.quantity;
    if (deliveryOption.value === 'pickup' && item.product.discountable) {
        return basePrice * 0.9;
    }
    return basePrice;
};

// Cart actions
const handleIncrementQuantity = (productId: string): void => {
    const product = cartStore.products.find(item => item.product.id === productId)?.product;
    if (product) {
        cartStore.incrementQuantity(product);
    }
};

const handleDecrementQuantity = (product: Product): void => {
    cartStore.decrementQuantity(product);
};

const handleRemoveFromCart = (product: Product): void => {
    cartStore.removeFromCart(product);
};

// Payment handling
const handlePayment = async () => {
    if (cartTotal.value < 20) {
        console.error("Minimum order not reached");
        return;
    }

    if (!authStore.accessToken) {
        console.error("User is not authenticated");
        return;
    }

    const orderData = {
        products: cartStore.products,
        order_type: deliveryOption.value,
        delivery_fee: deliveryOption.value === 'delivery' ? deliveryFee : 0,
        total_discount: totalDiscount.value
    };

    try {
        const {data: order} = await useAsyncData<Order>('order', () =>
            $api('/orders', {
                method: 'POST',
                body: JSON.stringify(orderData),
                headers: {'Content-Type': 'application/json'}
            })
        );

        if (order.value?.molliePaymentUrl) {
            navigateTo(order.value.molliePaymentUrl, {external: true});
        }

        cartStore.clearCart();
        cartStore.toggleCartVisibility();
    } catch (error) {
        console.error("Payment processing failed:", error);
    }
};
</script>
