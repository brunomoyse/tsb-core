<template>
    <div class="max-w-7xl mx-auto p-4">
        <!-- Page Title -->
        <h1 class="text-2xl font-bold mb-4">
            {{ $t('checkout.title', 'Checkout') }}
        </h1>

        <!-- Responsive Grid Layout: 1 col default, 2 col on lg, 3 col on xl -->
        <div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
            <!-- Section 1: Products & Price Details -->
            <section class="bg-white rounded-lg shadow p-4 w-[600px] mx-auto">
                <h2 class="text-xl font-semibold mb-4">
                    {{ $t('checkout.orderSummary', 'Your Order') }}
                </h2>
                <div v-if="cartStore.products.length === 0" class="text-gray-500 text-center">
                    {{ $t('checkout.emptyCart', 'Your cart is empty.') }}
                </div>
                <div v-else class="space-y-4">
                    <div
                        v-for="item in cartStore.products"
                        :key="item.product.id"
                        class="flex items-center justify-between border-b pb-2"
                    >
                        <div class="flex items-center">
                            <!-- Product Picture -->
                            <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mr-3">
                                <picture>
                                    <source
                                        :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product.slug}.avif`"
                                        type="image/avif"
                                    />
                                    <source
                                        :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product.slug}.webp`"
                                        type="image/webp"
                                    />
                                    <img
                                        :src="`${config.public.s3bucketUrl}/images/thumbnails/${item.product.slug}.png`"
                                        alt="Product Image"
                                        class="w-full h-full object-cover"
                                    />
                                </picture>
                            </div>
                            <!-- Product Details -->
                            <div>
                                <p class="font-medium">
                                    {{
                                        (item.product.code ? item.product.code + ' - ' : '') +
                                        (item.product.category?.name || '') +
                                        ' ' +
                                        item.product.name
                                    }}
                                </p>
                                <p class="text-sm text-gray-500">x{{ item.quantity }}</p>
                            </div>
                        </div>
                        <p class="font-medium">
                            {{ formatPrice(item.product.price * item.quantity) }}
                        </p>
                    </div>
                    <!-- Price Summary -->
                    <div class="flex justify-between text-gray-700">
                        <span>{{ $t('checkout.subtotal', 'Subtotal:') }}</span>
                        <span>{{ formatPrice(cartTotal) }}</span>
                    </div>
                    <div v-if="cartStore.deliveryOption === 'DELIVERY'" class="flex justify-between text-gray-700">
                        <span>{{ $t('checkout.deliveryFee', 'Delivery Fee:') }}</span>
                        <span>{{ formatPrice(deliveryFee) }}</span>
                    </div>
                    <div class="flex justify-between font-semibold text-lg mt-4">
                        <span>{{ $t('checkout.total', 'Total:') }}</span>
                        <span>{{ formatPrice(finalTotal) }}</span>
                    </div>
                </div>
            </section>

            <!-- Section 2: Collection Options & Address & Preferred Time -->
            <section class="bg-white rounded-lg shadow p-4 w-[600px] mx-auto space-y-6">
                <h2 class="text-xl font-semibold mb-4">
                    {{ $t('checkout.collection', 'Collection') }}
                </h2>
                <!-- Delivery/Pickup Options with Icons -->
                <div class="flex gap-4 mb-6">
                    <div
                        v-for="option in deliveryOptions"
                        :key="option.value"
                        @click="cartStore.deliveryOption = option.value as 'DELIVERY' | 'PICKUP'"
                        :class="[
              'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md',
              cartStore.deliveryOption === option.value ? 'border-red-500' : 'border-gray-300 bg-gray-50'
            ]"
                    >
                        <img :src="option.icon" alt="Option Icon" class="w-10 h-10 mb-2" />
                        <span class="font-semibold">{{ option.label }}</span>
                    </div>
                </div>

                <!-- Address Section (if DELIVERY) -->
                <div v-if="cartStore.deliveryOption === 'DELIVERY'" class="flex flex-col gap-2">
                    <label class="font-medium">
                        {{ $t('checkout.deliveryAddress', 'Delivery Address') }}
                    </label>
                    <!-- Display Address if set -->
                    <div v-if="deliveryAddress" class="flex flex-col text-gray-700 bg-gray-50 rounded p-3">
                        <span>{{ formatAddress(deliveryAddress) }}</span>
                        <button
                            @click="openAddressModal"
                            class="text-blue-600 underline text-sm mt-2 self-start"
                        >
                            {{ $t('checkout.editAddress', 'Edit Address') }}
                        </button>
                    </div>
                    <!-- No Address -->
                    <div v-else>
                        <p class="text-sm text-gray-500">
                            {{ $t('checkout.noAddress', 'No address selected') }}
                        </p>
                        <button
                            @click="openAddressModal"
                            class="mt-1 px-3 py-2 bg-blue-100 text-blue-800 rounded text-sm"
                        >
                            {{ $t('checkout.addAddress', 'Add Address') }}
                        </button>
                    </div>

                    <!-- Additional Address Comment -->
                    <label for="addressComment" class="block text-sm text-gray-700 mt-4">
                        {{ $t('checkout.addressComment', 'Additional Info for Address') }}
                    </label>
                    <textarea
                        id="addressComment"
                        v-model="addressComment"
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
                        v-model="selectedTime"
                        class="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                    >
                        <option value="ASAP">
                            {{ asapLabel }}
                        </option>
                        <option
                            v-for="slot in availableTimeSlots"
                            :key="slot"
                            :value="slot"
                        >
                            {{ slot }}
                        </option>
                    </select>
                </div>
            </section>

            <!-- Section 3: Payment & Extras & Order Comment -->
            <section class="bg-white rounded-lg shadow p-4 w-[600px] mx-auto space-y-6">
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
                            @click="isOnlinePayment = true"
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
                            @click="isOnlinePayment = false"
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
                        <!-- Chopsticks -->
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
                        <!-- Soy Sauce Options -->
                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <p class="font-medium text-gray-700 mb-3">
                                {{ $t('checkout.soySauce', 'Soy Sauce (choose up to 2):') }}
                            </p>
                            <div class="flex flex-col sm:flex-row gap-4">
                                <div class="flex-1">
                                    <label for="sauce1" class="block text-sm text-gray-600 mb-1">
                                        Sauce 1
                                    </label>
                                    <select
                                        id="sauce1"
                                        v-model="sauce1"
                                        class="block w-full border border-gray-300 rounded p-2"
                                    >
                                        <option value="none">{{ $t('checkout.none', 'None') }}</option>
                                        <option value="sweet">{{ $t('checkout.sweet', 'Sweet') }}</option>
                                        <option value="salty">{{ $t('checkout.salty', 'Salty') }}</option>
                                    </select>
                                </div>
                                <div class="flex-1">
                                    <label for="sauce2" class="block text-sm text-gray-600 mb-1">
                                        Sauce 2
                                    </label>
                                    <select
                                        id="sauce2"
                                        v-model="sauce2"
                                        class="block w-full border border-gray-300 rounded p-2"
                                    >
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
                    @click="handleCheckout"
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
        </div>

        <!-- Address Modal -->
        <div
            v-if="showAddressModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            @click.self="closeAddressModal"
            tabindex="0"
        >
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full" @click.stop>
                <h3 class="text-xl font-semibold text-gray-900 text-center mb-6">
                    {{ $t('checkout.editAddress', 'Edit Address') }}
                </h3>
                <AddressAutocomplete @update:address="handleAddressUpdate" />
                <div class="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        @click="closeAddressModal"
                        class="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                    >
                        {{ $t('common.cancel', 'Cancel') }}
                    </button>
                    <button
                        type="button"
                        @click="confirmAddress"
                        class="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 text-sm"
                    >
                        {{ $t('common.save', 'Save') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useCartStore } from '@/stores/cart'
import { formatPrice } from '~/lib/price'
import {
    definePageMeta,
    formatAddress,
    navigateTo,
    useAsyncData,
    useAuthStore,
    useLocalePath,
    useNuxtApp,
    useRuntimeConfig
} from '#imports'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import type { Address, CreateOrderRequest, OrderResponse } from '~/types'
import { useI18n } from 'vue-i18n'

// Page metadata
definePageMeta({ public: false })

// Stores & config
const localePath = useLocalePath()
const { t } = useI18n()
const authStore = useAuthStore()
const cartStore = useCartStore()
const config = useRuntimeConfig()
const { $api } = useNuxtApp()

// Delivery options array with icons
const deliveryOptions = [
    { value: 'DELIVERY', label: t('cart.delivery'), icon: '/icons/moped-icon.svg' },
    { value: 'PICKUP', label: t('cart.pickup'), icon: '/icons/shopping-bag-icon.svg' }
]

// Refs & reactive state
const deliveryAddress = ref<Address | null>(authStore.user?.address ?? null)
const addressComment = ref('')
const showAddressModal = ref(false)
const tempAddress = ref<Address | null>(null)
const isCheckoutProcessing = ref(false)
const isOnlinePayment = ref(true)
const addChopsticks = ref(true)
const sauce1 = ref('none')
const sauce2 = ref('none')
const orderComment = ref('')

// Time selection state
const selectedTime = ref('ASAP')

// Generate "ASAP" label depending on order type
const asapLabel = computed(() => {
    return cartStore.deliveryOption === 'DELIVERY'
        ? t('checkout.asapDelivery', 'ASAP (estimated 40 min)')
        : t('checkout.asapPickup', 'ASAP (estimated 30 min)')
})

// Helper: convert "HH:mm" to minutes since midnight
const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
}

