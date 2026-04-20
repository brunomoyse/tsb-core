<template>
    <section id="checkout-payment-extras" tabindex="-1" class="bg-white rounded-lg shadow p-4 w-full mx-auto space-y-6">
        <h2 class="text-xl font-semibold mb-4">
            {{ $t('checkout.extrasAndPayment', 'Extras & Payment') }}
        </h2>

        <!-- Coupon Code -->
        <CheckoutCouponInput />

        <!-- Payment Method with Icons -->
        <div class="mb-6">
            <h3 class="font-medium mb-2">
                {{ $t('checkout.paymentMethod', 'Payment Method') }}
            </h3>
            <div class="flex gap-4" role="radiogroup" :aria-label="$t('checkout.paymentMethod')">
                <!-- Online Payment Card -->
                <button
                    type="button"
                    role="radio"
                    :aria-checked="isOnlinePayment"
                    data-testid="payment-online"
                    @click="setOnlinePayment(true)"
                    :class="[
            'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md',
            isOnlinePayment ? 'border-red-300 bg-tsb-four' : 'border-gray-200 bg-white'
          ]"
                >
                    <img src="/icons/online-payment-icon.svg" alt="Online Payment" class="w-10 h-10 mb-2" />
                    <span class="font-semibold">{{ $t('checkout.online', 'Online Payment') }}</span>
                </button>
                <!-- Cash Payment Card -->
                <button
                    type="button"
                    role="radio"
                    :aria-checked="!isOnlinePayment"
                    data-testid="payment-cash"
                    @click="setOnlinePayment(false)"
                    :class="[
            'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md',
            !isOnlinePayment ? 'border-red-300 bg-tsb-four' : 'border-gray-200 bg-white'
          ]"
                >
                    <img src="/icons/cash-payment-icon.svg" alt="Cash" class="w-10 h-10 mb-2" />
                    <span class="font-semibold">{{ $t('checkout.cash', 'Cash') }}</span>
                </button>
            </div>

            <!-- Cash payment warning + acknowledgement + expected amount -->
            <div
                v-if="!isOnlinePayment"
                data-testid="cash-payment-notice"
                class="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3"
            >
                <div class="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p class="text-sm text-amber-800">
                        {{ $t('checkout.cashWarning') }}
                    </p>
                </div>

                <label class="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        data-testid="cash-acknowledge"
                        v-model="cashAcknowledgedModel"
                        class="mt-0.5 h-5 w-5 text-red-500 border-gray-300 rounded shrink-0"
                    />
                    <span class="text-sm text-amber-900 font-medium">
                        {{ $t('checkout.cashAcknowledge') }}
                    </span>
                </label>

                <div>
                    <label for="cash-payment-amount" class="block text-sm font-medium text-amber-900 mb-1">
                        {{ $t('checkout.cashAmountLabel') }}
                        <span class="text-amber-700/70 text-xs font-normal">{{ $t('checkout.optional') }}</span>
                    </label>
                    <div class="relative">
                        <input
                            id="cash-payment-amount"
                            data-testid="cash-payment-amount"
                            v-model="cashPaymentAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            inputmode="decimal"
                            :placeholder="$t('checkout.cashAmountPlaceholder')"
                            class="w-full pl-3 pr-8 py-2 border border-amber-300 rounded-md bg-white focus:ring focus:ring-amber-200 focus:border-amber-400 focus:outline-none"
                        />
                        <span class="absolute inset-y-0 right-3 flex items-center text-amber-700 text-sm pointer-events-none">€</span>
                    </div>
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
                <!-- Wasabi Card -->
                <div class="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <input
                        type="checkbox"
                        id="wasabi"
                        v-model="addWasabi"
                        class="mr-4 h-5 w-5 text-red-500 border-gray-300 rounded"
                    />
                    <label for="wasabi" class="text-gray-700 font-medium">
                        {{ $t('checkout.addWasabi') }}
                    </label>
                </div>
                <!-- Ginger Card -->
                <div class="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <input
                        type="checkbox"
                        id="ginger"
                        v-model="addGinger"
                        class="mr-4 h-5 w-5 text-red-500 border-gray-300 rounded"
                    />
                    <label for="ginger" class="text-gray-700 font-medium">
                        {{ $t('checkout.addGinger') }}
                    </label>
                </div>
                <!-- Soy Sauce Options Card - Pill Toggles -->
                <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p class="font-medium text-gray-700 mb-3">
                        {{ $t('checkout.sauce') }}
                    </p>
                    <div class="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                        <button
                            v-for="option in sauceOptions"
                            :key="option.value"
                            type="button"
                            :data-testid="`sauce-option-${option.value}`"
                            :aria-pressed="sauce === option.value"
                            @click="sauce = option.value"
                            :class="[
                                'px-3 py-1.5 text-sm border rounded-full whitespace-nowrap transition-all active:scale-[0.97]',
                                sauce === option.value
                                    ? 'border-red-300 bg-tsb-four text-red-700 font-medium'
                                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                            ]"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- General Order Comment -->
        <div class="mb-6">
            <h3 id="order-comment-label" class="font-medium text-lg mb-2">
                {{ $t('checkout.orderComment', 'Order Comment') }}
                <span class="text-gray-400 text-sm font-normal">{{ $t('checkout.optional', '(optional)') }}</span>
            </h3>
            <textarea
                v-model="orderComment"
                aria-labelledby="order-comment-label"
                rows="3"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                :placeholder="$t('checkout.orderCommentPlaceholder', 'e.g. Allergies or special instructions')"
            ></textarea>
        </div>

        <!-- Minimum Order Warning -->
        <div v-if="!isMinimumReached" class="text-sm text-red-600 text-center">
            {{ cartStore.collectionOption === 'DELIVERY'
            ? $t('cart.minimumDelivery', { amount: 25})
            : $t('cart.minimumPickup', { amount: 20}) }}
        </div>

        <!-- Checkout Button (desktop only) -->
        <button data-testid="checkout-place-order" @click="debouncedCheckout" :class="[
            'hidden lg:block w-full pt-2 pb-3 rounded-lg font-medium transition-all active:scale-[0.97]',
            !loading && isOrderingAvailable
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          ]" :disabled="loading || !isOrderingAvailable">
            <span v-if="loading" class="inline-flex items-center gap-2">
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
import CheckoutCouponInput from '~/components/checkout/CheckoutCouponInput.vue'
import { computed } from 'vue'
import { useCartStore } from '#imports'
import { useDebounceFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useTracking } from '~/composables/useTracking'

