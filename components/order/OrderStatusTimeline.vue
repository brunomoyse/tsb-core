<template>
    <div class="mt-4 mx-auto max-w-3xl">
        <div class="space-y-4">
            <div
                v-for="(status, index) in statuses"
                :key="status"
                class="flex items-center p-3 rounded-lg transition-colors"
                :class="[
                        index < currentIndex
                            ? 'border border-green-100 bg-green-50 dark:bg-gray-700'
                            : index === currentIndex
                                ? 'border border-yellow-300 bg-yellow-50 dark:bg-gray-900'
                                : 'border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
                    ]"
            >
                <!-- Icon -->
                <div class="relative flex-shrink-0 mr-3">
                        <span
                            :class="iconBackgroundClass(index)"
                            class="flex h-8 w-8 items-center justify-center rounded-lg"
                        >
                            <span
                                v-if="index === currentIndex"
                                class="absolute inset-0 rounded-lg bg-yellow-300 opacity-75 animate-ping"
                            ></span>
                            <img
                                :src="index < currentIndex ? '/icons/status/mdi-check.svg' : `/icons/status/${iconMapping[status]}.svg`"
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
import {computed, defineProps} from 'vue'
import {useI18n} from 'vue-i18n'
import type {Order} from '@/types'

const props = defineProps<{ order: Order }>()
const {t} = useI18n()

// Define the statuses in the order they should appear.
const statuses = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'AWAITING_PICK_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED'
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
        title: 'Order placed',
        //description: '19 Nov 2023, 10:45'
    },
    CONFIRMED: {
        title: 'Confirmed by the restaurant',
        //description: '19 Nov 2023, 10:47'
    },
    PREPARING: {
        title: 'Preparing your order',
        //description: '22 Nov 2023, 12:27'
    },
    AWAITING_PICK_UP: {
        title: 'Awaiting pick-up',
        //description: '23 Nov 2023, 15:15'
    },
    OUT_FOR_DELIVERY: {
        title: 'Out for delivery',
        //description: 'Products being delivered'
    },
    DELIVERED: {
        title: 'Delivered',
        //description: 'Products delivered'
    }
}

const getStatusTitle = (status: string): string => {
    return statusDetails[status]?.title || t(`me.orders.status.${status.toLowerCase()}`)
}

const getStatusDescription = (status: string): string => {
    return statusDetails[status]?.description || ''
}
</script>
