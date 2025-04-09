<template>
    <div class="mt-6 mx-auto max-w-4xl">
        <div class="rounded-lg bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <ol class="relative border-l border-gray-200 dark:border-gray-700">
                <li v-for="(status, index) in statuses" :key="status" class="mb-10 ml-6">
                  <span
                      :class="iconBackgroundClass(index)"
                      class="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-8 ring-white dark:ring-gray-800"
                  >
               <span
                   v-if="index === currentIndex"
                   class="absolute inset-0 rounded-full bg-yellow-300 opacity-75 animate-ping"
               ></span>
            <img
                :src="index < currentIndex ? '/icons/status/mdi-check.svg' : `/icons/status/${iconMapping[status]}.svg`"
                alt=""
                class="h-4 w-4"
            />
          </span>
                    <h4 class="mb-1 text-base font-semibold text-gray-900 dark:text-white">
                        {{ getStatusTitle(status) }}
                    </h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ getStatusDescription(status) }}
                    </p>
                </li>
            </ol>
            <div class="mt-4">
                <a
                    class="flex w-full items-center justify-center rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                    href="#"
                >
                    Order Details
                </a>
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
const statusDetails: Record<string, { title: string; description: string }> = {
    PENDING: {
        title: 'Order placed',
        description: '19 Nov 2023, 10:45'
    },
    CONFIRMED: {
        title: 'Confirmed by the restaurant',
        description: '19 Nov 2023, 10:47'
    },
    PREPARING: {
        title: 'Preparing your order',
        description: '22 Nov 2023, 12:27'
    },
    AWAITING_PICK_UP: {
        title: 'Awaiting pick-up',
        description: '23 Nov 2023, 15:15'
    },
    OUT_FOR_DELIVERY: {
        title: 'Out for delivery',
        description: 'Products being delivered'
    },
    DELIVERED: {
        title: 'Delivered',
        description: 'Products delivered'
    }
}

const getStatusTitle = (status: string): string => {
    return statusDetails[status]?.title || t(`me.orders.status.${status.toLowerCase()}`)
}

const getStatusDescription = (status: string): string => {
    return statusDetails[status]?.description || ''
}
</script>