const { isMinimumReached = false, loading = false, isOrderingAvailable = true, cashAcknowledged = false } = defineProps<{
    isMinimumReached?: boolean
    loading?: boolean
    isOrderingAvailable?: boolean
    cashAcknowledged?: boolean
}>()

const cartStore = useCartStore()
const { trackEvent } = useTracking()
const { t } = useI18n()

const emit = defineEmits<{
    checkout: []
    'update:cashAcknowledged': [value: boolean]
}>()

const cashAcknowledgedModel = computed({
    get: () => cashAcknowledged,
    set: (value: boolean) => emit('update:cashAcknowledged', value),
})

const cashPaymentAmount = computed({
    get: () => cartStore.cashPaymentAmount ?? '',
    set: (value: string) => {
        cartStore.cashPaymentAmount = value === '' ? null : value
    },
})

const sauceOptions = computed(() => [
    { value: 'none', label: t('checkout.none') },
    { value: 'sweet', label: t('checkout.sweet') },
    { value: 'salty', label: t('checkout.salty') },
    { value: 'both', label: t('checkout.both') },
])

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
        } else if (idx !== -1) {
            cartStore.orderExtra.splice(idx, 1)
        }
    }
})

// Computed binding for wasabi
const addWasabi = computed({
    get: () => cartStore.orderExtra?.some(o => o.name === 'wasabi') || false,
    set: (value: boolean) => {
        if (!cartStore.orderExtra) cartStore.orderExtra = []
        const idx = cartStore.orderExtra.findIndex(o => o.name === 'wasabi')
        if (value) {
            if (idx === -1) {
                cartStore.orderExtra.push({ name: 'wasabi' })
            }
        } else if (idx !== -1) {
            cartStore.orderExtra.splice(idx, 1)
        }
    }
})

// Computed binding for ginger
const addGinger = computed({
    get: () => cartStore.orderExtra?.some(o => o.name === 'ginger') || false,
    set: (value: boolean) => {
        if (!cartStore.orderExtra) cartStore.orderExtra = []
        const idx = cartStore.orderExtra.findIndex(o => o.name === 'ginger')
        if (value) {
            if (idx === -1) {
                cartStore.orderExtra.push({ name: 'ginger' })
            }
        } else if (idx !== -1) {
            cartStore.orderExtra.splice(idx, 1)
        }
    }
})

const sauce = computed<string>({
    get() {
        const item = cartStore.orderExtra?.find(o => o.name === 'sauce')
        return item?.options?.[0] ?? 'none'
    },
    set(val: string) {
        if (!cartStore.orderExtra) cartStore.orderExtra = []
        const idx = cartStore.orderExtra.findIndex(o => o.name === 'sauce')

        if (val === 'none') {
            if (idx !== -1) cartStore.orderExtra.splice(idx, 1)
            return
        }

        const payload = { name: 'sauce', options: [val] }
        if (idx === -1) {
            cartStore.orderExtra.push(payload)
        } else {
            cartStore.orderExtra[idx]!.options = payload.options
        }
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
