<template>
    <div class="max-w-7xl mx-auto p-4 pb-24 lg:pb-4">
        <!-- Restaurant Closed Banner -->
        <div v-if="!isOrderingAvailable" role="alert" aria-live="assertive" aria-atomic="true" data-testid="checkout-restaurant-closed" class="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p class="text-amber-800 font-medium">
                {{ $t('checkout.restaurantClosed') }}
                <span v-if="nextOpeningTime" class="block text-sm mt-1 font-normal">{{ $t('checkout.opensAt', { time: nextOpeningTime }) }}</span>
            </p>
        </div>

        <!-- Minimum Order Warning Banner -->
        <div id="checkout-minimum-order-banner" role="alert" aria-live="assertive" aria-atomic="true" tabindex="-1" v-if="!isMinimumReached && cartStore.products.length > 0" class="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p class="text-red-700 font-medium text-sm">
                {{ cartStore.collectionOption === 'DELIVERY'
                    ? $t('cart.minimumDelivery', { amount: 25 })
                    : $t('cart.minimumPickup', { amount: 20 }) }}
            </p>
        </div>

        <!-- Validation Error Summary: rendered after a failed submit. Each item anchors to its field. -->
        <div
            v-if="submitErrors.length > 0"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            class="mb-6 rounded-lg bg-red-50 border border-red-200 p-4"
        >
            <div class="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div class="flex-1 min-w-0">
                    <p class="text-red-800 font-semibold text-sm mb-2">{{ $t('checkout.completeBeforeOrder') }}</p>
                    <ul class="space-y-1.5">
                        <li v-for="err in submitErrors" :key="err.targetId">
                            <button
                                type="button"
                                class="text-left text-sm text-red-700 underline underline-offset-2 decoration-red-300 hover:text-red-800 hover:decoration-red-500 focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none rounded"
                                @click="scrollToValidationTarget(err.targetId)"
                            >
                                {{ err.message }}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Page Title with Japanese accent -->
        <div class="flex items-center gap-3 mb-4">
            <h1 class="text-2xl font-bold">
                {{ $t('checkout.title', 'Checkout') }}
            </h1>
            <span class="text-red-300/30 text-sm tracking-wider" aria-hidden="true">お会計</span>
        </div>

        <!-- Step Indicator — reflects the current sub-step inside checkout so users
             know which stage they're on (address, sign in, phone, review, payment). -->
        <nav class="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-sm mb-6" :aria-label="$t('checkout.stepCheckout')">
            <NuxtLinkLocale to="/menu" class="text-red-600 hover:text-red-700 font-medium">
                {{ $t('checkout.stepMenu') }}
            </NuxtLinkLocale>
            <template v-for="(step, idx) in visibleSteps" :key="step.key">
                <span class="text-lg leading-none" :class="idx < currentStepIndex ? 'text-red-300' : 'text-gray-300'" aria-hidden="true">〉</span>
                <span
                    :class="[
                        idx === currentStepIndex ? 'font-bold text-gray-900' : idx < currentStepIndex ? 'text-red-600' : 'text-gray-400',
                    ]"
                    :aria-current="idx === currentStepIndex ? 'step' : undefined"
                >
                    {{ step.label }}
                </span>
            </template>
        </nav>

        <!-- Delivery zone gate: before we ask anonymous users to log in, confirm the address is deliverable.
             Prevents the "filled cart, logged in, then blocked at checkout" frustration. -->
        <CheckoutDeliveryGate v-if="needsDeliveryGate" />

        <!-- Auth step: shown while the user is anonymous. Keeps them on /checkout instead of
             redirecting to /auth/login; cart is already persisted in localStorage. -->
        <CheckoutAuthStep v-else-if="!authStore.user" />

        <template v-else>
            <!-- Sticky Order Summary Bar (mobile only, appears on scroll) -->
            <div
                v-if="showStickyBar && cartStore.products.length > 0"
                class="sticky top-0 z-20 lg:hidden -mx-4 px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-gray-200/60 transition-all"
            >
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500">
                        {{ $t('checkout.itemCount', { count: cartStore.totalItems }, cartStore.totalItems) }}
                    </span>
                    <span class="font-bold text-gray-900">{{ formatPrice(cartTotal) }}</span>
                </div>
            </div>

            <!-- Grid Layout: 1 column by default, 2 on lg, 3 on xl -->
            <div ref="gridRef" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                <template v-if="restaurantConfigPending">
                    <div
                        v-for="n in 3"
                        :key="`skel-${n}`"
                        aria-hidden="true"
                        class="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 animate-shimmer"
                    >
                        <div class="h-5 w-32 rounded bg-gray-100" />
                        <div class="space-y-2">
                            <div class="h-3 rounded bg-gray-100" />
                            <div class="h-3 rounded bg-gray-100 w-5/6" />
                            <div class="h-3 rounded bg-gray-100 w-2/3" />
                        </div>
                        <div class="h-10 rounded-lg bg-gray-100" />
                    </div>
                </template>
                <template v-else>
                    <CheckoutProductSummary />
                    <CheckoutCollectionOptions
                        @open-address-modal="openAddressModal"
                        @slot-expired="handleSlotExpired"
                        :opening-hours="restaurantConfig?.restaurantConfig?.openingHours"
                        :ordering-enabled="restaurantConfig?.restaurantConfig?.orderingEnabled"
                        :is-currently-open="restaurantConfig?.restaurantConfig?.isOrderingCurrentlyOpen"
                        :available-slots-today="restaurantConfig?.restaurantConfig?.availableSlotsToday"
                        :preparation-minutes="restaurantConfig?.restaurantConfig?.preparationMinutes"
                    />
                    <CheckoutPaymentExtras @checkout="handleCheckout" :isMinimumReached="isMinimumReached" :loading="isCheckoutProcessing" :isOrderingAvailable="isOrderingAvailable" :cashAckError="hasCashAckError" v-model:cashAcknowledged="cashAcknowledged" />
                </template>
            </div>

            <!-- Fixed Bottom Checkout Button (mobile only, both web & Capacitor) -->
            <div
                class="fixed left-0 right-0 sm:left-[142px] z-30 lg:hidden bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] p-4"
                :style="{ bottom: isCapacitor ? 'var(--cap-tab-clearance, 0px)' : '0' }"
            >
                <button
                    type="button"
                    data-testid="checkout-place-order"
                    @click="handleCheckout"
                    :disabled="isCheckoutProcessing || !isOrderingAvailable"
                    :class="[
                        'flex min-h-11 items-center justify-between w-full py-3.5 px-5 rounded-2xl active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2',
                        !isCheckoutProcessing && isOrderingAvailable
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    ]"
                >
                    <span v-if="isCheckoutProcessing" class="inline-flex items-center gap-2">
                        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        {{ $t('checkout.processing') }}
                    </span>
                    <span v-else class="font-semibold text-sm uppercase tracking-wide">
                        {{ cartStore.paymentOption === 'ONLINE'
                            ? $t('checkout.goToPayment')
                            : $t('checkout.placeOrder')
                        }}
                    </span>
                    <span class="font-bold text-base">{{ formatPrice(cartTotal) }}</span>
                </button>
                <div v-if="!isCapacitor" class="safe-area-spacer-bottom" />
            </div>
        </template>

        <!-- Payment Redirect Overlay -->
        <Teleport to="body">
            <div
                v-if="isRedirectingToPayment"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                class="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm"
            >
                <svg class="animate-spin h-8 w-8 text-red-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p class="text-gray-700 font-medium">{{ $t('checkout.openingPayment') }}</p>
            </div>
        </Teleport>

        <!-- Address Modal -->
        <div
            v-if="showAddressModal"
            class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
            :style="isCapacitor ? { paddingBottom: 'var(--cap-tab-clearance, 0px)' } : undefined"
            tabindex="0"
            @click.self="guardedCloseAddressModal"
        >
            <div ref="addressModalRef" role="dialog" aria-modal="true" aria-labelledby="address-modal-title" class="bg-white rounded-t-2xl sm:rounded-lg shadow-xl p-6 max-w-lg w-full sm:mx-4 relative" @click.stop>
                <button
                    type="button"
                    @click="guardedCloseAddressModal"
                    :aria-label="$t('common.close')"
                    class="absolute top-4 right-4 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
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
                        @click="guardedCloseAddressModal"
                        class="min-h-11 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                    >
                        {{ $t('common.cancel', 'Cancel') }}
                    </button>
                    <button
                        type="button"
                        @click="confirmAddress"
                        :disabled="!tempAddress"
                        class="min-h-11 px-4 py-2 rounded text-white text-sm transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        :class="!tempAddress ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'"
                    >
                        {{ $t('common.save', 'Save') }}
                    </button>
                </div>
                <div class="safe-area-spacer-bottom sm:hidden" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({ public: true })

