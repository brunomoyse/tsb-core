<template>
    <section class="bg-white rounded-lg shadow p-4 w-full mx-auto overflow-visible">
        <h2 class="text-xl font-semibold mb-4">
            {{ $t('checkout.orderSummary', 'Your Order') }}
        </h2>
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
                            {{
                                (item.product.code ? item.product.code + ' - ' : '') +
                                (item.product.category?.name || '') +
                                ' ' +
                                item.product.name
                            }}
                        </p>
                        <p class="text-sm text-gray-500">x{{ item.quantity }}</p>
                    </div>
                </div>
                <p class="font-medium">
                    {{ formatPrice(item.product.price * item.quantity) }}
                </p>
            </div>

            <!-- Price Summary -->
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
                <span>{{ formatPrice(deliveryFee) }}</span>
            </div>
            <div v-if="cartStore.collectionOption === 'PICKUP'" class="flex justify-between text-gray-700">
                <span>{{ $t('checkout.discount') }}</span>
                <span>-{{ formatPrice(totalDiscount) }}</span>
            </div>
            <div class="flex justify-between font-semibold text-lg mt-4">
                <span>{{ $t('checkout.total', 'Total:') }}</span>
                <span>{{ formatPrice(finalTotal) }}</span>
            </div>
        </div>
    </section>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useRuntimeConfig } from '#imports'
import { formatPrice } from '~/lib/price'
import type { ComputedRef } from 'vue'

const cartStore = useCartStore()
const config = useRuntimeConfig()
const showTooltip = ref(false)

const cartTotal = computed(() =>
    cartStore.products.reduce((total, item) => total + item.product.price * item.quantity, 0)
)

const deliveryFee = computed(() => {
    if (cartStore.collectionOption !== 'DELIVERY' || !cartStore.address) return 0

    // Assume cartStore.user.address contains a "distance" property.
    const { distance } = cartStore.address
    const thresholds = [4000, 5000, 6000, 7000, 8000, 9000, 10001]
    const fee = thresholds.findIndex((threshold) => distance < threshold)
    return fee === -1 ? 0 : fee
})

const totalDiscount = computed(() => {
    return cartStore.collectionOption === 'PICKUP'
        ? cartStore.products.reduce((acc, item) =>
            item.product.isDiscountable
                ? acc + (item.product.price * item.quantity * 0.1)
                : acc, 0)
        : 0
});

const finalTotal: ComputedRef<number> = computed(() => {
    return cartTotal.value + (cartStore.collectionOption === 'DELIVERY' ? deliveryFee.value : 0) - totalDiscount.value
})
</script>
