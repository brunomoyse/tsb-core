<template>
    <div class="flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <!-- Main Card -->
        <div class="max-w-2xl w-full bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ $t('orderCompleted.title', 'Order Completed') }}
            </h1>
            <p class="mt-3 text-gray-600 dark:text-gray-300 text-sm">
                {{ $t('orderCompleted.thankYou', 'Thank you for your purchase! Your order was placed successfully.') }}
            </p>

            <!-- Order Details -->
            <div v-if="orderResponse" class="mt-6">
                <div class="space-y-5">
                    <!-- Items List -->
                    <div class="space-y-4">
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-200">
                            {{ $t('orderCompleted.items', 'Dishes:') }}
                        </h3>
                        <div class="space-y-2">
                            <div
                                v-for="(item, index) in orderResponse.products"
                                :key="index"
                                class="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <div class="flex-1 min-w-0 pr-2">
                                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        <span v-if="item.product.code" class="text-gray-500 dark:text-gray-400">
                                            {{ item.product.code }} -
                                        </span>
                                        {{ item.product.categoryName }} {{ item.product.name }}
                                    </p>
                                </div>
                                <span class="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                                    x{{ item.quantity }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-200 mt-6">
                    {{ $t('orderCompleted.status', 'Status') }}
                </h3>
                <OrderStatusTimeline :order="orderResponse.order" class="mt-6" />
            </div>

            <!-- Loading State -->
            <div v-else class="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ $t('orderCompleted.loading', 'Loading order details...') }}
                </p>
            </div>

            <!-- Return Home Button -->
            <div class="mt-6">
                <NuxtLink
                    to="/"
                    class="w-full flex items-center justify-center px-4 py-2.5 rounded-lg bg-tsb-one hover:bg-tsb-four text-sm font-medium text-black transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-900"
                >
                    {{ $t('orderCompleted.returnHome', 'Return to Home') }}
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type {EventData, OrderResponse} from '@/types'
import {definePageMeta, onMounted, useAsyncData, useCartStore, useNuxtApp, useRoute, watch} from '#imports';
import OrderStatusTimeline from '@/components/order/OrderStatusTimeline.vue'

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

const updateOrderById = async (orderId: string) => {
    try {
        orderResponse.value = await $api(`/orders/${orderId}`)
    } catch (error) {
        console.error('Error fetching order details:', error)
    }
}

const initSseListener = () => {
    const { $sse } = useNuxtApp()
    if (!$sse) {
        console.error('$sse is undefined; make sure the SSE plugin is properly registered on the client.')
        return
    }
    // Watch the reactive SSE events array and update orders when a new event is detected.
    watch(
        () => $sse.events.value,
        (events) => {
            events.forEach((ev: EventData) => {
                if (ev.orderID === orderResponse.value?.order.id) {
                    updateOrderById(ev.orderID)
                }
            })
        },
        { deep: true }
    )
}

onMounted(() => {
    if (orderId) {
        cartStore.clearCart()
        cartStore.setCartVisibility(false)
        initSseListener()
    }
})

</script>
