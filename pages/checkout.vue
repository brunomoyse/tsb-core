<template>
    <div class="max-w-7xl mx-auto p-4 pb-20 lg:pb-4">
        <!-- Restaurant Closed Banner -->
        <div v-if="!isOrderingAvailable" data-testid="checkout-restaurant-closed" class="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p class="text-amber-800 font-medium">
                {{ $t('checkout.restaurantClosed') }}
                <span v-if="nextOpeningTime" class="block text-sm mt-1 font-normal">{{ $t('checkout.opensAt', { time: nextOpeningTime }) }}</span>
            </p>
        </div>

        <!-- Page Title with Japanese accent -->
        <div class="flex items-center gap-3 mb-4">
            <h1 class="text-2xl font-bold">
                {{ $t('checkout.title', 'Checkout') }}
            </h1>
            <span class="text-red-300/30 text-sm tracking-wider" aria-hidden="true">お会計</span>
        </div>

        <!-- Step Indicator with Japanese-style separators -->
        <nav class="flex items-center justify-center gap-3 text-sm mb-6">
            <NuxtLinkLocale to="/menu" class="text-red-600 hover:text-red-700 font-medium">
                {{ $t('checkout.stepMenu') }}
            </NuxtLinkLocale>
            <span class="text-red-300 text-lg leading-none" aria-hidden="true">〉</span>
            <span class="font-bold text-gray-900">{{ $t('checkout.stepCheckout') }}</span>
            <span class="text-gray-300 text-lg leading-none" aria-hidden="true">〉</span>
            <span class="text-gray-400">{{ $t('checkout.stepPayment') }}</span>
        </nav>

        <!-- Grid Layout: 1 column by default, 2 on lg, 3 on xl -->
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <CheckoutProductSummary />
            <CheckoutCollectionOptions
                @open-address-modal="openAddressModal"
                :opening-hours="restaurantConfig?.restaurantConfig?.openingHours"
                :ordering-enabled="restaurantConfig?.restaurantConfig?.orderingEnabled"
                :is-currently-open="restaurantConfig?.restaurantConfig?.isCurrentlyOpen"
            />
            <CheckoutPaymentExtras @checkout="handleCheckout" :isMinimumReached="isMinimumReached" :loading="isCheckoutProcessing" :isOrderingAvailable="isOrderingAvailable" :isAddressTooFar="isAddressTooFar" />
        </div>

        <!-- Extras Suggestion -->
        <div class="mt-8">
            <CheckoutExtrasSuggestion />
        </div>

        <!-- Sticky Checkout Button (mobile only) -->
        <div class="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] p-4">
            <div class="flex items-center justify-between max-w-7xl mx-auto">
                <div class="font-semibold text-lg">
                    {{ formatPrice(cartTotal) }}
                </div>
                <button
                    @click="handleCheckout"
                    :class="[
                        'px-6 pt-2 pb-3 rounded-lg font-medium transition-all active:scale-[0.97]',
                        isMinimumReached && !isCheckoutProcessing && isOrderingAvailable && !isAddressTooFar
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    ]"
                    :disabled="!isMinimumReached || isCheckoutProcessing || !isOrderingAvailable || isAddressTooFar"
                >
                    <span v-if="isCheckoutProcessing" class="inline-flex items-center gap-2">
                        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        {{ $t('checkout.processing') }}
                    </span>
                    <span v-else>
                        {{ cartStore.paymentOption === 'ONLINE'
                            ? $t('checkout.goToPayment')
                            : $t('checkout.placeOrder')
                        }}
                    </span>
                </button>
            </div>
        </div>

        <!-- Address Modal -->
        <div
            v-if="showAddressModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            tabindex="0"
            @click.self="closeAddressModal"
        >
            <div ref="addressModalRef" role="dialog" aria-modal="true" aria-labelledby="address-modal-title" class="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full relative" @click.stop>
                <button
                    type="button"
                    @click="closeAddressModal"
                    :aria-label="$t('common.close')"
                    class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 id="address-modal-title" class="text-xl font-semibold text-gray-900 text-center mb-6">
                    {{ $t('checkout.editAddress', 'Edit Address') }}
                </h3>
                <AddressAutocomplete @update:address="handleAddressUpdate" />
                <div class="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        @click="closeAddressModal"
                        class="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm transition-all active:scale-[0.97]"
                    >
                        {{ $t('common.cancel', 'Cancel') }}
                    </button>
                    <button
                        type="button"
                        @click="confirmAddress"
                        :disabled="!tempAddress"
                        class="px-4 py-2 rounded text-white text-sm transition-all active:scale-[0.97]"
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
import type { Address, CartItem, CreateOrderRequest, Order } from '~/types'
import { computed, navigateTo, onMounted, useAuthStore, useCartStore, useGqlMutation, useLocalePath } from '#imports'
import { onUnmounted, ref, watch } from 'vue'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import CheckoutCollectionOptions from '~/components/checkout/CheckoutCollectionOptions.vue'
import CheckoutExtrasSuggestion from '~/components/checkout/CheckoutExtrasSuggestion.vue'
import CheckoutPaymentExtras from '~/components/checkout/CheckoutPaymentExtras.vue'
import CheckoutProductSummary from '~/components/checkout/CheckoutProductSummary.vue'
import { eventBus } from '~/eventBus'
import { formatPrice } from '~/lib/price'
import { getNextOpeningTime } from '~/utils/openingHours'
import gql from 'graphql-tag'
import { timeToRFC3339 } from '~/utils/utils'
import { useFocusTrap } from '~/composables/useFocusTrap'
import { useI18n } from 'vue-i18n'
import { useRestaurantConfig } from '~/composables/useRestaurantConfig'
import { useTracking } from '~/composables/useTracking'

