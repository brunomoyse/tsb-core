<template>
    <article class="bg-tsb-two rounded-2xl p-6 shadow-sm">
        <div class="border-b border-gray-100 pb-4">
            <h2 class="text-lg font-semibold text-gray-900">{{ $t('me.orders.title') }}</h2>
        </div>

        <!-- Loading State -->
        <div v-if="orderResponses === null" class="mt-6 text-center text-gray-500">
            {{ $t('me.orders.loading') }}
        </div>

        <!-- Orders List -->
        <div v-else-if="orderResponses?.length" class="mt-4 space-y-2">
            <div
                v-for="orderResponse in orderResponses"
                :key="orderResponse.order.id"
                class="bg-white rounded-xl border border-gray-100 transition-all"
            >
                <div
                    class="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                    @click="toggleOrder(orderResponse.order.id)"
                >
                    <div>
                        <h3 class="font-semibold text-gray-700">
                            {{ $t(`cart.${orderResponse.order.orderType.toLowerCase()}`) }}
                        </h3>
                        <p class="mt-1 text-sm text-gray-500">
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
                    </div>
                    <div class="flex items-center gap-2">
                        <span
                            class="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                            :class="getStatusColorClass(orderResponse.order.orderStatus)"
                        >
                            {{ getStatus(orderResponse.order.orderStatus) }}
                        </span>
                        <span :class="{ 'rotate-180': isExpanded(orderResponse.order.id) }"
                                              class="text-gray-400 transition-transform duration-200">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                            </svg>
                        </span>
                    </div>
                </div>

                <!-- Accordion Content -->
                <transition
                    enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="max-h-0 opacity-0"
                    enter-to-class="max-h-[1000px] opacity-100"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="max-h-[1000px] opacity-100"
                    leave-to-class="max-h-0 opacity-0"
                >
                    <div v-show="isExpanded(orderResponse.order.id)" class="px-4 pb-4">
                        <!-- Delivery Address Section -->
                        <div v-if="orderResponse.address" class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h4 class="text-sm font-semibold text-gray-700">
                                {{ $t('checkout.deliveryAddress', 'Delivery Address') }}
                            </h4>
                            <p class="mt-1 text-sm text-gray-600">
                                {{ formatAddress(orderResponse.address) }}
                            </p>
                        </div>

                        <!-- Order Items Section -->
                        <div class="space-y-4">
                            <div class="space-y-3">
                                <div
                                    v-for="(item, index) in orderResponse.products"
                                    :key="index"
                                    class="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                                >
                                    <div>
                                        <p class="text-sm font-medium text-gray-900">
                                            {{ item.product.code ? item.product.code + ' - ' : '' }}
                                            {{ item.product.categoryName + ' - ' + item.product.name }}
                                        </p>
                                    </div>
                                    <span class="text-sm font-medium text-gray-700">
                        x{{ item.quantity }}
                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Order Footer -->
                        <div class="mt-6 border-t border-gray-100 pt-4">
                            <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">
                    {{ $t('me.orders.total') }}
                </span>
                                <span class="font-medium text-gray-900">
                    {{
                                        new Intl.NumberFormat('fr-BE', {
                                            style: 'currency',
                                            currency: 'EUR'
                                        }).format(parseFloat(orderResponse.order.totalPrice))
                                    }}
                </span>
                            </div>
                        </div>
                    </div>
                </transition>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="mt-6 text-center text-gray-500">
            {{ $t('me.orders.empty') }}
        </div>
    </article>
</template>

<script lang="ts" setup>
import type {PropType} from '#imports'
import type {OrderResponse} from '~/types'
import {ref} from 'vue'
import {useI18n} from "vue-i18n";

const {t} = useI18n()

defineProps({
    orderResponses: {
        type: Array as PropType<OrderResponse[] | null>,
        required: true
    }
})

const expandedOrders = ref<Set<string>>(new Set())

const toggleOrder = (orderId: string) => {
    if (expandedOrders.value.has(orderId)) {
        expandedOrders.value.delete(orderId)
    } else {
        expandedOrders.value.add(orderId)
    }
}

const isExpanded = (orderId: string) => expandedOrders.value.has(orderId)

const getStatus = (status: string) => {
    switch (status) {
        case 'PENDING':
            return t('me.orders.status.pending')
        case 'CONFIRMED':
            return t('me.orders.status.confirmed')
        case 'PREPARING':
            return t('me.orders.status.preparing')
        case 'AWAITING_PAYMENT':
            return t('me.orders.status.awaitingPayment')
        case 'PICKED_UP':
            return t('me.orders.status.pickedUp')
        case 'OUT_FOR_DELIVERY':
            return t('me.orders.status.outForDelivery')
        case 'DELIVERED':
            return t('me.orders.status.delivered')
        case 'CANCELLED':
            return t('me.orders.status.cancelled')
        case 'FAILED':
            return t('me.orders.status.failed')
        default:
            return ''
    }
}

// Status color mapping
const getStatusColorClass = (status: string): string => {
    const map: Record<string, string> = {
        PENDING: 'bg-orange-500',
        CONFIRMED: 'bg-blue-500',
        PREPARING: 'bg-cyan-500',
        AWAITING_PICK_UP: 'bg-amber-500',
        OUT_FOR_DELIVERY: 'bg-purple-500',
        DELIVERED: 'bg-green-500',
        PICKED_UP: 'bg-green-500',
        FAILED: 'bg-red-500',
        CANCELLED: 'bg-red-500',
    }

    return map[status] || 'bg-gray-400'
}

</script>

<style>
/* Smooth transition for chevron */
.rotate-180 {
    transform: rotate(180deg);
}
</style>
