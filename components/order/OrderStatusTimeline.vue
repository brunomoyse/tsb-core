<template>
    <div class="mt-4 mx-auto max-w-3xl">
        <div class="space-y-4">
            <div
                v-for="(status, index) in (order.orderType === 'DELIVERY' ? deliveryStatuses : pickUpStatuses)"
                :key="status"
                class="flex items-center p-3 rounded-lg transition-colors"
                :class="[
                        index < currentIndex
                            ? 'border border-green-100 bg-green-50 dark:bg-gray-700'
                            : index === currentIndex && !isOrderCompleted(order.orderStatus)
                                ? 'border border-yellow-300 bg-yellow-50 dark:bg-gray-900'
                                : isOrderCompleted(order.orderStatus)
                                    ? 'border border-green-100 bg-green-50 dark:bg-gray-700'
                                    :'border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
                    ]"
            >
                <!-- Icon -->
                <div class="relative flex-shrink-0 mr-3">
                        <span
                            :class="isOrderCompleted(order.orderStatus) ? 'bg-green-300' : iconBackgroundClass(index)"
                            class="flex h-8 w-8 items-center justify-center rounded-lg"
                        >
                            <span
                                v-if="index === currentIndex && !isOrderCompleted(order.orderStatus)"
                                class="absolute inset-0 rounded-lg bg-yellow-300 opacity-75 animate-ping"
                            ></span>
                            <img
                                :src="(index < currentIndex) || isOrderCompleted(order.orderStatus) ? '/icons/status/mdi-check.svg' : `/icons/status/${iconMapping[status]}.svg`"
                                alt=""
                                class="h-4 w-4"
                            />
                        </span>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {{ getStatusTitle(status) }}
                    </h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {{ getStatusDescription(status) }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import type {EventData, Order} from '@/types'
import {onMounted, useNuxtApp, watch} from "#imports";
import {toCamelCase} from "~/utils/utils";

const props = defineProps<{ order: Order }>()
const {t} = useI18n()

const emit = defineEmits(['updateOrder'])

// Define the statuses in the order they should appear.
const deliveryStatuses = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'AWAITING_PICK_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED'
]

const pickUpStatuses = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'AWAITING_PICK_UP',
    'PICKED_UP'
]

// Mapping from order status to the corresponding Material Design Icon file name.
const iconMapping: Record<string, string> = {
    PENDING: 'mdi-clock-outline',
    CONFIRMED: 'mdi-check-circle-outline',
    PREPARING: 'mdi-chef-hat',
    AWAITING_PICK_UP: 'mdi-timer-sand',
    OUT_FOR_DELIVERY: 'mdi-moped',
    DELIVERED: 'mdi-package-variant-closed-check',
    PICKED_UP: 'mdi-check-decagram',
    FAILED: 'mdi-alert-circle-outline',
    CANCELLED: 'mdi-cancel'
}

// Compute the index of the current order status.
const currentIndex = computed(() => {
    const statuses = props.order.orderType === 'DELIVERY' ? deliveryStatuses : pickUpStatuses
    const idx = statuses.indexOf(props.order.orderStatus)
    return idx === -1 ? 0 : idx
})

/**
 * Returns a background class for the icon container:
 * - Completed steps: a strong green background.
 * - Current step: a lighter yellow/green background.
 * - Future steps: a neutral gray background.
 */
function iconBackgroundClass(index: number): string {
    if (index < currentIndex.value) {
        return 'bg-green-300'
    } else if (index === currentIndex.value) {
        return 'bg-yellow-300'
    } else {
        return 'bg-gray-100 dark:bg-gray-700'
    }
}

// Mapping for status details (title and description).
// Adjust these values or integrate your order's data as needed.
const statusDetails: Record<string, { title: string; description?: string }> = {
    PENDING: {
        title: t('me.orders.status.details.title.pending'),
        //description: '19 Nov 2023, 10:45'
    },
    CONFIRMED: {
        title: t('me.orders.status.details.title.confirmed'),
        //description: '19 Nov 2023, 10:47'
    },
    PREPARING: {
        title: t('me.orders.status.details.title.preparing'),
        //description: '22 Nov 2023, 12:27'
    },
    AWAITING_PICK_UP: {
        title: t('me.orders.status.details.title.awaitingPickUp'),
        //description: '23 Nov 2023, 15:15'
    },
    OUT_FOR_DELIVERY: {
        title: t('me.orders.status.details.title.outForDelivery'),
        //description: 'Products being delivered'
    },
    DELIVERED: {
        title: t('me.orders.status.details.title.delivered'),
        //description: 'Products delivered'
    },
    PICKED_UP: {
        title: t('me.orders.status.details.title.pickedUp'),
        //description: 'Products picked up'
    },
}

const isOrderCompleted = (status: string) => {
    return status === "DELIVERED" || status === "PICKED_UP" || status === "CANCELLED" || status === "FAILED"
}

const getStatusTitle = (status: string): string => {
    return statusDetails[status]?.title || t(`me.orders.status.${toCamelCase(status)}`)
}

const getStatusDescription = (status: string): string => {
    return statusDetails[status]?.description || ''
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
                if (ev.orderID === props.order.id) {
                    emit('updateOrder', ev.orderID)
                }
            })
        },
        { deep: true }
    )
}

onMounted(() => {
    initSseListener()
})
</script>
