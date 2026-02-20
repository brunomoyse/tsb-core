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
            <CheckoutPaymentExtras @checkout="handleCheckout" :isMinimumReached="isMinimumReached" />
        </div>

        <!-- Extras Suggestion -->
        <div class="mt-8">
            <CheckoutExtrasSuggestion />
        </div>

        <!-- Address Modal -->
        <div
            v-if="showAddressModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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
                        :disabled="!tempAddress"
                        class="px-4 py-2 rounded  text-white text-sm"
                        :class="!tempAddress ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'"
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
import CheckoutExtrasSuggestion from '~/components/checkout/CheckoutExtrasSuggestion.vue'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import {useAuthStore, useCartStore, useLocalePath, onMounted, useGqlMutation, computed} from '#imports'
import type {Address, CreateOrderRequest, Order} from '~/types'
import { navigateTo } from '#imports'
import gql from "graphql-tag";
import {eventBus} from "~/eventBus";
import { useI18n } from "vue-i18n"
import {timeToRFC3339} from "~/utils/utils";
import {useTracking} from "~/composables/useTracking";

const { t } = useI18n()
const authStore = useAuthStore()
const cartStore = useCartStore()
const localePath = useLocalePath()
const { trackEvent } = useTracking()

useSeoMeta({
    title: t('schema.checkout.title'),
    robots: 'noindex,nofollow',
})

// Manage the address modal state and delivery address
const showAddressModal = ref(false)
const tempAddress = ref<Address | null>(null)

const CREATE_ORDER = gql`
    mutation CreateOrder($input: CreateOrderInput!) {
        createOrder(input: $input) {
            id
            createdAt
            updatedAt
            status
            type
            isOnlinePayment
            discountAmount
            deliveryFee
            totalPrice
            estimatedReadyTime
            addressExtra
            orderNote
            orderExtra
            address {
                id
                streetName
                houseNumber
                boxNumber
                postcode
                municipalityName
                distance
            }
            payment {
                id
                links
                status
            }
            customer {
                id
                firstName
                lastName
            }
            items {
                unitPrice
                quantity
                totalPrice
                product {
                    id
                    name
                    category {
                        id
                        name
                    }
                }
            }
        }
    }
`
const { mutate: mutationCreateOrder } = useGqlMutation<{ createOrder: Order }>(CREATE_ORDER)

const openAddressModal = () => {
    trackEvent('delivery_address_modal_opened')
    showAddressModal.value = true
    tempAddress.value = null
}

const closeAddressModal = () => {
    showAddressModal.value = false
}
const handleAddressUpdate = (updatedAddress: Address | null) => {
    tempAddress.value = updatedAddress
}
const confirmAddress = () => {
    cartStore.address = tempAddress.value
    trackEvent('delivery_address_set', { distance: tempAddress.value?.distance })
    showAddressModal.value = false
}

onMounted(() => {
    // If the user is logged in and has an address, pre-fill the cart address
    if (authStore.user?.address && !cartStore.address) {
        cartStore.address = authStore.user.address
    }

    trackEvent('checkout_page_loaded', {
        total_items: cartStore.totalItems,
        total_price: cartTotal.value,
        collection_option: cartStore.collectionOption,
        has_address: !!cartStore.address,
        is_authenticated: authStore.accessValid,
    })
})

// Checkout logic (simplified; extras and time selection are handled in CheckoutPaymentExtras component)
const isCheckoutProcessing = ref(false)
const handleCheckout = async () => {
    if (isCheckoutProcessing.value) return
    isCheckoutProcessing.value = true

    // Check if user is authenticated
    if (!authStore.accessValid) {
        // Redirect to login
        navigateTo(localePath('/login?from_checkout=true'))
        return
    }

    try {
        if (cartStore.products.length === 0) {
            trackEvent('checkout_error_cart_empty')
            eventBus.emit('notify', {
                message: t('notify.errors.cartEmpty', 'Your cart is empty.'),
                persistent: false,
                duration: 5000,
                variant: 'error',
            })
            return
        }
        if (!authStore.accessValid) {
            trackEvent('checkout_error_not_authenticated')
            eventBus.emit('notify', {
                message: t('notify.errors.notAuthenticated', 'You are not authenticated.'),
                persistent: false,
                duration: 5000,
                variant: 'error',
            })
            return
        }
        if (cartStore.collectionOption === 'DELIVERY' && !cartStore.address) {
            trackEvent('checkout_error_address_required')
            eventBus.emit('notify', {
                message: t('notify.errors.addressRequired', 'Delivery address is required.'),
                persistent: false,
                duration: 5000,
                variant: 'error',
            })
            return
        }

        if (cartStore.address?.distance && cartStore.address?.distance >= 9000) {
            trackEvent('checkout_error_address_too_far')
            eventBus.emit('notify', {
                message: t('notify.errors.deliveryAddressTooFar', {
                    distance: 9
                }),
                persistent: false,
                duration: 5000,
                variant: 'error',
            })
            return
        }

        // Send asap as null
        let preferredReadyTime = null
        if (cartStore.preferredReadyTime !== 'ASAP' && cartStore.preferredReadyTime) {
            preferredReadyTime = timeToRFC3339(cartStore.preferredReadyTime)
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
            items: cartStore.products.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity
            })),
            preferredReadyTime: preferredReadyTime,
        }

        try {
            const res : { createOrder: Order } = await mutationCreateOrder({
                input: orderData
            })

            const order = res.createOrder

            trackEvent('order_placed', {
                order_id: order?.id,
                order_type: cartStore.collectionOption,
                is_online_payment: cartStore.paymentOption === 'ONLINE',
                total_price: cartTotal.value,
                items_count: cartStore.totalItems,
            })

            if (order?.payment?.links) {
                trackEvent('payment_redirect', { order_id: order.id })
                navigateTo(order.payment.links.checkout.href, { external: true })
            } else if (order?.id) {
                navigateTo(localePath(`/order-completed/${order.id}`))
            }
        } catch (err) {
            console.error('Error creating order:', err)
            return
        }

    } catch (err) {
        console.error('Order processing failed:', err)
    } finally {
        isCheckoutProcessing.value = false
    }
}
const cartTotal = computed(() => {
    let total = subtotal.value - totalDiscount.value;
    return Math.max(total, 0);
});

const subtotal = computed(() =>
    cartStore.products.reduce((acc, item) =>
        acc + (item.product.price * item.quantity), 0)
);

const totalDiscount = computed(() =>
    cartStore.collectionOption === 'PICKUP'
        ? cartStore.products.reduce((acc, item) =>
            item.product.discountable
                ? acc + (item.product.price * item.quantity * 0.1)
                : acc, 0)
        : 0
);

const isMinimumReached = computed(() => {
    if (cartStore.collectionOption === 'DELIVERY') {
        return cartTotal.value >= 25;
    } else if (cartStore.collectionOption === 'PICKUP') {
        return cartTotal.value >= 20;
    }
    return false
})
</script>