import type { Address, CartItem, CreateOrderRequest, Order } from '~/types'
import { RESTAURANT_TZ, isSameBrusselsDay } from '~/utils/datetime'
import { computed, navigateTo, onMounted, useAuthStore, useCartStore, useGqlMutation, useLocalePath } from '#imports'
import { onMounted as onMountedVue, onUnmounted, ref, watch } from 'vue'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import CheckoutAuthStep from '~/components/checkout/CheckoutAuthStep.vue'
import CheckoutCollectionOptions from '~/components/checkout/CheckoutCollectionOptions.vue'
import CheckoutDeliveryGate from '~/components/checkout/CheckoutDeliveryGate.vue'
import CheckoutPaymentExtras from '~/components/checkout/CheckoutPaymentExtras.vue'
import CheckoutProductSummary from '~/components/checkout/CheckoutProductSummary.vue'
import { eventBus } from '~/eventBus'
import { formatPrice } from '~/lib/price'
import gql from 'graphql-tag'
import { useFocusTrap } from '~/composables/useFocusTrap'
import { useI18n } from 'vue-i18n'
import { DELIVERY_ZONE_METERS } from '~/lib/delivery'
import { useHaptics } from '~/composables/useHaptics'
import { usePlatform } from '~/composables/usePlatform'
import { useRestaurantConfig } from '~/composables/useRestaurantConfig'
import { useTracking } from '~/composables/useTracking'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const cartStore = useCartStore()
const localePath = useLocalePath()
const { isCapacitor } = usePlatform()
const { notification: hapticNotification } = useHaptics()
const { trackEvent } = useTracking()

