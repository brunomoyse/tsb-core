<template>
    <section class="bg-white rounded-lg shadow p-4 w-full mx-auto space-y-6">
        <h2 class="text-xl font-semibold mb-4">
            {{ $t('checkout.collection', 'Delivery / Pickup') }}
        </h2>

        <!-- Delivery/Pickup Options -->
        <div class="flex gap-4 mb-6" role="radiogroup" :aria-label="$t('checkout.collection')">
            <button
                v-for="option in collectionOptions"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="cartStore.collectionOption === option.value"
                :data-testid="option.value === 'DELIVERY' ? 'checkout-option-delivery' : 'checkout-option-pickup'"
                @click="setDeliveryOption(option.value as 'DELIVERY' | 'PICKUP')"
                :class="[
          'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md text-left',
          cartStore.collectionOption === option.value ? 'border-red-300 bg-tsb-four' : 'border-gray-200 bg-white'
        ]"
            >
                <img :src="option.icon" :alt="option.label" class="w-10 h-10 mb-2" />
                <span class="font-semibold">{{ option.label }}</span>
            </button>
        </div>

        <!-- Address Section (if DELIVERY) -->
        <div v-if="cartStore.collectionOption === 'DELIVERY'" class="flex flex-col gap-2">
            <label class="font-medium">
                {{ $t('checkout.deliveryAddress', 'Delivery Address') }} <span class="text-red-400">*</span>
            </label>
            <div v-if="cartStore.address" class="flex flex-col text-gray-700 bg-gray-50 rounded p-3">
                <span>{{ formatAddress(cartStore.address) }}</span>
                <button
                    @click="openAddressModal"
                    class="text-blue-600 underline text-sm mt-2 self-start"
                >
                    {{ $t('checkout.editAddress', 'Edit Address') }}
                </button>
                <p v-if="cartStore.address.distance >= 9000" class="mt-2 text-sm text-red-600 font-medium">
                    {{ $t('checkout.tooFar') }}
                </p>
                <p v-else-if="cartStore.address.distance" class="mt-2 text-sm text-gray-500">
                    {{ $t('checkout.addressDistanceKm', { distance: (cartStore.address.distance / 1000).toFixed(1) }) }}
                </p>
            </div>
            <!-- Prominent "Add address" placeholder card -->
            <button
                v-else
                @click="openAddressModal"
                class="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 hover:border-red-400 hover:bg-red-50 transition-colors cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="font-medium text-gray-700">{{ $t('checkout.addAddress', 'Add Address') }}</span>
                <span class="text-sm text-gray-500">{{ $t('checkout.noAddress', 'No address selected') }}</span>
            </button>

            <label for="addressExtra" class="block text-sm text-gray-700 mt-4">
                {{ $t('checkout.addressComment', 'Additional Info for Address') }}
                <span class="text-gray-400 font-normal">{{ $t('checkout.optional', '(optional)') }}</span>
            </label>
            <textarea
                id="addressExtra"
                v-model="addressExtra"
                rows="3"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                :placeholder="$t('checkout.addressCommentPlaceholder', 'e.g. Ring the bell twice')"
            ></textarea>
        </div>

        <!-- Preferred Time / Status -->
        <div class="mt-4">
            <!-- Ordering disabled -->
            <p v-if="isOrderingDisabled" class="text-orange-600 font-semibold">
                {{ $t('checkout.orderDisabled', 'Ordering is temporarily disabled.') }}
            </p>

            <!-- Restaurant closed and no same-day slots -->
            <p v-else-if="!isOpen && availableFixedSlots.length === 0" class="text-red-600 font-semibold">
                {{ $t('checkout.noRemainingSlotsToday', 'No remaining time slots for today.') }}
            </p>
            <div v-else>
                <p v-if="!isOpen" class="text-amber-700 text-sm mb-2">
                    {{ $t('checkout.asapUnavailableWhileClosed', 'ASAP is unavailable while closed. Please select a fixed time for today.') }}
                </p>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    {{ $t('checkout.preferredTime', 'Preferred Time') }}
                </label>

                <!-- Open: ASAP + slots; Closed: fixed slots only -->
                <select
                    v-model="preferredReadyTime"
                    data-testid="checkout-preferred-time"
                    class="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                >
                    <option v-if="isOpen" value="ASAP">{{ asapLabel }}</option>
                    <option
                        v-for="slot in availableFixedSlots"
                        :key="slot.value"
                        :value="slot.value"
                    >
                        {{ slot.label }}
                    </option>
                </select>
            </div>

        </div>
    </section>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatAddress } from '~/utils/utils'
import { getAvailableFixedSlotsToday } from '~/utils/openingHours'
import { useCartStore } from '@/stores/cart'
import { useI18n } from 'vue-i18n'
import { useTracking } from '~/composables/useTracking'

interface OpeningHourEntry {
    open: string
    close: string
    dinnerOpen?: string
    dinnerClose?: string
}

