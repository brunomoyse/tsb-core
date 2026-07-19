<template>
    <section id="checkout-payment-extras" tabindex="-1" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 w-full mx-auto space-y-6">
        <h2 class="text-lg font-bold text-gray-900">
            {{ $t('checkout.extrasAndPayment', 'Extras & Payment') }}
        </h2>

        <!-- Coupon Code -->
        <CheckoutCouponInput />

        <!-- Payment Method with Icons -->
        <div class="mb-6">
            <h3 class="font-medium mb-2">
                {{ $t('checkout.paymentMethod', 'Payment Method') }}
            </h3>
            <div class="flex gap-4" role="radiogroup" :aria-label="$t('checkout.paymentMethod')" @keydown="onPaymentKeydown">
                <!-- Online Payment Card -->
                <button
                    ref="onlineRadioRef"
                    type="button"
                    role="radio"
                    :aria-checked="isOnlinePayment"
                    :tabindex="isOnlinePayment ? 0 : -1"
                    data-testid="payment-online"
                    @click="setOnlinePayment(true)"
                    :class="[
            'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none',
            isOnlinePayment ? 'border-red-300 bg-tsb-four' : 'border-gray-200 bg-white'
          ]"
                >
                    <img src="/icons/online-payment-icon.svg" alt="" aria-hidden="true" class="w-10 h-10 mb-2" />
                    <span class="font-semibold">{{ $t('checkout.online', 'Online Payment') }}</span>
                </button>
                <!-- Cash Payment Card -->
                <button
                    ref="cashRadioRef"
                    type="button"
                    role="radio"
                    :aria-checked="!isOnlinePayment"
                    :tabindex="!isOnlinePayment ? 0 : -1"
                    data-testid="payment-cash"
                    @click="setOnlinePayment(false)"
                    :class="[
            'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none',
            !isOnlinePayment ? 'border-red-300 bg-tsb-four' : 'border-gray-200 bg-white'
          ]"
                >
                    <img src="/icons/cash-payment-icon.svg" alt="" aria-hidden="true" class="w-10 h-10 mb-2" />
                    <span class="font-semibold">{{ $t('checkout.cash', 'Cash') }}</span>
                </button>
            </div>

            <!-- Cash payment: amber warning until acknowledged, then a compact confirmed state.
                 If validation fails on the ack checkbox, the wrapper switches to a red ring to draw the eye. -->
            <div
                v-if="!isOnlinePayment"
                data-testid="cash-payment-notice"
                :class="[
                    'mt-4 rounded-lg border p-4 space-y-3 transition-colors',
                    showCashAckError
                        ? 'bg-red-50 border-red-300 ring-2 ring-red-300/60'
                        : cashAcknowledgedModel ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-200'
                ]"
            >
                <div v-if="!cashAcknowledgedModel" class="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p class="text-sm text-amber-800">
                        {{ $t('checkout.cashWarning') }}
                    </p>
                </div>

                <label id="cash-acknowledge-row" tabindex="-1" class="flex items-start gap-3 cursor-pointer">
                    <input
                        ref="cashAckRef"
                        type="checkbox"
                        data-testid="cash-acknowledge"
                        v-model="cashAcknowledgedModel"
                        :class="[
                            'mt-0.5 h-5 w-5 rounded shrink-0 focus-visible:ring-2',
                            showCashAckError
                                ? 'text-red-600 border-red-500 focus-visible:ring-red-400'
                                : 'text-red-500 border-gray-300 focus-visible:ring-red-300'
                        ]"
                    />
                    <span v-if="cashAcknowledgedModel" class="inline-flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                        <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {{ $t('checkout.cashAcknowledged') }}
                    </span>
                    <span v-else :class="['text-sm font-medium', showCashAckError ? 'text-red-800' : 'text-amber-900']">
                        {{ $t('checkout.cashAcknowledge') }}
                    </span>
                </label>

                <div>
                    <label for="cash-payment-amount" :class="['block text-sm font-medium mb-1', cashAcknowledgedModel ? 'text-gray-800' : 'text-amber-900']">
                        {{ $t('checkout.cashAmountLabel') }}
                        <span :class="['text-xs font-normal', cashAcknowledgedModel ? 'text-gray-500' : 'text-amber-700/70']">{{ $t('checkout.optional') }}</span>
                    </label>
                    <div class="relative">
                        <input
                            id="cash-payment-amount"
                            data-testid="cash-payment-amount"
                            v-model="cashPaymentAmount"
                            type="text"
                            inputmode="decimal"
                            pattern="[0-9]*([.,][0-9]{0,2})?"
                            autocomplete="off"
                            :placeholder="$t('checkout.cashAmountPlaceholder')"
                            :class="[
                                'w-full pl-3.5 pr-8 py-2.5 border rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus-visible:outline-none transition-all duration-300',
                                cashAcknowledgedModel
                                    ? 'border-gray-200 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300'
                                    : 'border-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300/50 focus-visible:border-amber-400',
                            ]"
                        />
                        <span :class="['absolute inset-y-0 right-3 flex items-center text-sm pointer-events-none', cashAcknowledgedModel ? 'text-gray-500' : 'text-amber-700']">€</span>
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
                <div
                    class="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50 transition-opacity"
                    :class="isTokyoHotOnlyCart ? 'opacity-60 cursor-not-allowed' : ''"
                >
                    <input
                        type="checkbox"
                        id="wasabi"
                        v-model="addWasabi"
                        :disabled="isTokyoHotOnlyCart"
                        class="mr-4 h-5 w-5 text-red-500 border-gray-300 rounded disabled:cursor-not-allowed"
                    />
                    <label for="wasabi" class="text-gray-700 font-medium">
                        {{ $t('checkout.addWasabi') }}
                    </label>
                </div>
                <!-- Ginger Card -->
                <div
                    class="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50 transition-opacity"
                    :class="isTokyoHotOnlyCart ? 'opacity-60 cursor-not-allowed' : ''"
                >
                    <input
                        type="checkbox"
                        id="ginger"
                        v-model="addGinger"
                        :disabled="isTokyoHotOnlyCart"
                        class="mr-4 h-5 w-5 text-red-500 border-gray-300 rounded disabled:cursor-not-allowed"
                    />
                    <label for="ginger" class="text-gray-700 font-medium">
                        {{ $t('checkout.addGinger') }}
                    </label>
                </div>
                <!-- Soy Sauce -->
                <div
                    class="flex items-center flex-wrap gap-x-4 gap-y-2 p-4 border border-gray-200 rounded-lg bg-gray-50 transition-opacity"
                    :class="isTokyoHotOnlyCart ? 'opacity-60 cursor-not-allowed' : ''"
                >
                    <div class="flex items-center gap-4 shrink-0">
                        <input
                            type="checkbox"
                            id="add-sauce"
                            :checked="addSauce"
                            :disabled="isTokyoHotOnlyCart"
                            class="h-5 w-5 text-red-500 border-gray-300 rounded disabled:cursor-not-allowed"
                            @change="addSauce = !addSauce"
                        />
                        <label for="add-sauce" class="text-gray-700 font-medium">
                            {{ $t('checkout.addSoySauce') }}
                        </label>
                    </div>
                    <div v-if="addSauce" class="flex flex-wrap gap-2">
                        <button
                            v-for="option in sauceTypeOptions"
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
            <div v-if="paidExtras.length > 0" class="mt-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">
                    {{ $t('checkout.paidExtra', 'Paid extra') }}
                </p>
                <div class="flex flex-wrap gap-2">
                    <template v-for="extra in paidExtras" :key="extra.code">
                        <button
                            v-if="extra.quantity === 0"
                            type="button"
                            :disabled="!extra.isAvailable"
                            :aria-pressed="false"
                            :aria-label="`${extra.label} — ${$t('cart.increaseQty')}`"
                            @click="incrementPaidExtra(extra.code)"
                            class="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white text-gray-700 px-3 py-1.5 text-xs transition-all active:scale-[0.97] hover:border-gray-400"
                            :class="!extra.isAvailable ? 'opacity-50 cursor-not-allowed' : ''"
                        >
                            <span>{{ extra.label }}</span>
                            <span class="rounded-full bg-white/80 border border-gray-200 px-2 py-0.5 tabular-nums">
                                +{{ formatPrice(extra.price) }}
                            </span>
                        </button>
                        <div
                            v-else
                            role="group"
                            :aria-label="extra.label"
                            class="inline-flex items-stretch"
                        >
                            <button
                                type="button"
                                :disabled="!extra.isAvailable || extra.quantity >= MAX_ITEM_QUANTITY"
                                :aria-label="`${extra.label} — ${$t('cart.increaseQty')}`"
                                @click="incrementPaidExtra(extra.code)"
                                class="inline-flex items-center gap-2 rounded-l-full border border-red-300 bg-tsb-four text-red-700 font-medium px-3 py-1.5 text-xs transition-transform active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>{{ extra.label }}</span>
                                <span
                                    class="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-red-500 text-white text-[10px] font-semibold tabular-nums px-1.5"
                                >×{{ extra.quantity }}</span>
                                <span class="rounded-full bg-white/80 border border-red-200 px-2 py-0.5 tabular-nums">
                                    +{{ formatPrice(extra.price) }}
                                </span>
                            </button>
                            <button
                                type="button"
                                :aria-label="`${extra.label} — ${$t('cart.decreaseQty')}`"
                                @click="decrementPaidExtra(extra.code)"
                                class="inline-flex items-center justify-center px-2.5 rounded-r-full border border-l-0 border-red-300 bg-tsb-four text-red-700 hover:bg-red-100 transition-colors active:scale-[0.97]"
                            >
                                <span class="text-sm leading-none" aria-hidden="true">−</span>
                            </button>
                        </div>
                    </template>
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
                aria-describedby="order-comment-counter"
                rows="3"
                maxlength="500"
                class="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                :placeholder="$t('checkout.orderCommentPlaceholder', 'e.g. Allergies or special instructions')"
            ></textarea>
            <p
                id="order-comment-counter"
                class="text-xs mt-1 tabular-nums text-right"
                :class="orderComment.length >= ORDER_COMMENT_MAX ? 'text-red-600 font-medium' : 'text-gray-500'"
            >
                {{ orderComment.length }} / {{ ORDER_COMMENT_MAX }}
            </p>
        </div>

        <!-- Minimum Order Warning (delivery only — pickup has no minimum) -->
        <div v-if="!isMinimumReached" class="text-sm text-red-600 text-center">
            {{ $t('cart.minimumDelivery', { amount: 25}) }}
        </div>

        <!-- Checkout Button (desktop only) -->
        <button data-testid="checkout-place-order" @click="debouncedCheckout" :class="[
            'hidden lg:block w-full pt-2 pb-3 rounded-lg font-medium transition-all active:scale-[0.97]',
            !loading && isOrderingAvailable && !isCartEmpty
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none'
          ]" :disabled="loading || !isOrderingAvailable || isCartEmpty">
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
import { MAX_ITEM_QUANTITY, useCartStore } from '#engine/stores/cart'
import type { Product, ProductCategory } from '#engine/types'
import { computed, nextTick, ref, watch } from 'vue'
import CheckoutCouponInput from '~/components/checkout/CheckoutCouponInput.vue'
import { formatPrice } from '#engine/lib/price'
import { useDebounceFn } from '@vueuse/core'
import { useGqlQuery } from '#imports'
import { useI18n } from 'vue-i18n'
import { useTracking } from '#engine/composables/useTracking'

