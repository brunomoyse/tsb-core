<template>
    <div class="min-h-screen bg-tsb-one md:px-8">
        <!-- Widgets Grid -->
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                <!-- Personal Information Widget -->
                <div class="lg:col-span-1 lg:row-span-1">
                    <ProfileWidget/>
                </div>
                <!-- Orders Widget -->
                <div class="lg:col-span-1 lg:row-span-1">
                    <OrdersWidget :orders="orders"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {definePageMeta, useAsyncData, useNuxtApp} from '#imports'
import OrdersWidget from '@/components/me/OrdersWidget.vue'
import ProfileWidget from '@/components/me/ProfileWidget.vue'
import type {Order} from '~/types'

definePageMeta({
    public: false
})

const {$api} = useNuxtApp()

const {data: orders} = await useAsyncData<Order[]>('orders', () =>
    $api('/me/orders')
);
</script>
