<template>
    <div class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <!-- Card -->
        <div class="max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
            <h1 class="text-3xl font-bold">Order Completed</h1>
            <p class="mt-4 text-gray-600">
                Thank you for your purchase! Your order
                <span v-if="order" class="font-semibold">#{{ orderId }}</span> was completed successfully.
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
                            <li v-for="item in order.products" :key="item.product.id">
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
                <NuxtLink class="inline-block px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600"
                          to="/">
                    Return to Home
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type {Order} from '@/types'
import {useNuxtApp, useRoute} from '#imports';
import {useAsyncData} from "#app";

const route = useRoute()
const {$api} = useNuxtApp()

const orderId = route.params.orderId as string

const {data: order} = await useAsyncData<Order>('order', () =>
    $api(`/orders/${orderId}`)
);
</script>
