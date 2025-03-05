<template>
    <div>
        {{ $t('me.orders.title')}}
    </div>
    <ul>
        <li>Order 1</li>
    </ul>
</template>

<script lang="ts" setup>

import { useFetch, useNuxtApp, useI18n, useAsyncData, definePageMeta } from '#imports'

definePageMeta({
  middleware: ['auth']
})

const { $apiBaseUrl } = useNuxtApp()
const { locale: userLocale } = useI18n()

// Check if user is authenticated

const { data: orders } = await useAsyncData(
  'orders',
  () => $fetch<Order[]>(`${$apiBaseUrl()}/me/orders`, {
    headers: { 'accept-language': userLocale.value }
  })
)

</script>
