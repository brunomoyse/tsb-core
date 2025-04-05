<template>
    <section class="bg-white rounded-lg shadow p-4 w-full mx-auto space-y-6">
        <h2 class="text-xl font-semibold mb-4">
            {{ $t('checkout.collection', 'Collection') }}
        </h2>
        <!-- Delivery/Pickup Options with Icons -->
        <div class="flex gap-4 mb-6">
            <div
                v-for="option in collectionOptions"
                :key="option.value"
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
                <button @click="openAddressModal" class="text-blue-600 underline text-sm mt-2 self-start">
                    {{ $t('checkout.editAddress', 'Edit Address') }}
                </button>
            </div>
            <div v-else>
                <p class="text-sm text-gray-500">
                    {{ $t('checkout.noAddress', 'No address selected') }}
                </p>
                <button @click="openAddressModal" class="mt-1 px-3 py-2 bg-blue-100 text-blue-800 rounded text-sm">
                    {{ $t('checkout.addAddress', 'Add Address') }}
                </button>
            </div>

            <!-- Additional Address Comment -->
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

        <!-- Preferred Time Selection -->
        <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700">
                {{ $t('checkout.preferredTime', 'Preferred Time') }}
            </label>
            <select
                v-model="preferredReadyTime"
                class="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
            >
                <option value="ASAP">{{ asapLabel }}</option>
                <option v-for="slot in availableTimeSlots" :key="slot" :value="slot">
                    {{ slot }}
                </option>
            </select>
        </div>
    </section>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import { formatAddress } from '~/utils/utils'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['open-address-modal' ])

const { t } = useI18n()
const cartStore = useCartStore()

const collectionOptions = [
    { value: 'DELIVERY', label: t('cart.delivery'), icon: '/icons/moped-icon.svg' },
    { value: 'PICKUP', label: t('cart.pickup'), icon: '/icons/shopping-bag-icon.svg' }
]

const setDeliveryOption = (value: 'DELIVERY' | 'PICKUP') => {
    cartStore.collectionOption = value
}

const addressExtra = computed({
    get: () => cartStore.addressExtra || '',
    set: (val: string) => {
        cartStore.addressExtra = val
    }
})
const preferredReadyTime = computed({
    get: () => cartStore.preferredReadyTime || 'ASAP',
    set: (val: string) => {
        cartStore.preferredReadyTime = val
    }
})

const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
}
const minutesToTime = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}
const generateTimeSlots = (start: string, end: string): string[] => {
    const slots = []
    let current = timeToMinutes(start)
    const endMinutes = timeToMinutes(end)
    while (current <= endMinutes) {
        slots.push(minutesToTime(current))
        current += 15
    }
    return slots
}

const availableTimeSlots = computed(() => {
    let slots: string[] = []
    if (cartStore.collectionOption === 'DELIVERY') {
        slots = [
            ...generateTimeSlots("12:30", "14:15"),
            ...generateTimeSlots("18:30", "22:00")
        ]
    } else if (cartStore.collectionOption === 'PICKUP') {
        slots = [
            ...generateTimeSlots("12:15", "14:15"),
            ...generateTimeSlots("18:15", "22:15")
        ]
    }
    return slots
})

const asapLabel = computed(() => {
    return cartStore.collectionOption === 'DELIVERY'
        ? t('checkout.asapDelivery', 'ASAP (± 40 min)')
        : t('checkout.asapPickup', 'ASAP (± 30 min)')
})

// For modal handling (address editing)
const showAddressModal = ref(false)
const openAddressModal = () => {
    emit('open-address-modal')
    showAddressModal.value = true
}
</script>