// Check restaurant ordering status. Lazy so the checkout page can render a skeleton while the initial query resolves on slow client hydration.
const { config: restaurantConfig, pending: restaurantConfigPending } = await useRestaurantConfig({ lazy: true })
const isOrderingCurrentlyOpen = computed(() => restaurantConfig.value?.restaurantConfig?.isOrderingCurrentlyOpen ?? false)
const isOrderingEnabled = computed(() => restaurantConfig.value?.restaurantConfig?.orderingEnabled ?? false)
const hasFixedSlotsToday = computed(() => (restaurantConfig.value?.restaurantConfig?.availableSlotsToday?.length ?? 0) > 0)
const isOrderingAvailable = computed(() => isOrderingEnabled.value && (isOrderingCurrentlyOpen.value || hasFixedSlotsToday.value))

// Pre-auth delivery zone gate: block anonymous users from hitting login/register
// Until we know their address is deliverable. Preserves the cart either way.
const needsDeliveryGate = computed(() =>
    !authStore.user
    && cartStore.collectionOption === 'DELIVERY'
    && (!cartStore.address || (cartStore.address.distance ?? 0) >= DELIVERY_ZONE_METERS),
)

const needsPhoneCapture = computed(() => Boolean(authStore.user) && !authStore.user?.phoneNumber)

// Steps conditionally appear based on the user's state; current step advances as each gate is cleared.
const visibleSteps = computed(() => {
    const steps: { key: string; label: string }[] = []
    if (cartStore.collectionOption === 'DELIVERY') {
        steps.push({ key: 'address', label: t('checkout.stepAddress') })
    }
    if (!authStore.user) steps.push({ key: 'auth', label: t('checkout.stepSignIn') })
    if (needsPhoneCapture.value) steps.push({ key: 'phone', label: t('checkout.stepPhone') })
    steps.push({ key: 'review', label: t('checkout.stepReview') })
    steps.push({ key: 'payment', label: t('checkout.stepPayment') })
    return steps
})

const currentStepIndex = computed(() => {
    const steps = visibleSteps.value
    if (needsDeliveryGate.value) return steps.findIndex(s => s.key === 'address')
    if (!authStore.user) return steps.findIndex(s => s.key === 'auth')
    if (needsPhoneCapture.value) return steps.findIndex(s => s.key === 'phone')
    return steps.findIndex(s => s.key === 'review')
})

