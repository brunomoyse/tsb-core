<template>
    <section class="bg-white rounded-lg shadow p-4 w-full mx-auto space-y-6">
        <h2 class="text-xl font-semibold mb-4">
            {{ $t('checkout.extrasAndPayment', 'Extras & Payment') }}
        </h2>

        <!-- Payment Method with Icons -->
        <div class="mb-6">
            <h3 class="font-medium mb-2">
                {{ $t('checkout.paymentMethod', 'Payment Method') }}
            </h3>
            <div class="flex gap-4">
                <!-- Online Payment Card -->
                <div
                    @click="setOnlinePayment(true)"
                    :class="[
            'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md',
            isOnlinePayment ? 'border-red-500' : 'border-gray-300 bg-gray-50'
          ]"
                >
                    <img src="/icons/online-payment-icon.svg" alt="Online Payment" class="w-10 h-10 mb-2" />
                    <span class="font-semibold">{{ $t('checkout.online', 'Online Payment') }}</span>
                </div>
                <!-- Cash Payment Card -->
                <div
                    @click="setOnlinePayment(false)"
                    :class="[
            'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md',
            !isOnlinePayment ? 'border-red-500' : 'border-gray-300 bg-gray-50'
          ]"
                >
                    <img src="/icons/cash-payment-icon.svg" alt="Cash" class="w-10 h-10 mb-2" />
                    <span class="font-semibold">{{ $t('checkout.cash', 'Cash') }}</span>
                </div>
            </div>
        </div>

        <!-- Extras -->
        <div class="mb-6">
            <h3 class="font-medium text-lg mb-4">
                {{ $t('checkout.extras', 'Extras') }}
            </h3>
            <div class="grid grid-cols-1 gap-4">
                <!-- Chopsticks Card -->
                <div class="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <input
                        type="checkbox"
                        id="chopsticks"
                        v-model="addChopsticks"
                        class="mr-4 h-5 w-5 text-red-500 border-gray-300 rounded"
                    />
                    <label for="chopsticks" class="text-gray-700 font-medium">
                        {{ $t('checkout.addChopsticks', 'Add Chopsticks') }}
                    </label>
                </div>
                <!-- Soy Sauce Options Card -->
                <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p class="font-medium text-gray-700 mb-3">
                        {{ $t('checkout.soySauce', 'Soy Sauce (choose up to 2):') }}
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4">
                        <div class="flex-1">
                            <label for="sauce1" class="block text-sm text-gray-600 mb-1">
                                Sauce 1
                            </label>
                            <select id="sauce1" v-model="sauce1" class="block w-full border border-gray-300 rounded p-2">
                                <option value="none">{{ $t('checkout.none', 'None') }}</option>
                                <option value="sweet">{{ $t('checkout.sweet', 'Sweet') }}</option>
                                <option value="salty">{{ $t('checkout.salty', 'Salty') }}</option>
                            </select>
                        </div>
                        <div class="flex-1">
                            <label for="sauce2" class="block text-sm text-gray-600 mb-1">
                                Sauce 2
                            </label>
                            <select id="sauce2" v-model="sauce2" class="block w-full border border-gray-300 rounded p-2">
                                <option value="none">{{ $t('checkout.none', 'None') }}</option>
                                <option value="sweet">{{ $t('checkout.sweet', 'Sweet') }}</option>
                                <option value="salty">{{ $t('checkout.salty', 'Salty') }}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- General Order Comment -->
        <div class="mb-6">
            <h3 class="font-medium text-lg mb-2">
                {{ $t('checkout.orderComment', 'Order Comment') }}
            </h3>
            <textarea
                v-model="orderComment"
                rows="3"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                :placeholder="$t('checkout.orderCommentPlaceholder', 'e.g. Allergies or special instructions')"
            ></textarea>
        </div>

        <!-- Minimum Order Warning -->
        <div v-if="!props.isMinimumReached" class="text-sm text-red-600 text-center">
            {{ cartStore.collectionOption === 'DELIVERY'
            ? $t('cart.minimumDelivery', { amount: 25})
            : $t('cart.minimumPickup', { amount: 20}) }}
        </div>

        <!-- Checkout Button -->
        <button @click="debouncedCheckout" :class="[
            'w-full pt-2 pb-3 rounded-lg font-medium transition-colors',
            props.isMinimumReached && !props.loading && props.isOrderingAvailable
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          ]" :disabled="!props.isMinimumReached || props.loading || !props.isOrderingAvailable">
            <span v-if="props.loading" class="inline-flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ $t('checkout.processing', 'Processing...') }}
            </span>
            <span v-else>
                {{ isOnlinePayment
                    ? $t('checkout.goToPayment', 'Go to Payment')
                    : $t('checkout.placeOrder', 'Place Order')
                }}
            </span>
        </button>
    </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useCartStore } from '#imports'
