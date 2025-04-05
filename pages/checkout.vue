<template>
    <div class="max-w-7xl mx-auto p-4">
        <!-- Page Title -->
        <h1 class="text-2xl font-bold mb-4">
            {{ $t('checkout.title', 'Checkout') }}
        </h1>

        <!-- Grid Layout: 1 column by default, 2 on lg, 3 on xl -->
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <CheckoutProductSummary />
            <CheckoutCollectionOptions @open-address-modal="openAddressModal" />
            <CheckoutPaymentExtras @checkout="handleCheckout" />
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
import { ref } from 'vue'
import CheckoutProductSummary from '~/components/checkout/CheckoutProductSummary.vue'
import CheckoutCollectionOptions from '~/components/checkout/CheckoutCollectionOptions.vue'
import CheckoutPaymentExtras from '~/components/checkout/CheckoutPaymentExtras.vue'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import { useAuthStore, useCartStore, useNuxtApp, useLocalePath, onMounted } from '#imports'
import type { Address, CreateOrderRequest, OrderResponse } from '~/types'
import { navigateTo, useAsyncData } from '#imports'

const authStore = useAuthStore()
const cartStore = useCartStore()
const { $api } = useNuxtApp()
const localePath = useLocalePath()

// Manage address modal state and delivery address
const showAddressModal = ref(false)
const tempAddress = ref<Address | null>(null)

const openAddressModal = () => {
    showAddressModal.value = true
    // Pre-fill the address if available
    if (cartStore.address) {
        tempAddress.value = cartStore.address
    } else {
        tempAddress.value = null
    }
}

const closeAddressModal = () => {
    showAddressModal.value = false
}
const handleAddressUpdate = (updatedAddress: Address | null) => {
    tempAddress.value = updatedAddress
}
const confirmAddress = () => {
    cartStore.address = tempAddress.value
    showAddressModal.value = false
}

onMounted(() => {
    // If the user is logged in and has an address, pre-fill the cart address
    if (authStore.user?.address && !cartStore.address) {
        cartStore.address = authStore.user.address
    }
})

// Checkout logic (simplified; extras and time selection are handled in CheckoutPaymentExtras component)
const isCheckoutProcessing = ref(false)
const handleCheckout = async () => {
    if (isCheckoutProcessing.value) return
    isCheckoutProcessing.value = true

    try {
        if (cartStore.products.length === 0) {
            console.error('Cart is empty')
            return
        }
        if (!authStore.accessValid) {
            console.error('User is not authenticated')
            return
        }
        if (cartStore.collectionOption === 'DELIVERY' && !cartStore.address) {
            console.error('Delivery address is required for delivery orders')
            return
        }

        // Extras could be managed globally or via events; this is a placeholder.
        const orderData: CreateOrderRequest = {
            orderType: cartStore.collectionOption,
            isOnlinePayment: cartStore.paymentOption === 'ONLINE',
            addressId: cartStore.collectionOption === 'DELIVERY'
                ? (cartStore.address?.id ?? null)
                : null,
            addressExtra: cartStore.addressExtra,
            orderNote: cartStore.orderNote,
            orderExtra: cartStore.orderExtra,
            orderProducts: cartStore.products.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity
            })),
            preferredReadyTime: 'ASAP'
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

        if (orderResponse.value?.payment?.paymentUrl) {
            navigateTo(orderResponse.value.payment.paymentUrl, { external: true })
        } else if (orderResponse.value?.order.id) {
            navigateTo(localePath(`/order-completed/${orderResponse.value.order.id}`))
        }
    } catch (err) {
        console.error('Order processing failed:', err)
    } finally {
        isCheckoutProcessing.value = false
    }
}
</script>
