<template>
    <div>
        <div>
            {{ $t('me.orders.title') }}
        </div>
        <ul v-if="orders">
            <li v-for="order in orders" :key="order.id">
                {{ order.id }}
                <ul>
                    <li v-for="(item, index) in order.products" :key="index">
                        {{ item.product.name }} x {{ item.quantity }}
                    </li>
                </ul>
            </li>
        </ul>
    </div>
</template>

<script lang="ts" setup>

import { useNuxtApp, useI18n, useAsyncData, definePageMeta, useAuthStore } from '#imports'
import type { Order } from '@/types'

definePageMeta({
    middleware: ['auth']
})

const { $apiBaseUrl } = useNuxtApp()
const { locale: userLocale } = useI18n()
const authStore = useAuthStore()

// Check if user is authenticated

const { data: orders } = await useAsyncData(
    'orders',
    () => $fetch<Order[]>(`${$apiBaseUrl()}/me/orders`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authStore.accessToken}`,
            'Accept-Language': userLocale.value
        },
    })
)
console.log(orders.value)

</script>
