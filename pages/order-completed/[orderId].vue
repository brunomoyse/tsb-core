<template>
    <!-- Full-height container for a centered card -->
    <div class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <!-- Card -->
        <div class="max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
            <h1 class="text-3xl font-bold">Order Completed</h1>
            <p class="mt-4 text-gray-600">
                Thank you for your purchase! Your order
                <span class="font-semibold" v-if="order">#{{ orderId }}</span> was completed successfully.
            </p>

            <!-- Order Details -->
            <div v-if="order" class="mt-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-2">Order Details</h2>
                <div class="space-y-4">
                    <!-- Order creation time -->
                    <p class="text-gray-700">
                        <span class="font-medium">Created At:</span>
                        {{ order.createdAt }}
                    </p>

                    <!-- List of items -->
                    <div>
                        <h3 class="font-medium text-gray-800 mb-1">Items:</h3>
                        <ul class="list-disc list-inside text-gray-600">
                            <li v-for="item in order.items" :key="item.product.id">
                                {{ item.quantity }} x {{ item.product.name }} ({{ item.product.price }} EUR each)
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <!-- Placeholder while loading -->
            <div v-else>
                <p class="text-sm text-gray-500 mt-4">Loading order details...</p>
            </div>

            <!-- Return Home Button -->
            <div class="mt-8 text-right">
                <NuxtLink to="/"
                    class="inline-block px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600">
                    Return to Home
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Order } from '@/types'
import { useRoute, useNuxtApp, useFetch, useAuthStore } from '#imports';
const { $apiBaseUrl } = useNuxtApp()
const route = useRoute()
const authStore = useAuthStore()

const orderId = route.params.orderId as string

const baseUrl = $apiBaseUrl()

const { data: order, error } = await useFetch<Order>(`${baseUrl}/user/order/${orderId}`, {
    headers: {
        Authorization: `Bearer ${authStore.accessToken}`
    },
    credentials: 'include'
})
</script>