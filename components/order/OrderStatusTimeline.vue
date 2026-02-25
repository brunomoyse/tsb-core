<template>
    <div :class="compact ? 'py-0' : 'py-2'">
        <div class="flex items-center gap-1">
            <div
                v-for="(status, index) in statuses"
                :key="status"
                class="flex-1 relative"
            >
                <!-- Progress bar segment -->
                <div
                    class="rounded-full transition-colors duration-500"
                    :class="[
                        compact ? 'h-1' : 'h-1.5',
                        index < currentIndex
                            ? 'bg-green-400'
                            : index === currentIndex && !completed
                                ? 'bg-yellow-400 animate-pulse'
                                : completed
                                    ? 'bg-green-400'
                                    : 'bg-gray-200'
                    ]"
                />
            </div>
        </div>

        <!-- Current status label (hidden in compact mode) -->
        <div v-if="!compact" class="mt-2.5 flex items-center gap-2">
            <div
                class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                :class="completed ? 'bg-green-100' : 'bg-yellow-100'"
            >
                <img
                    :src="completed ? '/icons/status/mdi-check.svg' : `/icons/status/${iconMapping[order.status]}.svg`"
                    alt=""
                    class="w-3.5 h-3.5"
                />
            </div>
            <div class="min-w-0">
                <span class="text-sm font-medium text-gray-800">{{ getStatusTitle(order.status) }}</span>
                <span v-if="nextStatus && !completed" class="text-xs text-gray-400 ml-1.5">
                    &middot; {{ $t('me.orders.nextStep') }}: {{ getStatusTitle(nextStatus) }}
                </span>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { Order } from '@/types'
import { computed } from 'vue'
import { toCamelCase } from '~/utils/utils'
import { useI18n } from 'vue-i18n'

const { order, compact } = defineProps<{ order: Order; compact?: boolean }>()
const { t } = useI18n()

const deliveryStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'AWAITING_PICK_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']
const pickUpStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'AWAITING_PICK_UP', 'PICKED_UP']

const statuses = computed(() => order.type === 'DELIVERY' ? deliveryStatuses : pickUpStatuses)

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

const currentIndex = computed(() => statuses.value.indexOf(order.status))
const completed = computed(() => order.status === 'DELIVERED' || order.status === 'PICKED_UP')

const nextStatus = computed(() => {
    const idx = currentIndex.value
    if (idx < 0 || idx >= statuses.value.length - 1) return null
    return statuses.value[idx + 1]
})

const statusDetails: Record<string, string> = {
    PENDING: t('me.orders.status.details.title.pending'),
    CONFIRMED: t('me.orders.status.details.title.confirmed'),
    PREPARING: t('me.orders.status.details.title.preparing'),
    AWAITING_PICK_UP: t('me.orders.status.details.title.awaitingPickUp'),
    OUT_FOR_DELIVERY: t('me.orders.status.details.title.outForDelivery'),
    DELIVERED: t('me.orders.status.details.title.delivered'),
    PICKED_UP: t('me.orders.status.details.title.pickedUp'),
}

const getStatusTitle = (status: string): string =>
    statusDetails[status] || t(`me.orders.status.${toCamelCase(status)}`)
</script>