// Helper: format minutes since midnight to "HH:mm"
const minutesToTime = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Helper: generate time slots given start and end strings
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

// Available time slots computed property
const availableTimeSlots = computed(() => {
    let slots: string[] = []
    if (cartStore.deliveryOption === 'DELIVERY') {
        slots = [
            ...generateTimeSlots("12:30", "14:15"),
            ...generateTimeSlots("18:30", "22:00")
        ]
    } else if (cartStore.deliveryOption === 'PICKUP') {
        slots = [
            ...generateTimeSlots("12:15", "14:15"),
            ...generateTimeSlots("18:15", "22:15")
        ]
    }
    return slots
})

// Cart computations
const cartTotal = computed(() =>
    cartStore.products.reduce((total, item) => total + item.product.price * item.quantity, 0)
)
const deliveryFee = computed(() => {
    if (cartStore.deliveryOption !== 'DELIVERY' || !deliveryAddress.value) return 0
    const { distance } = deliveryAddress.value
    const thresholds = [4000, 5000, 6000, 7000, 8000, 9000, 10001]
    const fee = thresholds.findIndex((threshold) => distance < threshold)
    return fee === -1 ? 0 : fee
})
const finalTotal: ComputedRef<number> = computed(() => {
    return cartTotal.value + (cartStore.deliveryOption === 'DELIVERY' ? deliveryFee.value : 0)
})

