<template>
  <section id="checkout-payment-extras" tabindex="-1" class="card p-5 w-full mx-auto space-y-6">
    <h2 class="text-lg font-bold text-neutral-900">
      {{ $t('checkout.extrasAndPayment', 'Extras & Payment') }}
    </h2>

    <!-- Coupon Code -->
    <CheckoutCouponInput />

    <!-- Payment Method with Icons -->
    <div class="mb-6">
      <h3 class="font-medium mb-2">
        {{ $t('checkout.paymentMethod', 'Payment Method') }}
      </h3>
      <div
        class="flex gap-4"
        role="radiogroup"
        :aria-label="$t('checkout.paymentMethod')"
        @keydown="onPaymentKeydown"
      >
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
            'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none',
            isOnlinePayment ? 'border-primary bg-tsb-four' : 'border-neutral-200 bg-white',
          ]"
        >
          <img
            src="/icons/online-payment-icon.svg"
            alt=""
            aria-hidden="true"
            class="w-10 h-10 mb-2"
          />
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
            'cursor-pointer flex-1 border rounded-lg p-4 flex flex-col items-center transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none',
            !isOnlinePayment ? 'border-primary bg-tsb-four' : 'border-neutral-200 bg-white',
          ]"
        >
          <img
            src="/icons/cash-payment-icon.svg"
            alt=""
            aria-hidden="true"
            class="w-10 h-10 mb-2"
          />
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
            ? 'bg-primary-50 border-primary-600 ring-2 ring-primary-600/50'
            : cashAcknowledgedModel
              ? 'bg-neutral-50 border-neutral-200'
              : 'bg-amber-50 border-amber-200',
        ]"
      >
        <div v-if="!cashAcknowledgedModel" class="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-amber-700 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p class="text-sm text-amber-800">
            {{ $t('checkout.cashWarning') }}
          </p>
        </div>

        <label
          id="cash-acknowledge-row"
          tabindex="-1"
          class="flex items-start gap-3 cursor-pointer"
        >
          <input
            ref="cashAckRef"
            type="checkbox"
            data-testid="cash-acknowledge"
            v-model="cashAcknowledgedModel"
            :class="[
              'mt-0.5 h-6 w-6 rounded shrink-0 focus-visible:ring-2',
              showCashAckError
                ? 'text-primary-700 border-primary-500 focus-visible:ring-ring focus-visible:ring-offset-2'
                : 'text-primary-700 border-neutral-300 focus-visible:ring-ring focus-visible:ring-offset-2',
            ]"
          />
          <span
            v-if="cashAcknowledgedModel"
            class="inline-flex items-center gap-1.5 text-sm text-neutral-700 font-medium"
          >
            <svg
              class="w-4 h-4 text-primary-500"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {{ $t('checkout.cashAcknowledged') }}
          </span>
          <span
            v-else
            :class="['text-sm font-medium', showCashAckError ? 'text-red-800' : 'text-amber-900']"
          >
            {{ $t('checkout.cashAcknowledge') }}
          </span>
        </label>

        <div>
          <label
            for="cash-payment-amount"
            :class="[
              'block text-sm font-medium mb-1',
              cashAcknowledgedModel ? 'text-neutral-800' : 'text-amber-900',
            ]"
          >
            {{ $t('checkout.cashAmountLabel') }}
            <span
              :class="[
                'text-xs font-normal',
                cashAcknowledgedModel ? 'text-neutral-600' : 'text-amber-800',
              ]"
              >{{ $t('checkout.optional') }}</span
            >
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
              @blur="cashTouched = true"
              :aria-invalid="showCashShort ? 'true' : undefined"
              :aria-describedby="cashHintId"
              :class="[
                'w-full pl-3.5 pr-8 py-2.5 border rounded-xl bg-white text-base sm:text-sm text-neutral-900 placeholder-neutral-600 focus-visible:outline-none transition-all duration-300',
                cashAcknowledgedModel
                  ? 'border-neutral-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring'
                  : 'border-amber-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-amber-400',
              ]"
            />
            <span
              :class="[
                'absolute inset-y-0 right-3 flex items-center text-sm pointer-events-none',
                cashAcknowledgedModel ? 'text-neutral-600' : 'text-amber-800',
              ]"
              >€</span
            >
          </div>
          <p
            v-if="showCashShort"
            id="cash-amount-hint"
            data-testid="cash-amount-short"
            aria-live="polite"
            class="mt-1.5 text-xs font-medium text-primary-700"
          >
            {{ $t('checkout.cashAmountTooLow', { total: formatCents(payableCents) }) }}
          </p>
          <p
            v-else-if="cashState.kind === 'change'"
            id="cash-amount-hint"
            data-testid="cash-amount-change"
            role="status"
            class="mt-1.5 text-xs font-medium text-green-800"
          >
            {{ $t('checkout.cashChangeDue', { amount: formatCents(cashState.changeCents) }) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Extras (brand.orderExtras) -->
    <div v-if="hasOfferedExtras" class="mb-6">
      <h3 class="font-medium text-lg mb-4">
        {{ $t('checkout.extras', 'Extras') }}
      </h3>
      <div class="grid grid-cols-1 gap-4">
        <!-- Chopsticks Card -->
        <div
          v-if="isOffered('chopsticks')"
          class="flex items-center p-4 border border-neutral-200 rounded-lg bg-neutral-50"
        >
          <input
            type="checkbox"
            id="chopsticks"
            data-testid="order-extra-chopsticks"
            v-model="addChopsticks"
            class="mr-4 h-6 w-6 text-primary-700 border-neutral-300 rounded"
          />
          <label for="chopsticks" class="text-neutral-700 font-medium">
            {{ $t('checkout.addChopsticks', 'Add Chopsticks') }}
          </label>
        </div>
        <!-- Cutlery Card -->
        <div
          v-if="isOffered('cutlery')"
          class="flex items-center p-4 border border-neutral-200 rounded-lg bg-neutral-50"
        >
          <input
            type="checkbox"
            id="cutlery"
            data-testid="order-extra-cutlery"
            v-model="addCutlery"
            class="mr-4 h-6 w-6 text-primary-700 border-neutral-300 rounded"
          />
          <label for="cutlery" class="text-neutral-700 font-medium">
            {{ $t('checkout.addCutlery') }}
          </label>
        </div>
        <!-- Wasabi Card -->
        <div
          v-if="isOffered('wasabi')"
          class="flex items-center p-4 border border-neutral-200 rounded-lg bg-neutral-50 transition-opacity"
          :class="isLocked('wasabi') ? 'opacity-60 cursor-not-allowed' : ''"
        >
          <input
            type="checkbox"
            id="wasabi"
            data-testid="order-extra-wasabi"
            v-model="addWasabi"
            :disabled="isLocked('wasabi')"
            class="mr-4 h-6 w-6 text-primary-700 border-neutral-300 rounded disabled:cursor-not-allowed"
          />
          <label for="wasabi" class="text-neutral-700 font-medium">
            {{ $t('checkout.addWasabi') }}
          </label>
        </div>
        <!-- Ginger Card -->
        <div
          v-if="isOffered('ginger')"
          class="flex items-center p-4 border border-neutral-200 rounded-lg bg-neutral-50 transition-opacity"
          :class="isLocked('ginger') ? 'opacity-60 cursor-not-allowed' : ''"
        >
          <input
            type="checkbox"
            id="ginger"
            data-testid="order-extra-ginger"
            v-model="addGinger"
            :disabled="isLocked('ginger')"
            class="mr-4 h-6 w-6 text-primary-700 border-neutral-300 rounded disabled:cursor-not-allowed"
          />
          <label for="ginger" class="text-neutral-700 font-medium">
            {{ $t('checkout.addGinger') }}
          </label>
        </div>
        <!-- Soy Sauce -->
        <div
          v-if="isOffered('sauce')"
          class="flex items-center flex-wrap gap-x-4 gap-y-2 p-4 border border-neutral-200 rounded-lg bg-neutral-50 transition-opacity"
          :class="isLocked('sauce') ? 'opacity-60 cursor-not-allowed' : ''"
        >
          <div class="flex items-center gap-4 shrink-0">
            <input
              type="checkbox"
              id="add-sauce"
              data-testid="order-extra-sauce"
              :checked="addSauce"
              :disabled="isLocked('sauce')"
              class="h-6 w-6 text-primary-700 border-neutral-300 rounded disabled:cursor-not-allowed"
              @change="addSauce = !addSauce"
            />
            <label for="add-sauce" class="text-neutral-700 font-medium">
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
                'px-3.5 py-1.5 min-h-11 text-sm border rounded-full whitespace-nowrap transition-all active:scale-[0.97]',
                sauce === option.value
                  ? 'border-primary bg-tsb-four text-primary-700 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400',
              ]"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="paidExtras.length > 0" class="mt-4" data-testid="checkout-paid-extras">
        <p class="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-2">
          {{ $t('checkout.paidExtra', 'Paid extra') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <template v-for="extra in paidExtras" :key="extra.code">
            <button
              v-if="extra.quantity === 0"
              type="button"
              :disabled="!extra.isAvailable"
              @click="incrementPaidExtra(extra.code)"
              class="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-300 bg-white text-neutral-700 px-3.5 py-1.5 text-xs transition-all active:scale-[0.97] hover:border-neutral-400"
              :class="!extra.isAvailable ? 'opacity-50 cursor-not-allowed' : ''"
            >
              <span>{{ extra.label }}</span>
              <span
                class="rounded-full bg-white/80 border border-neutral-200 px-2 py-0.5 tabular-nums"
              >
                +{{ formatCents(extra.priceCents) }}
              </span>
            </button>
            <div v-else role="group" :aria-label="extra.label" class="inline-flex items-stretch">
              <button
                type="button"
                :disabled="!extra.isAvailable || extra.quantity >= MAX_ITEM_QUANTITY"
                :aria-label="
                  $t(
                    'checkout.paidExtraIncreaseAria',
                    {
                      name: extra.label,
                      count: extra.quantity,
                      price: formatCents(extra.priceCents),
                    },
                    extra.quantity,
                  )
                "
                @click="incrementPaidExtra(extra.code)"
                class="inline-flex min-h-11 items-center gap-2 rounded-l-full border border-primary-300 bg-tsb-four text-primary-700 font-medium px-3.5 py-1.5 text-xs transition-transform active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{{ extra.label }}</span>
                <span
                  class="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-primary-600 text-white text-xs font-semibold tabular-nums px-1.5"
                  >×{{ extra.quantity }}</span
                >
                <span
                  class="rounded-full bg-white/80 border border-primary-200 px-2 py-0.5 tabular-nums"
                >
                  +{{ formatCents(extra.priceCents) }}
                </span>
              </button>
              <button
                type="button"
                :aria-label="$t('cart.decreaseQtyOf', { name: extra.label })"
                @click="decrementPaidExtra(extra.code)"
                class="inline-flex min-w-11 items-center justify-center px-2.5 rounded-r-full border border-l-0 border-primary-300 bg-tsb-four text-primary-700 hover:bg-primary-100 transition-colors active:scale-[0.97]"
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
        <span class="text-neutral-600 text-sm font-normal">{{
          $t('checkout.optional', '(optional)')
        }}</span>
      </h3>
      <textarea
        v-model="orderComment"
        aria-labelledby="order-comment-label"
        aria-describedby="order-comment-counter"
        rows="3"
        maxlength="500"
        class="field text-base sm:text-sm"
        :placeholder="
          $t('checkout.orderCommentPlaceholder', 'e.g. Allergies or special instructions')
        "
      ></textarea>
      <p
        id="order-comment-counter"
        class="text-xs mt-1 tabular-nums text-right"
        :class="
          orderComment.length >= ORDER_COMMENT_MAX
            ? 'text-primary-700 font-medium'
            : 'text-neutral-600'
        "
      >
        {{ orderComment.length }} / {{ ORDER_COMMENT_MAX }}
      </p>
    </div>

    <!-- Minimum Order Warning (delivery only — pickup has no minimum) -->
    <div v-if="!isMinimumReached" class="text-sm text-primary-700 text-center">
      {{ $t('cart.minimumDelivery', { amount: minimumAmount }) }}
    </div>

    <!-- Checkout Button (desktop only) -->
    <UiButton
      data-testid="checkout-place-order"
      size="lg"
      block
      class="hidden lg:inline-flex"
      :disabled="!isOrderingAvailable || isCartEmpty || isOrderBlocked"
      :loading="loading"
      @click="debouncedCheckout"
    >
      <template v-if="loading">{{ $t('checkout.processing', 'Processing...') }}</template>
      <template v-else>
        {{
          isOnlinePayment
            ? $t('checkout.goToPayment', 'Go to Payment')
            : $t('checkout.placeOrder', 'Place Order')
        }}
      </template>
    </UiButton>
    <p
      v-if="isQuotePending"
      data-testid="checkout-quote-updating-desktop"
      class="hidden lg:block text-center text-xs text-neutral-600 mt-1"
    >
      {{ $t('cart.quoteUpdating') }}
    </p>
  </section>
</template>

<script lang="ts" setup>
import { MAX_ITEM_QUANTITY, useCartStore } from '#engine/stores/cart'
import type { Product, ProductCategory } from '#engine/types'
import { centsToEuros } from '#engine/utils/money'
import { computed, nextTick, ref, watch } from 'vue'
import CheckoutCouponInput from '#engine/components/checkout/CheckoutCouponInput.vue'
import { evaluateCashAmount, sanitizeCashAmount } from '#engine/utils/cashPayment'
import { isCategoryBySlugUnsupportedError, paidExtrasOf } from '#engine/utils/paidExtras'
import { brand } from '#brand/brand'
import { formatCents } from '#engine/lib/price'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useDebounceFn } from '@vueuse/core'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'
import { useGqlQuery, useState } from '#imports'
import { useI18n } from 'vue-i18n'
import { useOrderExtras } from '#engine/composables/useOrderExtras'
import { useTracking } from '#engine/composables/useTracking'

const { policy } = useOrderingPolicy()
const minimumAmount = computed(() => centsToEuros(policy.value.deliveryMinimumCents))

const {
  isMinimumReached = false,
  loading = false,
  isOrderingAvailable = true,
  cashAcknowledged = false,
  cashAckError = false,
} = defineProps<{
  isMinimumReached?: boolean
  loading?: boolean
  isOrderingAvailable?: boolean
  cashAcknowledged?: boolean
  cashAckError?: boolean
}>()

// Only emphasise as an error while the box is still unchecked; the moment the user ticks it the highlight goes away even if the error list hasn't recomputed yet.
const showCashAckError = computed(() => cashAckError && !cashAcknowledged)

const cartStore = useCartStore()
// The pay button waits for the server quote and stays disabled while it reports something that would fail the order.
const { isOrderBlocked, isQuotePending, payableCents } = useCartTotals()
const { trackEvent } = useTracking()
const { t } = useI18n()
const {
  hasOfferedExtras,
  isOffered,
  isLocked,
  addChopsticks,
  addCutlery,
  addWasabi,
  addGinger,
  addSauce,
  sauce,
  sauceOptions,
  syncLockedExtras,
} = useOrderExtras()

const ORDER_COMMENT_MAX = 500

const isCartEmpty = computed(() => cartStore.products.length === 0)

/*
 * Only what the extras chips and the cart line of an extra read: the cart keeps a snapshot of the product
 * (name, code, slug, price, flags, category), the chip shows its name, price and availability. No description,
 * dietary flags or choices: an extra is a plain line.
 */
const EXTRA_PRODUCT_FIELDS = `
    id
    name
    price
    code
    slug
    pieceCount
    isVisible
    isAvailable
    isDiscountable
    isLunchOnly
    category {
        id
        name
        slug
    }
`

/** The extras category alone: tsb-service answers only that category's products. */
const EXTRA_CATEGORY_QUERY = `
    query CheckoutPaidExtraCategory($slug: String!) {
        productCategoryBySlug(slug: $slug) {
            id
            name
            slug
            products {
                ${EXTRA_PRODUCT_FIELDS}
            }
        }
    }
`

/*
 * ROLLOUT FALLBACK, remove once tsb-service with `productCategoryBySlug` runs in production: an older service
 * has no such field and answers GRAPHQL_VALIDATION_FAILED naming it. The whole menu is then fetched and filtered
 * (what the checkout always did), and the choice is remembered so later runs go straight to it.
 */
const EXTRA_PRODUCTS_LEGACY_QUERY = `
    query CheckoutPaidExtraProducts {
        productCategories {
            id
            name
            slug
            products {
                ${EXTRA_PRODUCT_FIELDS}
            }
        }
    }
`

const paidExtrasSlug = brand.paidExtrasCategorySlug
const bySlugUnsupported = useState<boolean>('paid-extras-by-slug-unsupported', () => false)
const { data: paidExtrasProductsData } = await useGqlQuery<{
  productCategoryBySlug?: ProductCategory | null
  productCategories?: ProductCategory[]
}>(
  EXTRA_CATEGORY_QUERY,
  { slug: paidExtrasSlug ?? '' },
  {
    immediate: Boolean(paidExtrasSlug),
    cache: true,
    lazy: true,
    legacy: {
      query: EXTRA_PRODUCTS_LEGACY_QUERY,
      variables: {},
      isUnsupported: isCategoryBySlugUnsupportedError,
      unsupported: bySlugUnsupported,
    },
  },
)

// Either answer: the category itself, or (an older backend) the one of the whole menu that has the slug.
const paidExtrasCategory = computed<ProductCategory | null>(() => {
  if (!paidExtrasSlug) return null
  const answer = paidExtrasProductsData.value
  const category =
    answer?.productCategoryBySlug ??
    answer?.productCategories?.find((c) => c.slug === paidExtrasSlug)
  if (!category) return null
  // The query leaves out what a plain extra never has; the cart reads `choices` of every line it holds.
  return {
    ...category,
    products: (category.products ?? []).map((product) => ({
      ...product,
      choices: [],
      choiceGroups: [],
    })),
  }
})

const getPaidProduct = (code: string): Product | undefined =>
  paidExtrasCategory.value?.products?.find((p) => p.code === code)

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

const paidExtras = computed(() =>
  paidExtrasOf(paidExtrasCategory.value?.products ?? [], cartStore.products),
)

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
    cartStore.cashPaymentAmount = sanitizeCashAmount(value)
  },
})

