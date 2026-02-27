<template>
    <section class="bg-white rounded-lg shadow p-4 w-full mx-auto overflow-visible">
        <!-- Collapsible header -->
        <button
            class="w-full flex items-center justify-between xl:cursor-default"
            @click="isCollapsed = !isCollapsed"
        >
            <h2 class="text-xl font-semibold">
                {{ $t('checkout.orderSummary', 'Your Order') }}
                <span class="text-sm font-normal text-gray-500 ml-1">
                    ({{ $t('checkout.itemCount', { count: cartStore.totalItems }, cartStore.totalItems) }})
                </span>
            </h2>
            <!-- Chevron (mobile/tablet only) -->
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-gray-400 transition-transform duration-200 xl:hidden"
                :class="{ 'rotate-180': !isCollapsed }"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>

        <div v-if="cartStore.products.length === 0" class="text-gray-500 text-center mt-4">
            {{ $t('checkout.emptyCart', 'Your cart is empty.') }}
        </div>
        <div v-else class="space-y-4 mt-4">
            <!-- Collapsible item list -->
            <div
                class="overflow-hidden transition-all duration-200 xl:max-h-none"
                :class="isCollapsed ? 'max-h-0 xl:max-h-none' : 'max-h-[2000px]'"
            >
                <div class="space-y-4">
                    <div
                        v-for="item in cartStore.products"
                        :key="`${item.product.id}-${item.selectedChoice?.id ?? 'none'}`"
                        class="flex items-center justify-between border-b pb-2"
                    >
                        <div class="flex items-center flex-1 min-w-0">
                            <!-- Product Picture -->
                            <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mr-3 shrink-0">
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
                                        class="w-full h-full object-cover"
                                        width="48"
                                        height="48"
                                    />
                                </picture>
                            </div>
                            <!-- Product Details -->
                            <div class="min-w-0 flex-1">
                                <p class="font-medium text-sm truncate">
                                    {{
                                        (item.product.code ? item.product.code + ' - ' : '') +
                                        (item.product.category?.name || '') +
                                        ' ' +
                                        item.product.name
                                    }}
                                </p>
                                <p v-if="item.selectedChoice" class="text-xs text-red-600">{{ item.selectedChoice.name }}</p>
                                <!-- Quantity controls -->
                                <div class="flex items-center gap-2 mt-1">
                                    <button
                                        class="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                                        @click="handleDecrementQuantity(item)"
                                    >
                                        <span class="sr-only">{{ $t('cart.decreaseQty') }}</span>
                                        -
                                    </button>
                                    <span class="text-sm w-8 text-center">{{ item.quantity }}</span>
                                    <button
                                        class="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                                        @click="handleIncrementQuantity(item)"
                                    >
                                        <span class="sr-only">{{ $t('cart.increaseQty') }}</span>
                                        +
                                    </button>
                                    <button
                                        class="text-xs text-red-600 hover:text-red-700 ml-2"
                                        @click="handleRemoveFromCart(item)"
                                    >
                                        {{ $t('cart.removeItem') }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p class="font-medium ml-2 shrink-0">
                            {{ formatPrice((Number(item.product.price) + (item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0)) * item.quantity) }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Price Summary (always visible) -->
            <div class="flex justify-between text-gray-700">
                <span>{{ $t('checkout.subtotal', 'Subtotal:') }}</span>
                <span>{{ formatPrice(cartTotal) }}</span>
            </div>
            <div v-if="cartStore.collectionOption === 'DELIVERY'" class="flex justify-between text-gray-700 relative">
                <div class="flex items-center gap-1">
                    <span>{{ $t('checkout.deliveryFee', 'Delivery Fee:') }}</span>
                    <button
                        type="button"
                        class="text-blue-500 hover:text-blue-600 focus:outline-none group relative"
                        @mouseenter="showTooltip = true"
                        @mouseleave="showTooltip = false"
                        @focus="showTooltip = true"
                        @blur="showTooltip = false"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        <div
                            v-if="showTooltip"
                            class="absolute left-0 bottom-6 min-w-[280px] max-w-xs p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-[999] whitespace-pre-line pointer-events-none leading-relaxed text-left"
                        >
                            {{ $t('checkout.deliveryFeeInfo') }}
                            <div class="absolute top-full left-4 -mt-1">
                                <div class="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </button>
                </div>
                <span v-if="!cartStore.address" class="text-gray-400">&ndash;</span>
                <span v-else-if="deliveryFee === -1" class="text-red-600 font-medium text-sm">{{ $t('checkout.tooFar') }}</span>
                <span v-else-if="deliveryFee === 0" class="text-green-600 font-medium">{{ $t('checkout.free') }}</span>
                <span v-else>{{ formatPrice(deliveryFee) }}</span>
            </div>
            <div v-if="cartStore.collectionOption === 'PICKUP'" class="flex justify-between text-gray-700">
                <span>{{ $t('checkout.discount') }}</span>
                <span>-{{ formatPrice(totalDiscount) }}</span>
            </div>
            <div v-if="cartStore.couponDiscount > 0" class="flex justify-between text-green-600">
                <span>{{ $t('coupon.discount') }} ({{ cartStore.couponCode }})</span>
                <span>-{{ formatPrice(cartStore.couponDiscount) }}</span>
            </div>
            <div class="flex justify-between font-semibold text-lg mt-4">
                <span>{{ $t('checkout.total', 'Total:') }}</span>
                <span>{{ formatPrice(finalTotal) }}</span>
            </div>
        </div>
    </section>
</template>

<script lang="ts" setup>
import { type ComputedRef, computed, ref } from 'vue'
import type { CartItem } from '~/types'
import { formatPrice } from '~/lib/price'
import { useCartStore } from '@/stores/cart'
import { useRuntimeConfig } from '#imports'



const cartStore = useCartStore()
const config = useRuntimeConfig()
const showTooltip = ref(false)
const isCollapsed = ref(false)

const getItemUnitPrice = (item: { product: { price: string | number }; selectedChoice?: { priceModifier: string | number } | null }) => {
    const base = Number(item.product.price)
    const modifier = item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0
    return base + modifier
}

const cartTotal = computed(() =>
    cartStore.products.reduce((total, item) => total + getItemUnitPrice(item) * item.quantity, 0)
)

const deliveryFee = computed(() => {
    if (cartStore.collectionOption !== 'DELIVERY' || !cartStore.address) return 0

    const { distance } = cartStore.address
    if (distance >= 9000) return -1

    const thresholds = [4000, 5000, 6000, 7000, 8000, 9000]
    const fee = thresholds.findIndex((threshold) => distance < threshold)
    return fee === -1 ? 0 : fee
})

const totalDiscount = computed(() => (
    cartStore.collectionOption === 'PICKUP'
        ? cartStore.products.reduce((acc, item) =>
            item.product.isDiscountable
                ? acc + (getItemUnitPrice(item) * item.quantity * 0.1)
                : acc, 0)
        : 0
));

const finalTotal: ComputedRef<number> = computed(() => {
    const fee = deliveryFee.value === -1 ? 0 : deliveryFee.value
    return cartTotal.value + (cartStore.collectionOption === 'DELIVERY' ? fee : 0) - totalDiscount.value - cartStore.couponDiscount
})

// Quantity control handlers
const handleIncrementQuantity = (item: CartItem) => {
    cartStore.incrementQuantity(item.product, item.selectedChoice)
}

const handleDecrementQuantity = (item: CartItem) => {
    cartStore.decrementQuantity(item.product, item.selectedChoice)
}

const handleRemoveFromCart = (item: CartItem) => {
    cartStore.removeFromCart(item.product, item.selectedChoice)
}
</script>
