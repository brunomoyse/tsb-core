<template>
    <!-- Full-height container for a centered card -->
    <div class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <!-- Card -->
        <div class="max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
            <h1 class="text-3xl font-bold text-blue-600">Order Completed</h1>
            <p class="mt-4 text-gray-600">
                Thank you for your purchase! Your order
                <span class="font-semibold">#{{ orderId }}</span> was completed successfully.
            </p>

            <!-- If you fetched order details, display them here -->
            <div v-if="order" class="mt-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-2">Order Details</h2>
                <div class="space-y-4">
                    <!-- Example: show order creation time -->
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

                    <!-- Insert more details as needed -->
                </div>
            </div>
            <!-- If we haven’t yet loaded order details, show a placeholder -->
            <div v-else>
                <p class="text-sm text-gray-500 mt-4">Loading order details...</p>
            </div>

            <!-- A button to go back home or to some other page -->
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
import type { Order } from "@/types"
// Access the dynamic route parameter (:orderId)
const route = useRoute()
const orderId = route.params.orderId

const authStore = useAuthStore()
const { $apiBaseUrl } = useNuxtApp()

// Force client-side fetch and pass the Authorization header
const { data: order, error } = await useFetch<Order>(`/user/order/${orderId}`, {
  baseURL: $apiBaseUrl(),
  method: "GET",
  // Force the request to run in the browser, not SSR (to access the store)
  server: false,
  // Add the Bearer token from our authStore
  headers: {
    Authorization: `Bearer ${authStore.accessToken}`,
  },
})
</script>