// Open/close modal
const openAddressModal = () => {
    tempAddress.value = deliveryAddress.value
    showAddressModal.value = true
}
const closeAddressModal = () => {
    showAddressModal.value = false
}
const handleAddressUpdate = (updatedAddress: Address | null) => {
    tempAddress.value = updatedAddress
}
const confirmAddress = () => {
    deliveryAddress.value = tempAddress.value
    showAddressModal.value = false
}

// Checkout logic
const handleCheckout = async () => {
    if (isCheckoutProcessing.value) return
    isCheckoutProcessing.value = true

    try {
        if (cartStore.products.length === 0) {
            console.error('Cart is empty')
            return
        }
        if (cartTotal.value < 20) {
            console.error('Minimum order not reached')
            return
        }
        if (!authStore.accessValid) {
            console.error('User is not authenticated')
            return
        }
        if (cartStore.deliveryOption === 'DELIVERY' && !deliveryAddress.value) {
            console.error('Delivery address is required for delivery orders')
            return
        }

        const orderExtra: { name: string; options?: string[] }[] = []
        if (addChopsticks.value) orderExtra.push({ name: 'chopsticks' })
        if (sauce1.value !== 'none' || sauce2.value !== 'none') {
            const sauceItem = { name: 'sauce', options: [] as string[] }
            if (sauce1.value !== 'none') sauceItem.options.push(sauce1.value)
            if (sauce2.value !== 'none') sauceItem.options.push(sauce2.value)
            orderExtra.push(sauceItem)
        }

        const orderData: CreateOrderRequest = {
            orderType: cartStore.deliveryOption,
            isOnlinePayment: isOnlinePayment.value,
            addressId: cartStore.deliveryOption === 'DELIVERY'
                ? (deliveryAddress.value?.id ?? null)
                : null,
            addressExtra: addressComment.value || null,
            extraComment: orderComment.value || null,
            orderExtra,
            orderProducts: cartStore.products.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity
            })),
            // Include the selected time slot (or ASAP)
            preferredTime: selectedTime.value // Add this field as needed
        }

        const { data: orderResponse, error } = await useAsyncData<OrderResponse>('order', () =>
            $api('/orders', {
                method: 'POST',
                body: JSON.stringify(orderData)
            })
        )

        if (error.value) {
            console.error('Error creating order:', error.value)
            return
        }

        if (isOnlinePayment.value && orderResponse.value?.payment?.paymentUrl) {
            navigateTo(orderResponse.value.payment.paymentUrl, { external: true })
        } else {
            if (orderResponse.value?.order.id) {
                const orderId = orderResponse.value.order.id
                navigateTo(localePath(`/order-completed/${orderId}`))
            }
        }
    } catch (err) {
        console.error('Order processing failed:', err)
    } finally {
        isCheckoutProcessing.value = false
    }
}
</script>
