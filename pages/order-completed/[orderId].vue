<template>
    <div class="flex items-center justify-center bg-gray-100 p-4">
        <!-- Card -->
        <div class="max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
            <h1 class="text-3xl font-bold">
                {{ $t('orderCompleted.title', 'Order Completed') }}
            </h1>
            <p class="mt-4 text-gray-600">
                {{ $t('orderCompleted.thankYou', 'Thank you for your purchase! Your order was placed successfully.') }}
            </p>

            <!-- Order Details -->
            <div v-if="orderResponse" class="mt-6">
                <div class="space-y-4">
                    <!-- Order creation time -->
                    <p class="text-gray-700">
                        {{ $t('orderCompleted.placedAt', 'Order placed at: ') }}
                        {{
                            new Date(orderResponse.order.createdAt).toLocaleString("fr-BE", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                        }}
                    </p>

                    <!-- List of items -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-medium text-gray-900">{{ $t('orderCompleted.items', 'Articles:') }}</h4>
                        <div class="space-y-3">
                            <div
                                v-for="(item, index) in orderResponse.products"
                                :key="index"
                                class="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                            >
                                <div>
                                    <p class="text-sm font-medium text-gray-900">
                                        {{ item.product.code ? item.product.code + ' - ' : '' }}
                                        {{ item.product.categoryName + ' ' + item.product.name }}
                                    </p>
                                </div>
                                <span class="text-sm font-medium text-gray-700">x{{ item.quantity }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Placeholder while loading -->
            <div v-else>
                <p class="text-sm text-gray-500 mt-4">
                    {{ $t('orderCompleted.loading', 'Loading order details...') }}
                </p>
            </div>

            <!-- Return Home Button -->
            <div class="mt-8 text-right">
                <NuxtLink class="inline-block px-4 py-2 rounded bg-tsb-two text-black border border-gray-300 font-semibold"
                          to="/">
                    {{ $t('orderCompleted.returnHome', 'Return to Home') }}
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type {OrderResponse} from '@/types'
import {useNuxtApp, useRoute, useAsyncData, definePageMeta, useCartStore, onMounted} from '#imports';

definePageMeta({
    public: false
})

const route = useRoute()
const {$api} = useNuxtApp()
const cartStore = useCartStore()

const orderId = route.params.orderId as string

const {data: orderResponse} = await useAsyncData<OrderResponse>('order', () =>
    $api(`/orders/${orderId}`)
);

onMounted(() => {
    if (orderId) {
        cartStore.clearCart()
        cartStore.setCartVisibility(false)
    }
})

</script>
