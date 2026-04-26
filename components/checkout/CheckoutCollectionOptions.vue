<template>
    <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 w-full mx-auto space-y-6">
        <h2 class="text-lg font-bold text-gray-900">
            {{ $t('checkout.collection', 'Delivery / Pickup') }}
        </h2>

        <!-- Delivery/Pickup Options -->
        <div class="flex gap-4 mb-6" role="radiogroup" :aria-label="$t('checkout.collection')" @keydown="onRadioKeydown">
            <button
                v-for="(option, idx) in collectionOptions"
                :key="option.value"
                :ref="el => { if (el) radioRefs[idx] = el as HTMLButtonElement }"
                type="button"
                role="radio"
                :aria-checked="cartStore.collectionOption === option.value"
                :tabindex="cartStore.collectionOption === option.value ? 0 : -1"
                :data-testid="option.value === 'DELIVERY' ? 'checkout-option-delivery' : 'checkout-option-pickup'"
                @click="setDeliveryOption(option.value as 'DELIVERY' | 'PICKUP')"
                :class="[
          'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md text-left focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none',
          cartStore.collectionOption === option.value ? 'border-red-300 bg-tsb-four' : 'border-gray-200 bg-white'
        ]"
            >
                <img :src="option.icon" alt="" aria-hidden="true" class="w-10 h-10 mb-2" />
                <span class="font-semibold">{{ option.label }}</span>
            </button>
        </div>

        <!-- Address Section (if DELIVERY) -->
        <div id="checkout-delivery-address" tabindex="-1" v-if="cartStore.collectionOption === 'DELIVERY'" class="flex flex-col gap-2">
            <label class="font-medium">
                {{ $t('checkout.deliveryAddress', 'Delivery Address') }} <span class="text-red-400">*</span>
            </label>
            <div v-if="cartStore.address" class="flex flex-col text-gray-700 bg-gray-50 rounded p-3">
                <span class="whitespace-pre-line">{{ formatAddress(cartStore.address) }}</span>
                <button
                    @click="openAddressModal"
                    class="min-h-11 inline-flex items-center self-start mt-2 px-3 -ml-3 text-sm font-medium text-red-600 hover:text-red-700 rounded-md focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none transition-colors"
                >
                    {{ $t('checkout.editAddress', 'Edit Address') }}
                </button>
                <p v-if="cartStore.address.distance >= DELIVERY_ZONE_METERS" class="mt-2 text-sm text-red-600 font-medium">
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
                class="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                :placeholder="$t('checkout.addressCommentPlaceholder', 'e.g. Ring the bell twice')"
            ></textarea>
        </div>

        <!-- Phone capture: required before an order can be placed. Persists to user profile. -->
        <CheckoutPhoneCapture />

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
                    class="mt-1 block w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
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
import CheckoutPhoneCapture from '~/components/checkout/CheckoutPhoneCapture.vue'
import { DELIVERY_ZONE_METERS } from '~/lib/delivery'
import type { RestaurantTimeSlot } from '~/composables/useRestaurantConfig'
import { formatAddress } from '~/utils/utils'
import { getBrusselsParts } from '~/utils/datetime'
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
    isCurrentlyOpen,
    availableSlotsToday,
    preparationMinutes,
} = defineProps<{
    openingHours?: Record<string, OpeningHourEntry | null>
    orderingEnabled?: boolean
    isCurrentlyOpen?: boolean
    availableSlotsToday?: RestaurantTimeSlot[]
    preparationMinutes?: number
}>()

const emit = defineEmits<{
    'open-address-modal': []
    'slot-expired': []
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

// Roving-tabindex arrow-key nav for the radiogroup (WAI-ARIA Radio Group pattern).
const radioRefs = ref<HTMLButtonElement[]>([])
const onRadioKeydown = (e: KeyboardEvent) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const options = collectionOptions
    const currentIdx = options.findIndex(o => o.value === cartStore.collectionOption)
    const safeCurrent = currentIdx === -1 ? 0 : currentIdx
    let nextIdx = safeCurrent
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (safeCurrent - 1 + options.length) % options.length
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (safeCurrent + 1) % options.length
    else if (e.key === 'Home') nextIdx = 0
    else if (e.key === 'End') nextIdx = options.length - 1
    const next = options[nextIdx]
    if (!next) return
    setDeliveryOption(next.value as 'DELIVERY' | 'PICKUP')
    radioRefs.value[nextIdx]?.focus()
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

// Filter out slots that are in the past or within the preparation buffer.
const availableFixedSlots = computed<RestaurantTimeSlot[]>(() => {
    const prepMs = (preparationMinutes ?? 30) * 60_000
    const cutoff = new Date(now.value.getTime() + prepMs)
    return (availableSlotsToday ?? []).filter(slot => new Date(slot.value) > cutoff)
})

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
    const parts = getBrusselsParts(now.value)
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][parts.weekday]!
    const schedule = openingHoursSource.value[dayKey]
    if (!schedule) return false

    const ranges: [string, string][] = [[schedule.open, schedule.close]]
    if (schedule.dinnerOpen && schedule.dinnerClose) {
        ranges.push([schedule.dinnerOpen, schedule.dinnerClose])
    }
    const cur = parts.hour * 60 + parts.minute
    return ranges.some(([s,e]) => {
        const end = toMins(e), start = toMins(s)
        return cur >= start && cur < end
    })
})

// Suppresses spurious expiry notifications that fire during the initial hydration pass.
const hasMounted = ref(false)
onMounted(() => { hasMounted.value = true })

watch(
    [availableFixedSlots, isOpen],
    () => {
        const isSelectedFixedSlot = preferredReadyTime.value !== 'ASAP'
        const hasSelectedSlot = availableFixedSlots.value.some((slot) => slot.value === preferredReadyTime.value)

        if (!isOpen.value && availableFixedSlots.value.length > 0 && (!isSelectedFixedSlot || !hasSelectedSlot)) {
            if (hasMounted.value && isSelectedFixedSlot) emit('slot-expired')
            preferredReadyTime.value = availableFixedSlots.value[0]!.value
            return
        }

        if (isSelectedFixedSlot && !hasSelectedSlot) {
            if (hasMounted.value) emit('slot-expired')
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

// Parent owns the modal state; this emit opens it.
const openAddressModal = () => {
    emit('open-address-modal')
}
</script>