const { isMinimumReached = false, loading = false, isOrderingAvailable = true, cashAcknowledged = false, cashAckError = false } = defineProps<{
    isMinimumReached?: boolean
    loading?: boolean
    isOrderingAvailable?: boolean
    cashAcknowledged?: boolean
    cashAckError?: boolean
}>()

// Only emphasise as an error while the box is still unchecked; the moment the user ticks it the highlight goes away even if the error list hasn't recomputed yet.
const showCashAckError = computed(() => cashAckError && !cashAcknowledged)

const cartStore = useCartStore()
const { trackEvent } = useTracking()
const { t } = useI18n()

const ORDER_COMMENT_MAX = 500

const PAID_EXTRA_PRICE_MAX = 1

const isTokyoHotOnlyCart = computed(() => {
    const items = cartStore.products
    if (items.length === 0) return false
    return items.every((item) => item.product.category?.slug === 'tokyo-hot')
})

const isCartEmpty = computed(() => cartStore.products.length === 0)

const EXTRA_PRODUCTS_QUERY = `
    query CheckoutPaidExtraProducts {
        productCategories {
            id
            name
            slug
            products {
                id
                name
                description
                price
                code
                slug
                pieceCount
                isVisible
                isAvailable
                isHalal
                isLunchOnly
                isSpicy
                isVegetarian
                isDiscountable
                category {
                    id
                    name
                    slug
                }
                choices {
                    id
                    productId
                    priceModifier
                    sortOrder
                    name
                }
            }
        }
    }
`