const {
    openingHours,
    orderingEnabled,
    isCurrentlyOpen
} = defineProps<{
    openingHours?: Record<string, OpeningHourEntry | null>
    orderingEnabled?: boolean
    isCurrentlyOpen?: boolean
}>()

const emit = defineEmits<{
    'open-address-modal': []
}>()
const { t } = useI18n()
const cartStore = useCartStore()
const { trackEvent } = useTracking()

// Use backend ordering status when available
const isOrderingDisabled = computed(() => !(orderingEnabled ?? true))

// Delivery/Pickup options
const collectionOptions = [
    { value: 'DELIVERY', label: t('cart.delivery'), icon: '/icons/moped-icon.svg' },
    { value: 'PICKUP',   label: t('cart.pickup'),   icon: '/icons/shopping-bag-icon.svg' }
]
const setDeliveryOption = (v: 'DELIVERY' | 'PICKUP') => {
    trackEvent('collection_option_changed', { option: v })
    cartStore.collectionOption = v
}

// Reactive clock ticking every minute
const now = ref(new Date())
let timerId: number
onMounted(() => {
    timerId = window.setInterval(() => { now.value = new Date() }, 60_000)
})
onUnmounted(() => { clearInterval(timerId) })

const fallbackOpeningHours: Record<string, OpeningHourEntry | null> = {
    monday: { open: '11:45', close: '14:00', dinnerOpen: '17:45', dinnerClose: '22:00' },
    tuesday: null,
    wednesday: { open: '11:45', close: '14:00', dinnerOpen: '17:45', dinnerClose: '22:00' },
    thursday: { open: '11:45', close: '14:00', dinnerOpen: '17:45', dinnerClose: '22:00' },
    friday: { open: '11:45', close: '14:00', dinnerOpen: '17:45', dinnerClose: '22:00' },
    saturday: { open: '11:45', close: '14:30', dinnerOpen: '17:45', dinnerClose: '22:15' },
    sunday: { open: '11:45', close: '14:30', dinnerOpen: '17:45', dinnerClose: '22:15' },
}

const openingHoursSource = computed<Record<string, OpeningHourEntry | null>>(() => openingHours ?? fallbackOpeningHours)

// Helpers
const toMins = (hm: string) => {
    const parts = hm.split(':').map(Number)
    const h = parts[0] ?? 0
    const m = parts[1] ?? 0
    return h * 60 + m
}

const availableFixedSlots = computed(() =>
    getAvailableFixedSlotsToday(openingHoursSource.value, now.value)
)

// Selected preferred time binding
const preferredReadyTime = computed<string>({
    get: () => cartStore.preferredReadyTime ?? 'ASAP',
    set: v => {
        if (v === 'ASAP') {
            cartStore.preferredReadyTime = null
        } else {
            trackEvent('preferred_time_selected', { time: v })
            cartStore.preferredReadyTime = v
        }
    }
})

// Is restaurant open? Use backend value when available, fallback to local hours check
const isOpen = computed(() => {
    if (isCurrentlyOpen !== undefined) {
        return isCurrentlyOpen
    }
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.value.getDay()]!
    const schedule = openingHoursSource.value[dayKey]
    if (!schedule) return false

    const ranges: [string, string][] = [[schedule.open, schedule.close]]
    if (schedule.dinnerOpen && schedule.dinnerClose) {
        ranges.push([schedule.dinnerOpen, schedule.dinnerClose])
    }
    const cur = now.value.getHours() * 60 + now.value.getMinutes()
    return ranges.some(([s,e]) => {
        const end = toMins(e), start = toMins(s)
        return cur >= start && cur < end
    })
})

watch(
    [availableFixedSlots, isOpen],
    () => {
        const isSelectedFixedSlot = preferredReadyTime.value !== 'ASAP'
        const hasSelectedSlot = availableFixedSlots.value.some((slot) => slot.value === preferredReadyTime.value)

        if (!isOpen.value && availableFixedSlots.value.length > 0 && (!isSelectedFixedSlot || !hasSelectedSlot)) {
            preferredReadyTime.value = availableFixedSlots.value[0]!.value
            return
        }

        if (isSelectedFixedSlot && !hasSelectedSlot) {
            preferredReadyTime.value = 'ASAP'
        }

        if (!isOpen.value && preferredReadyTime.value === 'ASAP') {
            cartStore.preferredReadyTime = null
        }
    },
    { immediate: true }
)

// Address extra binding
const addressExtra = computed({
    get: () => cartStore.addressExtra || '',
    set: v => { cartStore.addressExtra = v }
})

// ASAP label
const asapLabel = computed(() =>
    cartStore.collectionOption === 'DELIVERY'
        ? t('checkout.asapDelivery', 'ASAP (± 40 min)')
        : t('checkout.asapPickup',   'ASAP (± 30 min)')
)

// Open address modal
const showAddressModal = ref(false)
const openAddressModal = () => {
    emit('open-address-modal')
    showAddressModal.value = true
}
</script>
