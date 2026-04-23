<template>
    <button
        type="button"
        @click="open = true"
        :aria-label="chipAriaLabel"
        :class="[
            'inline-flex min-h-11 items-center gap-1.5 rounded-xl font-medium transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 max-w-full',
            compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs',
            stateClasses
        ]"
    >
        <!-- Status dot (in-zone / out-of-zone) -->
        <span
            v-if="state === 'inZone' || state === 'outOfZone'"
            :class="[
                'w-1.5 h-1.5 rounded-full shrink-0',
                state === 'inZone' ? 'bg-emerald-500' : 'bg-red-500'
            ]"
            aria-hidden="true"
        />
        <!-- Icon by state -->
        <img
            v-if="state === 'pickup'"
            src="/icons/shopping-bag-icon.svg"
            alt=""
            aria-hidden="true"
            class="w-4 h-4 shrink-0"
        />
        <img
            v-else
            src="/icons/moped-icon.svg"
            alt=""
            aria-hidden="true"
            class="w-4 h-4 shrink-0"
        />

        <!-- Label -->
        <span class="truncate">{{ chipLabel }}</span>

        <!-- Trailing caret (hidden in compact mode to save horizontal space) -->
        <svg
            v-if="!compact"
            class="w-3 h-3 shrink-0 opacity-60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
        >
            <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </button>
    <DeliveryZoneModal v-model:open="open" />
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { DELIVERY_ZONE_METERS } from '~/lib/delivery'
import DeliveryZoneModal from '~/components/delivery/DeliveryZoneModal.vue'
import { useCartStore } from '@/stores/cart'
import { useI18n } from 'vue-i18n'

const { compact = false } = defineProps<{
    compact?: boolean
}>()

const open = ref(false)
const cartStore = useCartStore()
const { t } = useI18n()

type ChipState = 'notSet' | 'inZone' | 'outOfZone' | 'pickup'

const state = computed<ChipState>(() => {
    if (cartStore.collectionOption === 'PICKUP') return 'pickup'
    if (!cartStore.address) return 'notSet'
    const d = cartStore.address.distance ?? 0
    return d < DELIVERY_ZONE_METERS ? 'inZone' : 'outOfZone'
})

const distanceKm = computed(() =>
    cartStore.address ? ((cartStore.address.distance ?? 0) / 1000).toFixed(1) : '0',
)

const chipLabel = computed(() => {
    switch (state.value) {
        case 'notSet': return t(compact ? 'delivery.chip.verifyCompact' : 'delivery.chip.verify')
        case 'inZone': return t('delivery.chip.inZone', { km: distanceKm.value })
        case 'outOfZone': return t(compact ? 'delivery.chip.outOfZoneCompact' : 'delivery.chip.outOfZone')
        case 'pickup': return t(compact ? 'delivery.chip.pickupCompact' : 'delivery.chip.pickup')
        default: return ''
    }
})

const chipAriaLabel = computed(() => `${chipLabel.value} — ${t('delivery.chip.actionHint')}`)

const stateClasses = computed(() => {
    switch (state.value) {
        case 'notSet':
            return 'bg-white text-gray-700 border border-gray-200 hover:bg-tsb-four/40 hover:text-red-700 hover:border-red-200'
        case 'inZone':
            return 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
        case 'outOfZone':
            return 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
        case 'pickup':
            return 'bg-tsb-four text-red-700 border border-red-200/60 hover:bg-red-100'
        default:
            return ''
    }
})
</script>