const { data: paidExtrasProductsData } = await useGqlQuery<{ productCategories: ProductCategory[] }>(
    EXTRA_PRODUCTS_QUERY,
    {},
    { immediate: true, cache: true, lazy: true },
)

const accompagnementCategory = computed<ProductCategory | null>(() => {
    const categories = paidExtrasProductsData.value?.productCategories ?? []
    return categories.find((c) => c.slug === 'accompagnement') ?? null
})

const getPaidProduct = (code: string): Product | undefined =>
    accompagnementCategory.value?.products?.find((p) => p.code === code)

const paidExtraQuantity = (code: string): number =>
    cartStore.products
        .filter((item) => item.product.code === code && (!item.selectedChoice || (item.selectedChoices?.length ?? 0) === 0))
        .reduce((sum, item) => sum + item.quantity, 0)

const incrementPaidExtra = (code: string): void => {
    const product = getPaidProduct(code)
    if (!product || !product.isAvailable) return
    cartStore.incrementQuantity(product)
}

const decrementPaidExtra = (code: string): void => {
    const product = getPaidProduct(code)
    if (!product) return
    cartStore.decrementQuantity(product)
}

const paidExtras = computed(() => {
    const products = accompagnementCategory.value?.products ?? []
    return products
        .filter((p) => {
            const price = Number(p.price)
            return (
                p.isVisible &&
                p.code !== null &&
                Number.isFinite(price) &&
                price > 0 &&
                price <= PAID_EXTRA_PRICE_MAX
            )
        })
        .map((p) => ({
            code: p.code as string,
            label: p.name,
            price: Number(p.price),
            isAvailable: p.isAvailable,
            quantity: paidExtraQuantity(p.code as string),
        }))
        .sort((a, b) => a.price - b.price || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
})

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
    set: (value: string | number | null) => {
        if (value === '' || value === null || value === undefined) {
            cartStore.cashPaymentAmount = null
            return
        }
        const raw = String(value).replace(',', '.')
        const match = raw.match(/^(\d*)(\.\d{0,2})?/u)
        const sanitized = match ? `${match[1] ?? ''}${match[2] ?? ''}` : ''
        cartStore.cashPaymentAmount = sanitized === '' ? null : sanitized
    },
})