const { t } = useI18n()
const authStore = useAuthStore()
const cartStore = useCartStore()
const localePath = useLocalePath()
const { trackEvent } = useTracking()

// Check restaurant ordering status
const { config: restaurantConfig } = await useRestaurantConfig()
const isOrderingAvailable = computed(() => restaurantConfig.value?.restaurantConfig?.isCurrentlyOpen ?? false)

const nextOpeningTime = computed(() => {
    const hours = restaurantConfig.value?.restaurantConfig?.openingHours
    if (!hours) return null
    const dayLabels: Record<string, string> = {
        monday: t('days.monday'),
        tuesday: t('days.tuesday'),
        wednesday: t('days.wednesday'),
        thursday: t('days.thursday'),
        friday: t('days.friday'),
        saturday: t('days.saturday'),
        sunday: t('days.sunday'),
    }
    return getNextOpeningTime(hours, dayLabels)
})

useSeoMeta({
    title: t('schema.checkout.title'),
    robots: 'noindex,nofollow',
})

// Manage the address modal state and delivery address
const showAddressModal = ref(false)
const tempAddress = ref<Address | null>(null)
const addressModalRef = ref<HTMLElement | null>(null)
useFocusTrap(addressModalRef)

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

// Close address modal on Escape key
const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeAddressModal()
}
watch(showAddressModal, (open) => {
    if (open) {
        document.addEventListener('keydown', handleEscapeKey)
    } else {
        document.removeEventListener('keydown', handleEscapeKey)
    }
})
onUnmounted(() => {
    document.removeEventListener('keydown', handleEscapeKey)
})
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
        has_address: Boolean(cartStore.address),
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
        if (!isOrderingAvailable.value) {
            eventBus.emit('notify', {
                message: t('notify.errors.orderingUnavailable'),
                persistent: false,
                duration: 5000,
                variant: 'error',
            })
            return
        }

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
            couponCode: cartStore.couponCode,
            orderNote: cartStore.orderNote,
            orderExtra: cartStore.orderExtra,
            items: cartStore.products.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                ...(item.selectedChoice ? { choiceId: item.selectedChoice.id } : {}),
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
        }

    } catch (err) {
        console.error('Order processing failed:', err)
    } finally {
        isCheckoutProcessing.value = false
    }
}
const cartTotal = computed(() => {
    const total = subtotal.value - totalDiscount.value - cartStore.couponDiscount;
    return Math.max(total, 0);
});

const getItemUnitPrice = (item: CartItem) =>
    Number(item.product.price) +
    (item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0)

const subtotal = computed(() =>
    cartStore.products.reduce((acc, item) =>
        acc + (getItemUnitPrice(item) * item.quantity), 0)
);

const totalDiscount = computed(() =>
    cartStore.collectionOption === 'PICKUP'
        ? cartStore.products.reduce((acc, item) =>
            item.product.isDiscountable
                ? acc + (getItemUnitPrice(item) * item.quantity * 0.1)
                : acc, 0)
        : 0
);

const isAddressTooFar = computed(() =>
    cartStore.collectionOption === 'DELIVERY' && (cartStore.address?.distance ?? 0) >= 9000
)

const isMinimumReached = computed(() => {
    if (cartStore.collectionOption === 'DELIVERY') {
        return cartTotal.value >= 25;
    } else if (cartStore.collectionOption === 'PICKUP') {
        return cartTotal.value >= 20;
    }
    return false
})
</script>
