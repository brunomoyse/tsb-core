<template>
    <section class="bg-white rounded-lg shadow p-4 w-full mx-auto space-y-6">
        <h2 class="text-xl font-semibold mb-4">
            {{ $t('checkout.collection', 'Collection') }}
        </h2>

        <!-- Delivery/Pickup Options -->
        <div class="flex gap-4 mb-6">
            <div
                v-for="option in collectionOptions"
                :key="option.value"
                :data-testid="option.value === 'DELIVERY' ? 'checkout-option-delivery' : 'checkout-option-pickup'"
                @click="setDeliveryOption(option.value as 'DELIVERY' | 'PICKUP')"
                :class="[
          'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md',
          cartStore.collectionOption === option.value ? 'border-red-500' : 'border-gray-300 bg-gray-50'
        ]"
            >
                <img :src="option.icon" alt="Option Icon" class="w-10 h-10 mb-2" />
                <span class="font-semibold">{{ option.label }}</span>
            </div>
        </div>

        <!-- Address Section (if DELIVERY) -->
        <div v-if="cartStore.collectionOption === 'DELIVERY'" class="flex flex-col gap-2">
            <label class="font-medium">
                {{ $t('checkout.deliveryAddress', 'Delivery Address') }}
            </label>
            <div v-if="cartStore.address" class="flex flex-col text-gray-700 bg-gray-50 rounded p-3">
                <span>{{ formatAddress(cartStore.address) }}</span>
                <button
                    @click="openAddressModal"
                    class="text-blue-600 underline text-sm mt-2 self-start"
                >
                    {{ $t('checkout.editAddress', 'Edit Address') }}
                </button>
            </div>
            <div v-else>
                <p class="text-sm text-gray-500">
                    {{ $t('checkout.noAddress', 'No address selected') }}
                </p>
                <button
                    @click="openAddressModal"
                    class="mt-1 px-3 py-2 bg-red-50 text-red-700 border-2 border-red-700 rounded text-sm"
                >
                    {{ $t('checkout.addAddress', 'Add Address') }}
                </button>
            </div>

            <label for="addressExtra" class="block text-sm text-gray-700 mt-4">
                {{ $t('checkout.addressComment', 'Additional Info for Address') }}
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

            <!-- Restaurant closed by hours -->
            <p v-else-if="!isOpen" class="text-red-600 font-semibold">
                {{ $t('checkout.restaurantClosed', 'Sorry, we are closed right now.') }}
            </p>
            <div v-else>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    {{ $t('checkout.preferredTime', 'Preferred Time') }}
                </label>

                <!-- Open & ordering enabled: show ASAP + timeslots -->
                <select
                    v-model="preferredReadyTime"
                    data-testid="checkout-preferred-time"
                    class="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                >
                    <option value="ASAP">{{ asapLabel }}</option>
                    <option
                        v-for="slot in availableTimeSlots"
                        :key="slot"
                        :value="slot"
                    >
                        {{ slot }}
                    </option>
                </select>
            </div>

        </div>
    </section>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCartStore } from '@/stores/cart'
import { formatAddress } from '~/utils/utils'
import { useI18n } from 'vue-i18n'
import { useTracking } from '~/composables/useTracking'

const emit = defineEmits(['open-address-modal'])
const { t } = useI18n()
const cartStore = useCartStore()
const { trackEvent } = useTracking()

// Manual disable flag @TODO: SYNC WITH DB
const isOrderingDisabled = ref(false)

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

// Business hours map (0=Sun … 6=Sat), Tue omitted = closed
const hoursMap: Record<number, [string, string][]> = {
    1: [['11:45','14:00'], ['17:45','22:00']], // Mon
    3: [['11:45','14:00'], ['17:45','22:00']], // Wed
    4: [['11:45','14:00'], ['17:45','22:00']], // Thu
    5: [['11:45','14:00'], ['17:45','22:00']], // Fri
    6: [['11:45','14:30'], ['17:45','22:15']], // Sat
    0: [['11:45','14:30'], ['17:45','22:15']], // Sun
}

// Helpers
const toMins = (hm: string) => {
    const parts = hm.split(':').map(Number)
    const h = parts[0] ?? 0
    const m = parts[1] ?? 0
    return h * 60 + m
}

// Compute min allowed time = now + 1h
const minAllowedTime = computed(() => {
    const future = new Date(now.value.getTime() + 60 * 60 * 1000)
    const hh = future.getHours().toString().padStart(2, '0')
    const mm = future.getMinutes().toString().padStart(2, '0')
    return `${hh}:${mm}`
})

// Generate 15-minute slots between start/end
const generateTimeSlots = (start: string, end: string) => {
    const slots: string[] = []
    let cur = toMins(start), endM = toMins(end)
    while (cur <= endM) {
        const h = Math.floor(cur / 60).toString().padStart(2,'0')
        const m = (cur % 60).toString().padStart(2,'0')
        slots.push(`${h}:${m}`)
        cur += 15
    }
    return slots
}

// Filtered slots ≥ minAllowedTime
const availableTimeSlots = computed(() => {
    const day = now.value.getDay()
    const ranges = hoursMap[day] || []
    const raw: string[] = []
    for (const [s,e] of ranges) {
        raw.push(...generateTimeSlots(s,e))
    }
    const minM = toMins(minAllowedTime.value)
    return raw.filter(slot => toMins(slot) >= minM)
})

// Auto-reset if selected slot falls below minAllowedTime
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

watch(
    [availableTimeSlots, minAllowedTime],
    () => {
        if (
            preferredReadyTime.value !== 'ASAP' &&
            !availableTimeSlots.value.includes(preferredReadyTime.value)
        ) {
            preferredReadyTime.value = 'ASAP'
        }
    },
    { immediate: true }
)

// Is restaurant open by hours?
const isOpen = computed(() => {
    const day = now.value.getDay()
    const ranges = hoursMap[day] || []
    const cur = now.value.getHours() * 60 + now.value.getMinutes()
    return ranges.some(([s,e]) => {
        const start = toMins(s), end = toMins(e)
        return cur >= start && cur <= end
    })
})

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
