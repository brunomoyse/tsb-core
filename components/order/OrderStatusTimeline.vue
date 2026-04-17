<template>
    <div class="relative pl-4">
        <!-- Vertical line -->
        <div class="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-gray-200" />

        <div
            v-for="(status, index) in statuses"
            :key="status"
            class="relative flex items-center"
            :class="index > 0 ? 'mt-3.5' : ''"
        >
            <!-- Dot -->
            <div class="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <div
                    v-if="isCurrent(index)"
                    class="w-[7px] h-[7px] rounded-full bg-red-500 stone-ripple"
                />
                <div
                    v-else-if="isPast(index) || isCompletedLast(index)"
                    class="w-[7px] h-[7px] rounded-full bg-emerald-500"
                />
                <div
                    v-else
                    class="w-[7px] h-[7px] rounded-full border border-gray-300 bg-white"
                />
            </div>

            <!-- Label -->
            <span
                class="text-sm leading-tight"
                :class="isCurrent(index)
                    ? 'font-semibold text-gray-900'
                    : isPast(index) || isCompletedLast(index)
                        ? 'text-gray-600'
                        : 'text-gray-300'"
            >
                {{ getStatusTitle(status) }}
            </span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { Order } from '@/types'
import { computed } from 'vue'
import { toCamelCase } from '~/utils/utils'
import { useI18n } from 'vue-i18n'

const { order } = defineProps<{ order: Order }>()
const { t } = useI18n()

const deliveryStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'AWAITING_PICK_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']
const pickUpStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'AWAITING_PICK_UP', 'PICKED_UP']

const statuses = computed(() => order.type === 'DELIVERY' ? deliveryStatuses : pickUpStatuses)

const currentIndex = computed(() => statuses.value.indexOf(order.status))
const completed = computed(() => order.status === 'DELIVERED' || order.status === 'PICKED_UP')

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

const isCurrent = (index: number) => index === currentIndex.value && !completed.value
const isCompletedLast = (index: number) => completed.value && index === statuses.value.length - 1
const isPast = (index: number) => {
    if (completed.value) return index < statuses.value.length - 1
    return index < currentIndex.value
}
</script>

<style scoped>
.stone-ripple {
    animation: ripple 2s ease-out infinite;
}

@keyframes ripple {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); }
    70% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

@media (prefers-reduced-motion: reduce) {
    .stone-ripple {
        animation: none;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
    }
}
</style>
