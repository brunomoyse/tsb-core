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

        <!-- Checkout Button -->
        <button
            @click="$emit('checkout')"
            :disabled="isCheckoutProcessing"
            class="w-full py-3 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
            {{
                isOnlinePayment
                    ? $t('checkout.goToPayment', 'Go to Payment')
                    : $t('checkout.placeOrder', 'Place Order')
            }}
        </button>
    </section>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const isOnlinePayment = ref(true)
const addChopsticks = ref(true)
const sauce1 = ref('sweet')
const sauce2 = ref('salty')
const orderComment = ref('')
const isCheckoutProcessing = ref(false)

const setOnlinePayment = (value: boolean) => {
    isOnlinePayment.value = value
}
</script>
