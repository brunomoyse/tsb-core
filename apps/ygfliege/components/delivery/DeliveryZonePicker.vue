<template>
    <div class="space-y-5">
        <!-- Collection mode toggle (matches homepage switch) -->
        <div class="flex gap-1 p-1 bg-gray-50 border border-gray-200 rounded-xl" role="radiogroup" :aria-label="$t('delivery.modal.modeLabel')">
            <button
                type="button"
                role="radio"
                :aria-checked="cartStore.collectionOption === 'DELIVERY'"
                @click="setMode('DELIVERY')"
                :class="[
                    'flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-ygf-orange-300 focus:outline-none',
                    cartStore.collectionOption === 'DELIVERY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                ]"
            >
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 16v1a2 2 0 0 0 4 0v-5h-3a3 3 0 0 0 -3 3v1h10a6 6 0 0 1 5 -4v-5a2 2 0 0 0 -2 -2h-1"/><path d="M6 9l3 0"/></svg>
                {{ $t('delivery.modal.deliveryTab') }}
            </button>
            <button
                type="button"
                role="radio"
                :aria-checked="cartStore.collectionOption === 'PICKUP'"
                @click="setMode('PICKUP')"
                :class="[
                    'flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-ygf-orange-300 focus:outline-none',
                    cartStore.collectionOption === 'PICKUP' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                ]"
            >
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/></svg>
                {{ $t('delivery.modal.pickupTab') }}
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
                        class="shrink-0 text-xs font-medium text-ygf-orange-600 hover:text-ygf-orange-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange-300 rounded"
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
                    : 'bg-ygf-orange-50 border-ygf-orange-200 text-ygf-orange-800'"
                role="status"
                aria-live="polite"
            >
                <div class="flex items-start gap-3">
                    <span
                        class="shrink-0 inline-flex w-7 h-7 items-center justify-center rounded-full"
                        :class="inZone ? 'bg-emerald-100 text-emerald-700' : 'bg-ygf-orange-100 text-ygf-orange-700'"
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
                            class="mt-3 inline-flex items-center gap-1.5 min-h-11 rounded-xl bg-white border border-ygf-orange-200 px-3 py-2 text-xs font-semibold text-ygf-orange-700 hover:bg-ygf-orange-100 transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange-300"
                        >
                            <img src="/icons/shopping-bag-icon.svg" alt="" aria-hidden="true" class="w-3.5 h-3.5" />
                            {{ $t('delivery.modal.switchToPickup') }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- PICKUP branch -->
        <div
            v-else
            class="rounded-2xl border border-ygf-orange-200/60 bg-ygf-orange-100 p-4 text-ygf-orange-800"
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
                    'min-h-11 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange-300',
                    canConfirm
                        ? 'bg-ygf-orange-500 hover:bg-ygf-orange-600 shadow-sm shadow-red-200/60'
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
import type { Address } from '#engine/types'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import { DELIVERY_ZONE_METERS } from '#engine/lib/delivery'
import { formatAddress } from '#engine/utils/utils'
import { useCartStore } from '#engine/stores/cart'
import { useTracking } from '#engine/composables/useTracking'

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

const { brand } = useAppConfig()
const restaurantAddress = `${brand.address.street}\n${brand.address.postal} ${brand.address.city}`

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
