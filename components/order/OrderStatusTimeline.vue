<template>
    <div :class="compact ? 'py-0' : 'py-2'">
        <!-- Stepping stones path -->
        <div class="flex items-center" :class="compact ? 'gap-0' : 'gap-0'">
            <template v-for="(status, index) in statuses" :key="status">
                <!-- Stone -->
                <div class="flex-shrink-0 flex items-center justify-center" :class="stoneWrapperClasses(index)">
                    <div :class="stoneClasses(index)">
                        <!-- Checkmark for completed-last stone -->
                        <svg
                            v-if="isCompletedLast(index)"
                            class="text-white"
                            :class="compact ? 'w-1.5 h-1.5' : 'w-2 h-2'"
                            viewBox="0 0 12 12"
                            fill="none"
                        >
                            <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" :stroke-width="compact ? '2.5' : '2'" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </div>
                </div>

                <!-- Connecting path (not after last stone) -->
                <div v-if="index < statuses.length - 1" class="flex-1 h-0" :class="pathClasses(index)" />
            </template>
        </div>

        <!-- Full mode: icon + title + next step hint -->
        <div v-if="!compact" class="mt-3 flex items-center gap-2">
            <div
                class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                :class="completed ? 'bg-emerald-100' : 'bg-red-50'"
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

// ── Stone helpers ──

const isCurrent = (index: number) => index === currentIndex.value && !completed.value
const isCompletedLast = (index: number) => completed.value && index === statuses.value.length - 1
const isPast = (index: number) => {
    if (completed.value) return index < statuses.value.length - 1
    return index < currentIndex.value
}
const isFuture = (index: number) => !completed.value && index > currentIndex.value

const stoneWrapperClasses = (index: number) => {
    if (compact) {
        return isCurrent(index) ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'
    }
    return isCurrent(index) ? 'w-4 h-4' : isCompletedLast(index) ? 'w-3 h-3' : 'w-2.5 h-2.5'
}

const stoneClasses = (index: number) => {
    const base = 'rounded-full transition-all duration-500 flex items-center justify-center'

    if (isCurrent(index)) {
        return compact
            ? `${base} w-2.5 h-2.5 bg-white ring-1.5 ring-red-400`
            : `${base} w-4 h-4 bg-white ring-2 ring-red-400 stone-ripple`
    }

    if (isCompletedLast(index)) {
        return compact
            ? `${base} w-2 h-2 bg-emerald-500`
            : `${base} w-3 h-3 bg-emerald-500`
    }

    if (isPast(index)) {
        return compact
            ? `${base} w-1.5 h-1.5 bg-emerald-500`
            : `${base} w-2.5 h-2.5 bg-emerald-500`
    }

    // Future
    return compact
        ? `${base} w-1.5 h-1.5 border border-gray-300 bg-transparent`
        : `${base} w-2.5 h-2.5 border-[1.5px] border-gray-300 bg-transparent`
}

const pathClasses = (index: number) => {
    const baseWidth = compact ? 'border-t-[1.5px]' : 'border-t-2'

    // All completed
    if (completed.value) {
        return `${baseWidth} border-solid border-emerald-400`
    }

    // Past → Past
    if (index < currentIndex.value - 1) {
        return `${baseWidth} border-solid border-emerald-400`
    }

    // Past → Current (transition)
    if (index === currentIndex.value - 1) {
        return `${baseWidth} border-solid border-emerald-400`
    }

    // Current → Next (gradient dashed)
    if (index === currentIndex.value) {
        return `${baseWidth} zen-path-transition`
    }

    // Future → Future (raked sand)
    if (isFuture(index)) {
        return `${baseWidth} zen-path-future`
    }

    return `${baseWidth} border-solid border-gray-200`
}
</script>

<style scoped>
/* ── Water ripple on current stone ── */
.stone-ripple {
    animation: ripple 2s ease-out infinite;
}

@keyframes ripple {
    0% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.35); }
    70% { box-shadow: 0 0 0 7px rgba(248, 113, 113, 0); }
    100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); }
}

/* ── Current → Next transition path ── */
.zen-path-transition {
    border-style: dashed;
    border-color: #9ca3af; /* gray-400 */
    background-image: linear-gradient(to right, #34d399 30%, #d1d5db 70%);
    background-size: 100% 2px;
    background-repeat: no-repeat;
    background-position: center;
    border-image: linear-gradient(to right, #34d399, #d1d5db) 1;
}

/* ── Future dashed zen sand path ── */
.zen-path-future {
    border-style: dashed;
    border-color: #d1d5db; /* gray-300 */
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
    .stone-ripple {
        animation: none;
        box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
    }
}
</style>
