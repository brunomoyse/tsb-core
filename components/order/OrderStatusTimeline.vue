<template>
    <div class="py-1">
        <div class="relative pl-6">
            <!-- Vertical line -->
            <div class="absolute left-[7px] top-1 bottom-1 w-[2px] rounded-full bg-gray-100" />

            <div v-for="(status, index) in statuses" :key="status" class="relative flex items-start" :class="index > 0 ? 'mt-3' : ''">
                <!-- Dot on the vertical line -->
                <div class="absolute -left-6 top-[3px] flex items-center justify-center">
                    <!-- Current step: ring with pulse -->
                    <div v-if="isCurrent(index)" class="w-4 h-4 rounded-full bg-white ring-2 ring-red-400 stone-ripple" />

                    <!-- Completed last: green checkmark -->
                    <div v-else-if="isCompletedLast(index)" class="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </div>

                    <!-- Past step: small green dot -->
                    <div v-else-if="isPast(index)" class="w-2.5 h-2.5 rounded-full bg-emerald-500" />

                    <!-- Future step: hollow gray dot -->
                    <div v-else class="w-2.5 h-2.5 rounded-full border-[1.5px] border-gray-300 bg-white" />
                </div>

                <!-- Status label -->
                <div class="min-w-0">
                    <span
                        class="text-sm leading-tight"
                        :class="isCurrent(index)
                            ? 'font-medium text-gray-900'
                            : isPast(index) || isCompletedLast(index)
                                ? 'text-gray-500'
                                : 'text-gray-300'"
                    >
                        {{ getStatusTitle(status) }}
                    </span>
                    <!-- Next step hint on current -->
                    <span v-if="isCurrent(index) && nextStatus" class="block text-xs text-gray-400 mt-0.5">
                        {{ $t('me.orders.nextStep') }}: {{ getStatusTitle(nextStatus) }}
                    </span>
                </div>
            </div>
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
    0% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.35); }
    70% { box-shadow: 0 0 0 6px rgba(248, 113, 113, 0); }
    100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); }
}

@media (prefers-reduced-motion: reduce) {
    .stone-ripple {
        animation: none;
        box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
    }
}
</style>