// An amount below the total is refused by the checkout; above it, the change due is shown (audit M25).
const cashState = computed(() =>
  evaluateCashAmount(cartStore.cashPaymentAmount, payableCents.value),
)
// "Less than the total" is only said once the customer is done typing (blur) or has tried to order (the checkout sets the flag): not on every digit.
const cashTouched = useState('checkout-cash-touched', () => false)
const showCashShort = computed(() => cashState.value.kind === 'short' && cashTouched.value)
const cashHintId = computed(() =>
  showCashShort.value || cashState.value.kind === 'change' ? 'cash-amount-hint' : undefined,
)

const sauceTypeOptions = computed(() =>
  sauceOptions.map((value) => ({ value, label: t(`checkout.${value}`) })),
)

const setOnlinePayment = (value: boolean) => {
  trackEvent('payment_method_selected', { method: value ? 'ONLINE' : 'CASH' })
  isOnlinePayment.value = value
}

// Computed binding for payment option
const isOnlinePayment = computed({
  get: () => cartStore.paymentOption === 'ONLINE',
  set: (value: boolean) => {
    cartStore.paymentOption = value ? 'ONLINE' : 'CASH'
  },
})

// Roving-tabindex + arrow-key nav on the payment radio group.
const onlineRadioRef = ref<HTMLButtonElement | null>(null)
const cashRadioRef = ref<HTMLButtonElement | null>(null)
const onPaymentKeydown = (e: KeyboardEvent) => {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
  if (!keys.includes(e.key)) return
  e.preventDefault()
  const wantOnline =
    e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Home'
      ? true
      : e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'End'
        ? false
        : isOnlinePayment.value
  setOnlinePayment(wantOnline)
  nextTick().then(() => (wantOnline ? onlineRadioRef.value : cashRadioRef.value)?.focus())
}

// Auto-focus the acknowledgement checkbox when the user switches to Cash — the ack control is far enough below the radio that users miss it otherwise.
const cashAckRef = ref<HTMLInputElement | null>(null)
watch(isOnlinePayment, (online, prev) => {
  if (prev !== undefined && !online) {
    nextTick().then(() => cashAckRef.value?.focus())
  }
})

syncLockedExtras()

// Computed binding for order comment
const orderComment = computed({
  get: () => cartStore.orderNote || '',
  set: (val: string) => {
    cartStore.orderNote = val
  },
})

const handleCheckout = () => {
  emit('checkout')
}

const debouncedCheckout = useDebounceFn(handleCheckout, 300)
</script>
