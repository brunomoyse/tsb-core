<template>
    <div class="space-y-5">
        <!-- Collection mode toggle -->
        <div
            class="grid grid-cols-2 gap-1 rounded-2xl bg-tsb-two p-1"
            role="radiogroup"
            :aria-label="$t('delivery.modal.modeLabel')"
        >
            <button
                type="button"
                role="radio"
                :aria-checked="cartStore.collectionOption === 'DELIVERY'"
                @click="setMode('DELIVERY')"
                :class="[
                    'min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300',
                    cartStore.collectionOption === 'DELIVERY'
                        ? 'bg-white text-red-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                ]"
            >
                <span class="inline-flex items-center gap-1.5">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="10" r="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    {{ $t('delivery.modal.deliveryTab') }}
                </span>
            </button>
            <button
                type="button"
                role="radio"
                :aria-checked="cartStore.collectionOption === 'PICKUP'"
                @click="setMode('PICKUP')"
                :class="[
                    'min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300',
                    cartStore.collectionOption === 'PICKUP'
                        ? 'bg-white text-red-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                ]"
            >
                <span class="inline-flex items-center gap-1.5">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M6 2l1.5 4h9L18 2M4 6h16l-1.5 14a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2L4 6z" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    {{ $t('delivery.modal.pickupTab') }}
                </span>
            </button>
        </div>

        <!-- DELIVERY branch -->
        <div v-if="cartStore.collectionOption === 'DELIVERY'" class="space-y-3">
            <!-- Current address pill (when already set) -->
            <div
                v-if="cartStore.address && !replaceAddress"
                class="rounded-2xl border border-gray-100 bg-gray-50 p-4"
            >
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="text-xs uppercase tracking-wider text-gray-400 mb-1">
                            {{ $t('delivery.modal.currentAddress') }}
                        </p>
                        <p class="text-sm text-gray-800 whitespace-pre-line break-words">
                            {{ formatAddress(cartStore.address) }}
                        </p>
                    </div>
                    <button
                        type="button"
                        @click="replaceAddress = true"
                        class="shrink-0 text-xs font-medium text-red-600 hover:text-red-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded"
                    >
                        {{ $t('delivery.modal.change') }}
                    </button>
                </div>
            </div>

            <!-- Autocomplete input -->
            <AddressAutocomplete
                v-if="!cartStore.address || replaceAddress"
                @update:address="handleAddressUpdate"
            />

            <!-- Status block -->
            <div
                v-if="cartStore.address && !replaceAddress"
                class="rounded-2xl border p-4 transition-colors"
                :class="inZone
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'"
                role="status"
                aria-live="polite"
            >
                <div class="flex items-start gap-3">
                    <span
                        class="shrink-0 inline-flex w-7 h-7 items-center justify-center rounded-full"
                        :class="inZone ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                        aria-hidden="true"
                    >
                        <svg v-if="inZone" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium">
                            {{ inZone
                                ? $t('delivery.modal.distanceOk')
                                : $t('delivery.modal.distanceTooFar') }}
                        </p>
                        <p class="text-xs mt-1 opacity-80">
                            {{ $t('delivery.modal.distanceValue', { km: distanceKm }) }}
                        </p>
                        <button
                            v-if="!inZone"
                            type="button"
                            @click="switchToPickup"
                            class="mt-3 inline-flex items-center gap-1.5 min-h-11 rounded-xl bg-white border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        >
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                <path d="M6 2l1.5 4h9L18 2M4 6h16l-1.5 14a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2L4 6z" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            {{ $t('delivery.modal.switchToPickup') }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- PICKUP branch -->
        <div
            v-else
            class="rounded-2xl border border-red-200/60 bg-tsb-four p-4 text-red-800"
        >
            <p class="text-xs uppercase tracking-wider opacity-60 mb-1">
                {{ $t('delivery.modal.pickupLabel') }}
            </p>
            <p class="text-sm font-medium whitespace-pre-line">{{ restaurantAddress }}</p>
            <p class="text-xs mt-2 opacity-80">{{ $t('delivery.modal.pickupHint') }}</p>
        </div>

        <!-- Footer actions -->
        <div class="flex items-center justify-end gap-2 pt-1">
            <button
                v-if="showCancel"
                type="button"
                @click="emit('cancel')"
                class="min-h-11 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
            >
                {{ $t('common.cancel') }}
            </button>
            <button
                type="button"
                @click="confirm"
                :disabled="!canConfirm"
                :class="[
                    'min-h-11 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300',
                    canConfirm
                        ? 'bg-red-500 hover:bg-red-600 shadow-sm shadow-red-200/60'
                        : 'bg-gray-300 cursor-not-allowed'
                ]"
            >
                {{ $t('delivery.modal.confirm') }}
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { Address } from '~/types'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import { DELIVERY_ZONE_METERS } from '~/lib/delivery'
import { formatAddress } from '~/utils/utils'
import { useCartStore } from '@/stores/cart'
import { useTracking } from '~/composables/useTracking'

const { showCancel = true } = defineProps<{
    showCancel?: boolean
}>()

const emit = defineEmits<{
    confirm: []
    cancel: []
}>()

const cartStore = useCartStore()
const { trackEvent } = useTracking()

const replaceAddress = ref(false)

const inZone = computed(() =>
    Boolean(cartStore.address) && (cartStore.address!.distance ?? 0) < DELIVERY_ZONE_METERS,
)

const distanceKm = computed(() =>
    cartStore.address ? ((cartStore.address.distance ?? 0) / 1000).toFixed(1) : '0',
)

const canConfirm = computed(() => {
    if (cartStore.collectionOption === 'PICKUP') return true
    return Boolean(cartStore.address) && inZone.value
})

const restaurantAddress = 'Rue de la Cathédrale 59\n4000 Liège'

const setMode = (mode: 'DELIVERY' | 'PICKUP') => {
    if (cartStore.collectionOption === mode) return
    trackEvent('collection_option_changed', { option: mode, source: 'delivery_zone_picker' })
    cartStore.collectionOption = mode
}

const handleAddressUpdate = (address: Address | null) => {
    cartStore.address = address
    replaceAddress.value = false
    if (address) {
        trackEvent('delivery_address_resolved', {
            distance_m: address.distance ?? 0,
            in_zone: (address.distance ?? 0) < DELIVERY_ZONE_METERS,
        })
    }
}

const switchToPickup = () => {
    trackEvent('delivery_out_of_zone_switch_pickup')
    cartStore.collectionOption = 'PICKUP'
}

const confirm = () => {
    if (!canConfirm.value) return
    emit('confirm')
}
</script>