import { useDebounceFn } from '@vueuse/core'
import { useTracking } from '~/composables/useTracking'

const props = defineProps({
    isMinimumReached: {
        type: Boolean,
        default: false
    },
    loading: {
        type: Boolean,
        default: false
    },
    isOrderingAvailable: {
        type: Boolean,
        default: true
    }
})

const cartStore = useCartStore()
const { trackEvent } = useTracking()

const emit = defineEmits(['checkout'])

const setOnlinePayment = (value: boolean) => {
    trackEvent('payment_method_selected', { method: value ? 'ONLINE' : 'CASH' })
    isOnlinePayment.value = value;
}

// Computed binding for payment option
const isOnlinePayment = computed({
    get: () => cartStore.paymentOption === 'ONLINE',
    set: (value: boolean) => {
        cartStore.paymentOption = value ? 'ONLINE' : 'CASH'
    }
})


// Computed binding for chopsticks
const addChopsticks = computed({
    get: () => cartStore.orderExtra?.some(o => o.name === 'chopsticks') || false,
    set: (value: boolean) => {
        if (!cartStore.orderExtra) cartStore.orderExtra = []
        const idx = cartStore.orderExtra.findIndex(o => o.name === 'chopsticks')
        if (value) {
            if (idx === -1) {
                cartStore.orderExtra.push({ name: 'chopsticks' })
            }
        } else {
            if (idx !== -1) {
                cartStore.orderExtra.splice(idx, 1)
            }
        }
    }
})

// Helper computed property for sauces as an array of two strings
const sauces = computed<[string,string]>({
    get() {
        const item = cartStore.orderExtra?.find(o => o.name === 'sauces')
        const opts = item?.options ?? []
        // always return a 2-element tuple
        return [ opts[0] || 'none', opts[1] || 'none' ]
    },
    set([s1, s2]) {
        // if both are none, remove the entry
        const allNone = s1 === 'none' && s2 === 'none'
        if (!cartStore.orderExtra) cartStore.orderExtra = []

        const idx = cartStore.orderExtra.findIndex(o => o.name === 'sauces')

        if (allNone) {
            if (idx !== -1) cartStore.orderExtra.splice(idx, 1)
            return
        }

        const payload = { name: 'sauces', options: [s1, s2] }

        if (idx === -1) {
            cartStore.orderExtra.push(payload)
        } else {
            cartStore.orderExtra![idx]!.options = payload.options
        }
    }
})

// Computed binding for individual sauces
const sauce1 = computed({
    get() {
        return sauces.value[0]
    },
    set(val: string) {
        sauces.value = [val, sauces.value[1]]
    }
})
const sauce2 = computed({
    get() {
        return sauces.value[1]
    },
    set(val: string) {
        sauces.value = [sauces.value[0], val]
    }
})

// Computed binding for order comment
const orderComment = computed({
    get: () => cartStore.orderNote || '',
    set: (val: string) => {
        cartStore.orderNote = val
    }
})

const handleCheckout = () => {
    emit('checkout')
}

const debouncedCheckout = useDebounceFn(handleCheckout, 300)

</script>