// Redirect to cart if ordering becomes unavailable (restaurant closes or ordering disabled)
watch(isOrderingAvailable, (available) => {
    if (!available && import.meta.client) {
        eventBus.emit('notify', {
            message: t('notify.errors.orderingUnavailable'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
        navigateTo(localePath('/cart'))
    }
})

const nextOpeningTime = computed(() => {
    const iso = restaurantConfig.value?.restaurantConfig?.nextOpeningAt
    if (!iso) return null
    const next = new Date(iso)
    const sameDay = isSameBrusselsDay(next, new Date())
    return new Intl.DateTimeFormat(locale.value, {
        ...(sameDay ? {} : { weekday: 'long' }),
        hour: '2-digit', minute: '2-digit',
        timeZone: RESTAURANT_TZ,
    }).format(next)
})

useSeoMeta({
    title: t('schema.checkout.title'),
    robots: 'noindex,nofollow',
})

// Sticky bar: show when grid scrolls past viewport top
const gridRef = ref<HTMLElement | null>(null)
const showStickyBar = ref(false)
const onScroll = () => {
    if (!gridRef.value) return
    showStickyBar.value = gridRef.value.getBoundingClientRect().top < 0
}
onMountedVue(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

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
            cashPaymentAmount
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

const handleSlotExpired = () => {
    eventBus.emit('notify', {
        message: t('notify.errors.slotExpiredAutoReset'),
        persistent: false,
        duration: 5000,
        variant: 'warning',
    })
}

/** Extract a human-readable message from a GraphQL error, mapping known backend errors to i18n. */
const extractGqlErrorMessage = (err: unknown): string | null => {
    const raw = Array.isArray(err) && err.length > 0 && err[0]?.message
        ? err[0].message as string
        : err instanceof Error ? err.message : null
    if (!raw) return null

    // Map known backend error strings to translated messages
    if (raw.includes('minimum order amount for pickup'))
        return t('checkout.minimumPickup', { amount: 20 })
    if (raw.includes('minimum order amount for delivery'))
        return t('checkout.minimumDelivery', { amount: 25 })
    if (raw.includes('ordering is currently unavailable'))
        return t('notify.errors.orderingUnavailable')
    if (raw.includes('address too far'))
        return t('notify.errors.deliveryAddressTooFar', { distance: 9 })
    if (raw.includes('coupon is no longer valid'))
        return t('coupon.invalid')
    if (raw.includes('UNAUTHENTICATED'))
        return null // Let the auth middleware handle this
    if (raw.includes('preferred ready time is no longer available') || raw.includes('preferred ready time must be at least'))
        return t('notify.errors.slotTooSoon')
    if (raw.includes('preferred ready time is outside allowed'))
        return t('notify.errors.slotOutsideHours')
    if (raw.includes('preferred ready time must be on the same day'))
        return t('notify.errors.slotNotToday')
    if (raw.includes('preferred ready time must be aligned'))
        return t('notify.errors.slotNotAligned')
    if (raw.includes('ordering is closed today'))
        return t('notify.errors.orderingClosedToday')
    if (raw.includes('fixed time is required while the restaurant is closed'))
        return t('notify.errors.fixedTimeRequiredWhileClosed')

    return raw
}

const openAddressModal = () => {
    trackEvent('delivery_address_modal_opened')
    showAddressModal.value = true
    tempAddress.value = null
}

const closeAddressModal = () => {
    showAddressModal.value = false
}

// Guarded close: warn before discarding a typed-but-unconfirmed address.
const guardedCloseAddressModal = () => {
    const typedSomething = Boolean(tempAddress.value)
    const differsFromSaved = tempAddress.value?.id !== cartStore.address?.id
    if (typedSomething && differsFromSaved) {
        if (!import.meta.client) return
        if (!window.confirm(t('checkout.discardAddress'))) return
    }
    closeAddressModal()
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
    // Always pre-check wasabi, ginger, and sauce (both)
    if (!cartStore.orderExtra) cartStore.orderExtra = []
    for (const name of ['wasabi', 'ginger']) {
        if (!cartStore.orderExtra.some(o => o.name === name)) {
            cartStore.orderExtra.push({ name })
        }
    }
    if (!cartStore.orderExtra.some(o => o.name === 'sauce')) {
        cartStore.orderExtra.push({ name: 'sauce', options: ['both'] })
    }

    // If the user is logged in and has an address, pre-fill the cart address
    if (authStore.user?.address && !cartStore.address) {
        cartStore.address = authStore.user.address
    }

    trackEvent('checkout_page_loaded', {
        total_items: cartStore.totalItems,
        total_price: cartTotal.value,
        collection_option: cartStore.collectionOption,
        has_address: Boolean(cartStore.address),
        is_authenticated: Boolean(authStore.user),
    })
})

const cashAcknowledged = ref(false)
watch(() => cartStore.paymentOption, (value) => {
    if (value === 'ONLINE') {
        cashAcknowledged.value = false
        cartStore.cashPaymentAmount = null
    }
})

// Checkout logic (simplified; extras and time selection are handled in CheckoutPaymentExtras component)
const isCheckoutProcessing = ref(false)
const isRedirectingToPayment = ref(false)

interface CheckoutValidationError {
    message: string
    targetId: string
    event: string
}

// Errors from the most recent submit attempt; recomputed on input changes so the list shrinks as the user fixes each issue.
const submitErrors = ref<CheckoutValidationError[]>([])

const hasCashAckError = computed(() =>
    submitErrors.value.some(e => e.targetId === 'cash-acknowledge-row'),
)

const scrollToValidationTarget = (targetId: string) => {
    if (!import.meta.client) return
    const target = document.getElementById(targetId)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (target instanceof HTMLElement) {
        window.setTimeout(() => {
            target.focus({ preventScroll: true })
        }, 250)
    }
}

const getCheckoutValidationErrors = (): CheckoutValidationError[] => {
    const errors: CheckoutValidationError[] = []

    if (!isMinimumReached.value) {
        errors.push({
            message: cartStore.collectionOption === 'DELIVERY'
                ? t('cart.minimumDelivery', { amount: 25 })
                : t('cart.minimumPickup', { amount: 20 }),
            targetId: 'checkout-minimum-order-banner',
            event: 'checkout_error_minimum_not_reached',
        })
    }

    if (!authStore.user?.phoneNumber) {
        errors.push({
            message: t('checkout.phoneCapture.requiredBeforeOrder'),
            targetId: 'checkout-phone-capture',
            event: 'checkout_error_phone_required',
        })
    }

    if (cartStore.collectionOption === 'DELIVERY' && !cartStore.address) {
        errors.push({
            message: t('notify.errors.addressRequired', 'Delivery address is required.'),
            targetId: 'checkout-delivery-address',
            event: 'checkout_error_address_required',
        })
    }

    if (cartStore.paymentOption === 'CASH' && !cashAcknowledged.value) {
        errors.push({
            message: t('checkout.cashAcknowledgeMissing'),
            targetId: 'cash-acknowledge-row',
            event: 'checkout_error_cash_not_acknowledged',
        })
    }

    if (cartStore.collectionOption === 'DELIVERY' && (cartStore.address?.distance ?? 0) >= DELIVERY_ZONE_METERS) {
        errors.push({
            message: t('notify.errors.deliveryAddressTooFar', { distance: 9 }),
            targetId: 'checkout-delivery-address',
            event: 'checkout_error_address_too_far',
        })
    }

    return errors
}

const handleCheckout = async () => {
    if (isCheckoutProcessing.value) return
    isCheckoutProcessing.value = true

    try {
        if (!isOrderingEnabled.value) {
            eventBus.emit('notify', {
                message: t('notify.errors.orderingUnavailable'),
                persistent: false,
                duration: 5000,
                variant: 'error',
            })
            return
        }

        if (!isOrderingCurrentlyOpen.value && !cartStore.preferredReadyTime) {
            eventBus.emit('notify', {
                message: t('notify.errors.fixedTimeRequiredWhileClosed'),
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

        const validationErrors = getCheckoutValidationErrors()
        submitErrors.value = validationErrors
        if (validationErrors.length > 0) {
            const [firstError] = validationErrors
            if (firstError) {
                trackEvent(firstError.event)
                scrollToValidationTarget(firstError.targetId)
            }

            // Surface the actual first missing field in the toast so the user knows what's wrong without scrolling up to the summary.
            const toastMessage = validationErrors.length === 1
                ? firstError!.message
                : t('checkout.completeBeforeOrderCount', { count: validationErrors.length }, validationErrors.length)
            eventBus.emit('notify', {
                message: toastMessage,
                persistent: false,
                duration: 3000,
                variant: 'error',
            })
            return
        }

        // Send ASAP as null. Fixed slots are already RFC3339 values.
        const { preferredReadyTime: selectedPreferredReadyTime } = cartStore
        let preferredReadyTime = null
        if (selectedPreferredReadyTime) {
            preferredReadyTime = selectedPreferredReadyTime
        }

        const cashAmount = cartStore.paymentOption === 'CASH'
            ? (String(cartStore.cashPaymentAmount ?? '').trim() || null)
            : null

        const orderData: CreateOrderRequest = {
            orderType: cartStore.collectionOption,
            isOnlinePayment: cartStore.paymentOption === 'ONLINE',
            addressPlaceId: (cartStore.collectionOption === 'DELIVERY')
                ? (cartStore.address?.id ?? null)
                : null,
            addressExtra: cartStore.addressExtra,
            couponCode: cartStore.couponCode,
            orderNote: cartStore.orderNote?.trim() || null,
            orderExtra: cartStore.orderExtra,
            items: cartStore.products.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                ...(item.selectedChoice ? { choiceId: item.selectedChoice.id } : {}),
            })),
            preferredReadyTime,
            cashPaymentAmount: cashAmount,
            // Capacitor: use custom URL scheme so Mollie redirects back to the app
            ...(isCapacitor ? {
                paymentRedirectUrl: 'be.tokyosushibarliege.app://order-completed',
            } : {}),
        }

        try {
            const res : { createOrder: Order } = await mutationCreateOrder({
                input: orderData
            })

            const order = res.createOrder
            hapticNotification('Success')

            trackEvent('order_placed', {
                order_id: order?.id,
                order_type: cartStore.collectionOption,
                is_online_payment: cartStore.paymentOption === 'ONLINE',
                total_price: cartTotal.value,
                items_count: cartStore.totalItems,
            })

            if (order?.payment?.links) {
                trackEvent('payment_redirect', { order_id: order.id })
                isRedirectingToPayment.value = true
                if (isCapacitor) {
                    // Open Mollie checkout in SFSafariViewController.
                    // Mollie redirects to be.tokyosushibarliege.app://order-completed/{id}
                    // Deep link handler in capacitor.client.ts closes browser and navigates
                    const { Browser } = await import('@capacitor/browser')
                    await Browser.open({ url: order.payment.links.checkout.href })
                } else {
                    navigateTo(order.payment.links.checkout.href, { external: true })
                }
            } else if (order?.id) {
                navigateTo(localePath(`/order-completed/${order.id}`))
            }
        } catch (err: unknown) {
            if (import.meta.dev) console.error('Error creating order:', err)
            hapticNotification('Error')
            eventBus.emit('notify', {
                message: extractGqlErrorMessage(err) ?? t('notify.errors.orderCreationFailed'),
                persistent: false,
                duration: 5000,
                variant: 'error',
            })
        }

    } catch (err: unknown) {
        if (import.meta.dev) console.error('Order processing failed:', err)
        hapticNotification('Error')
        eventBus.emit('notify', {
            message: extractGqlErrorMessage(err) ?? t('notify.errors.orderCreationFailed'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
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

const isMinimumReached = computed(() => {
    if (cartStore.collectionOption === 'DELIVERY') {
        return cartTotal.value >= 25;
    } else if (cartStore.collectionOption === 'PICKUP') {
        return cartTotal.value >= 20;
    }
    return false
})

// Keep the error summary in sync after submit; placed after deps so the getter doesn't hit TDZ.
watch(
    () => [
        cartStore.collectionOption,
        cartStore.products.length,
        cartStore.address?.id,
        cartStore.address?.distance,
        authStore.user?.phoneNumber,
        cartStore.paymentOption,
        cashAcknowledged.value,
        cartTotal.value,
    ],
    () => {
        if (submitErrors.value.length === 0) return
        submitErrors.value = getCheckoutValidationErrors()
    },
)
</script>
