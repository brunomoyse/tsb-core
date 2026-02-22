<template>
    <aside
        data-testid="side-cart"
        class="
            bg-tsb-two
            rounded-l-xl
            flex
            flex-col
            divide-y
            divide-gray-200
            max-h-[calc(100vh-32px)]
            overflow-y-auto
            mt-4
         "
    >
        <!-- Header with Toggle -->
        <header class="px-4 py-5 flex items-center justify-between gap-4">
            <h2 class="text-xl font-bold text-gray-900">
                {{ $t('cart.title') }}
            </h2>
            <div class="flex gap-1 rounded-full bg-gray-100 p-1">
                <button v-for="option in collectionOptions" :key="option.value"
                        :data-testid="option.value === 'DELIVERY' ? 'cart-option-delivery' : 'cart-option-pickup'"
                        :class="[
          'flex items-center space-x-1 px-3 py-1 text-sm rounded-full transition-colors',
          cartStore.collectionOption === option.value
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:bg-tsb-four/40'
        ]"
                        @click="handleOrderType(option.value)">
                    <img :alt="option.label" :src="option.icon" class="w-5 h-5"/>
                    <span v-if="cartStore.collectionOption === option.value">{{ option.label }}</span>
                </button>
            </div>
        </header>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <p v-if="cartStore.products.length === 0" class="text-gray-500 text-center py-8">
                {{ $t('cart.empty') }}
            </p>
            <div v-else class="space-y-4">
                <div v-for="item in cartStore.products" :key="`${item.product.id}-${item.selectedChoice?.id ?? 'none'}`"
                     class="group relative grid grid-cols-[auto_1fr] gap-4 p-3 bg-white rounded-lg"
                     :class="{ 'animate-cart-flash': highlightedKey === `${item.product.id}-${item.selectedChoice?.id ?? 'none'}` }">
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
                    <div class="flex flex-col justify-between gap-2">
                        <!-- Product Info and Price -->
                        <div class="flex justify-between items-start gap-2">
                            <div class="flex flex-col min-w-0 flex-1">
                                <h3 class="text-sm font-medium text-gray-900 break-words">
                                    {{ item.product.name }}
                                </h3>
                                <span class="text-xs text-gray-500">
                                    {{ item.product.category?.name }}
                                </span>
                                <span v-if="item.selectedChoice" class="text-xs text-red-600">
                                    {{ item.selectedChoice.name }}
                                </span>
                                <span v-if="item.product.pieceCount" class="text-xs text-gray-500">
                                    {{ item.product.pieceCount }}
                                    {{ item.product.pieceCount === 1 ? $t('menu.pc') : $t('menu.pcs') }}
                                </span>
                            </div>
                            <span class="text-sm font-medium whitespace-nowrap flex-shrink-0 self-start">
                                {{ formatPrice(calculateItemPrice(item)) }}
                            </span>
                        </div>

                        <!-- Quantity Controls and Remove -->
                        <div class="flex items-center justify-between mt-auto">
                            <div class="flex items-center gap-2">
                                <button class="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                                        @click="handleDecrementQuantity(item)">
                                    <span class="sr-only">{{ $t('cart.decreaseQty') }}</span>
                                    -
                                </button>
                                <span class="text-sm w-6 text-center">{{ item.quantity }}</span>
                                <button class="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                                        @click="handleIncrementQuantity(item)">
                                    <span class="sr-only">{{ $t('cart.increaseQty') }}</span>
                                    +
                                </button>
                            </div>
                            <button class="text-xs text-red-600 hover:text-red-700 transition-colors"
                                    @click="handleRemoveFromCart(item)">
                                {{ $t('cart.removeItem') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="p-4 space-y-4 flex-none">
            <!-- Price Breakdown -->
            <div class="space-y-2">
                <div class="flex justify-between items-center text-sm text-gray-600">
                    <span>{{ $t('cart.subtotal') }}:</span>
                    <span>{{ formatPrice(subtotal) }}</span>
                </div>
                <div v-if="cartStore.collectionOption === 'PICKUP' && totalDiscount > 0"
                     class="flex justify-between items-center text-sm text-green-600">
                    <span>{{ $t('cart.pickupDiscount') }}:</span>
                    <span>-{{ formatPrice(totalDiscount) }}</span>
                </div>
                <div class="flex justify-between items-center text-lg font-medium border-t pt-2">
                    <span>{{ $t('cart.total') }}:</span>
                    <span data-testid="cart-total">{{ formatPrice(cartTotal) }}</span>
                </div>
            </div>

            <!-- Minimum Order Warning -->
            <div v-if="!isMinimumReached" data-testid="cart-minimum-warning" class="text-sm text-red-600 text-center">
                {{ cartStore.collectionOption === 'DELIVERY'
                    ? $t('cart.minimumDelivery', { amount: 25})
                    : $t('cart.minimumPickup', { amount: 20}) }}
            </div>

            <!-- Checkout Button -->
            <NuxtLinkLocale
                to="checkout"
                data-testid="cart-checkout-link"
                :class="[
                    'w-full py-3 rounded-lg font-medium transition-all active:scale-[0.97] text-center block',
                    isMinimumReached
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-300 text-gray-500 pointer-events-none'
                ]"
                :tabindex="isMinimumReached ? 0 : -1"
                :aria-disabled="!isMinimumReached"
            >
                {{ $t('cart.checkout') }}
            </NuxtLinkLocale>
        </footer>
    </aside>
</template>

<script lang="ts" setup>
import {computed, ref, onMounted, onUnmounted, useRuntimeConfig} from '#imports';
import {useCartStore} from '@/stores/cart';
import {formatPrice} from '~/lib/price';
import {eventBus} from '~/eventBus';
import type {CartItem} from '@/types';
import {useI18n} from 'vue-i18n';
import {useTracking} from '~/composables/useTracking';

const config = useRuntimeConfig();
const cartStore = useCartStore();
const {t} = useI18n()
const { trackEvent } = useTracking()

// Flash-highlight for newly added items
const highlightedKey = ref<string | null>(null)
let highlightTimeout: NodeJS.Timeout | null = null

const onCartItemAdded = (payload: { productId: string; choiceId?: string }) => {
    const key = `${payload.productId}-${payload.choiceId ?? 'none'}`
    highlightedKey.value = key
    if (highlightTimeout) clearTimeout(highlightTimeout)
    highlightTimeout = setTimeout(() => {
        highlightedKey.value = null
    }, 1500)
}

onMounted(() => {
    eventBus.on('cart-item-added', onCartItemAdded)
})

onUnmounted(() => {
    eventBus.off('cart-item-added', onCartItemAdded)
    if (highlightTimeout) clearTimeout(highlightTimeout)
})

// Delivery options setup
const collectionOptions = [
    {value: 'DELIVERY', label: t('cart.delivery'), icon: '/icons/moped-icon.svg'},
    {value: 'PICKUP', label: t('cart.pickup'), icon: '/icons/shopping-bag-icon.svg'}
];

const handleOrderType = (option: string) => {
    const from = cartStore.collectionOption
    cartStore.collectionOption = option as 'DELIVERY' | 'PICKUP';
    trackEvent('cart_collection_option_changed', { from, to: option })
};

// Price calculations
const getItemUnitPrice = (item: CartItem) => {
    const base = Number(item.product.price)
    const modifier = item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0
    return base + modifier
}

const subtotal = computed(() =>
    cartStore.products.reduce((acc, item) =>
        acc + (getItemUnitPrice(item) * item.quantity), 0)
);

const totalDiscount = computed(() => {
    return cartStore.collectionOption === 'PICKUP'
        ? cartStore.products.reduce((acc, item) =>
            item.product.isDiscountable
                ? acc + (getItemUnitPrice(item) * item.quantity * 0.1)
                : acc, 0)
        : 0
});

const cartTotal = computed(() => {
    let total = subtotal.value - totalDiscount.value;
    return Math.max(total, 0);
});

const isMinimumReached = computed(() => {
    if (cartStore.collectionOption === 'DELIVERY') {
        return cartTotal.value >= 25;
    } else if (cartStore.collectionOption === 'PICKUP') {
        return cartTotal.value >= 20;
    }
    return false
})

const calculateItemPrice = (item: CartItem) => {
    const basePrice = getItemUnitPrice(item) * item.quantity;
    if (cartStore.collectionOption === 'PICKUP' && item.product.isDiscountable) {
        return basePrice * 0.9;
    }
    return basePrice;
};

// Cart actions
const handleIncrementQuantity = (cartItem: CartItem): void => {
    cartStore.incrementQuantity(cartItem.product, cartItem.selectedChoice);
    trackEvent('product_quantity_incremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
};

const handleDecrementQuantity = (cartItem: CartItem): void => {
    cartStore.decrementQuantity(cartItem.product, cartItem.selectedChoice);
    trackEvent('product_quantity_decremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
};

const handleRemoveFromCart = (cartItem: CartItem): void => {
    trackEvent('product_removed_from_cart', { product_id: cartItem.product.id, product_name: cartItem.product.name })
    cartStore.removeFromCart(cartItem.product, cartItem.selectedChoice);
};

</script>
