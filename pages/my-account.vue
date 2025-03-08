<template>
    <div class="min-h-screen bg-tsb-two p-6 md:p-8">
        <!-- Page Header -->
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900">{{ $t('me.orders.title') }}</h1>
            <p class="mt-2 text-gray-500">Your recent purchase history</p>
        </header>

        <!-- Orders Grid -->
        <div v-if="orders" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <!-- Order Card -->
            <article
                v-for="order in orders"
                :key="order.id"
                class="group relative rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
                <!-- Order Header -->
                <div class="border-b border-gray-100 pb-4">
                    <div class="flex items-center justify-between">
                        <h3 class="font-semibold text-gray-700">Order #</h3>
                        <span
                            class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          {{ order.status }}
                        </span>
                    </div>
                    <p class="mt-2 text-sm text-gray-500">
                        {{
                            new Date(order.createdAt).toLocaleString("fr-BE", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit"
                            })
                        }}
                    </p>
                </div>

                <!-- Order Items -->
                <div class="mt-4 space-y-4">
                    <h4 class="text-sm font-medium text-gray-900">Items</h4>
                    <div class="space-y-3">
                        <div
                            v-for="(item, index) in order.products"
                            :key="index"
                            class="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                        >
                            <div>
                                <p class="text-sm font-medium text-gray-900">{{ item.product.name }}</p>
                                <p class="text-xs text-gray-500">{{ item.product.category }}</p>
                            </div>
                            <span class="text-sm font-medium text-gray-700">x{{ item.quantity }}</span>
                        </div>
                    </div>
                </div>

                <!-- Order Footer -->
                <div class="mt-6 border-t border-gray-100 pt-4">
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-500">Total</span>
                        <span class="font-medium text-gray-900">
              {{ new Intl.NumberFormat('fr-BE', {style: 'currency', currency: 'EUR'}).format(totalPrice(order)) }}
            </span>
                    </div>
                </div>
            </article>
        </div>

        <!-- Empty State -->
        <div v-else class="flex h-96 items-center justify-center rounded-2xl bg-white">
            <p class="text-gray-500">No orders found</p>
        </div>
    </div>
</template>

<script lang="ts" setup>

import {definePageMeta, useAsyncData, useAuthStore, useI18n, useNuxtApp} from '#imports'
import type {Order} from '@/types'

definePageMeta({
    middleware: ['auth']
})

const {$apiBaseUrl} = useNuxtApp()
const {locale: userLocale} = useI18n()
const authStore = useAuthStore()

const {data: orders} = await useAsyncData(
    'orders',
    () => $fetch<Order[]>(`${$apiBaseUrl()}/me/orders`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authStore.accessToken}`,
            'Accept-Language': userLocale.value
        },
    })
)

// Loop through the order's products and calculate the total price
const totalPrice = (order: Order) => {
    return order.products.reduce((acc, item) => acc + item.product.price * item.quantity, 0)
}

</script>