const sauceTypeOptions = computed(() => [
    { value: 'sweet', label: t('checkout.sweet') },
    { value: 'salty', label: t('checkout.salty') },
    { value: 'both', label: t('checkout.both') },
])

const addSauce = computed({
    get: () => sauce.value !== 'none',
    set: (value: boolean) => { sauce.value = value ? 'both' : 'none' },
})

const setOnlinePayment = (value: boolean) => {
    trackEvent('payment_method_selected', { method: value ? 'ONLINE' : 'CASH' })
    isOnlinePayment.value = value
}

// Computed binding for payment option
const isOnlinePayment = computed({
    get: () => cartStore.paymentOption === 'ONLINE',
    set: (value: boolean) => {
        cartStore.paymentOption = value ? 'ONLINE' : 'CASH'
    }
})

// Roving-tabindex + arrow-key nav on the payment radio group.
const onlineRadioRef = ref<HTMLButtonElement | null>(null)
const cashRadioRef = ref<HTMLButtonElement | null>(null)
const onPaymentKeydown = (e: KeyboardEvent) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const wantOnline = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Home'
        ? true
        : e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'End'
            ? false
            : isOnlinePayment.value
    setOnlinePayment(wantOnline)
    nextTick(() => (wantOnline ? onlineRadioRef.value : cashRadioRef.value)?.focus())
}

// Auto-focus the acknowledgement checkbox when the user switches to Cash — the ack control is far enough below the radio that users miss it otherwise.
const cashAckRef = ref<HTMLInputElement | null>(null)
watch(isOnlinePayment, (online, prev) => {
    if (prev !== undefined && !online) {
        nextTick(() => cashAckRef.value?.focus())
    }
})


// Factory for a two-way boolean binding against cartStore.orderExtra by name.
const useExtraToggle = (name: string) => computed({
    get: () => cartStore.orderExtra?.some(o => o.name === name) ?? false,
    set: (value: boolean) => {
        if (!cartStore.orderExtra) cartStore.orderExtra = []
        const idx = cartStore.orderExtra.findIndex(o => o.name === name)
        if (value && idx === -1) cartStore.orderExtra.push({ name })
        else if (!value && idx !== -1) cartStore.orderExtra.splice(idx, 1)
    },
})

const addChopsticks = useExtraToggle('chopsticks')
const addWasabi = useExtraToggle('wasabi')
const addGinger = useExtraToggle('ginger')

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

watch(isTokyoHotOnlyCart, (locked, prev) => {
    if (locked) {
        addWasabi.value = false
        addGinger.value = false
        sauce.value = 'none'
    } else if (prev === true && cartStore.products.length > 0) {
        addWasabi.value = true
        addGinger.value = true
        sauce.value = 'both'
    }
}, { immediate: true })

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
