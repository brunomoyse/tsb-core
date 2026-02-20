<template>
    <div class="min-h-screen bg-tsb-one pt-8 md:px-8">
        <!-- Widgets Grid -->
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                <!-- Personal Information Widget -->
                <div class="lg:col-span-1 lg:row-span-1">
                    <ProfileWidget/>
                </div>
                <!-- Orders Widget -->
                <div class="lg:col-span-1 lg:row-span-1">
                    <OrdersWidget />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {definePageMeta} from '#imports'
import OrdersWidget from '@/components/me/OrdersWidget.vue'
import ProfileWidget from '@/components/me/ProfileWidget.vue'

definePageMeta({
    public: false
})

const { t } = useI18n()

useSeoMeta({
    title: t('schema.myAccount.title'),
    robots: 'noindex,nofollow',
})
</script>
