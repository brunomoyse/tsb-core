<template>
  <!-- On a phone the wrapper reaches the screen edges (past the layout's own padding, --main-gutter): the cards need the width for the time slot, the phone and the promo fields. -->
  <!-- lg:min-h-fold (each brand's CSS: the viewport minus its top bar): the page is rendered after hydration (cart and session are in the browser), ~300-700px taller than the server's skeleton; the footer then sits just below the fold from the first frame instead of jumping out of the viewport (CLS), and a short page is not pushed further than the footer. -->
  <div
    class="max-w-7xl mx-auto p-4 max-sm:mx-[calc(var(--main-gutter,0px)*-1)] lg:min-h-[calc(100dvh-60px)]"
  >
    <!-- Restaurant Closed Banner: only for a loaded config that says nothing can be ordered -->
    <div
      v-if="isOrderingClosed"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-testid="checkout-restaurant-closed"
      class="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-center gap-3"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 text-amber-700 shrink-0"
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
      <p class="text-amber-800 font-medium">
        {{ $t('checkout.restaurantClosed') }}
        <span v-if="nextOpeningTime" class="block text-sm mt-1 font-normal">{{
          $t('checkout.opensAt', { time: nextOpeningTime })
        }}</span>
      </p>
    </div>

    <!-- Closed right now, but a slot today can still be booked -->
    <div
      v-else-if="isPreorderOnly && preorderTime"
      role="status"
      data-testid="checkout-preorder-banner"
      class="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-center gap-3"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 text-amber-700 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-amber-800 font-medium">
        {{ $t('ordering.closedPreorder', { time: preorderTime }) }}
      </p>
    </div>

    <!-- The opening hours could not be loaded: not "closed", an error with Retry -->
    <LoadError
      v-else-if="configLoadFailed"
      :message="$t('ordering.loadFailed')"
      :busy="restaurantConfigPending"
      data-testid="checkout-config-error"
      class="mb-6 rounded-lg p-4 bg-amber-50 border border-amber-200 text-amber-800"
      @retry="retryConfig()"
    />

    <!-- Minimum Order Warning Banner -->
    <ClientOnly>
      <div
        id="checkout-minimum-order-banner"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        tabindex="-1"
        v-if="!isMinimumReached && cartStore.products.length > 0"
        class="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 text-red-700 shrink-0"
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
        <p class="text-red-700 font-medium text-sm">
          {{ $t('cart.minimumDelivery', { amount: minimumAmount }) }}
        </p>
      </div>
    </ClientOnly>

    <!-- Validation Error Summary: rendered after a failed submit. Each item anchors to its field. -->
    <div
      v-if="submitErrors.length > 0"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      class="mb-6 rounded-lg bg-red-50 border border-red-200 p-4"
    >
      <div class="flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-red-700 shrink-0 mt-0.5"
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
        <div class="flex-1 min-w-0">
          <p class="text-red-800 font-semibold text-sm mb-2">
            {{ $t('checkout.completeBeforeOrder') }}
          </p>
          <ul class="space-y-1.5">
            <li v-for="err in submitErrors" :key="err.targetId">
              <button
                type="button"
                class="text-left text-sm text-primary-700 underline underline-offset-2 decoration-primary-300 hover:text-primary-900 hover:decoration-primary-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none rounded"
                @click="scrollToValidationTarget(err.targetId)"
              >
                {{ err.message }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- What stops the order according to the server quote (ordering off, slot gone, coupon no longer applies, flagged lines) -->
    <QuoteIssuesNotice />

    <!-- Page Title (Japanese accent is per brand) -->
    <div class="flex items-center gap-3 mb-4">
      <PageTitle>
        {{ $t('checkout.title', 'Checkout') }}
      </PageTitle>
      <span
        v-if="japaneseAccents"
        class="text-primary-300/30 text-sm tracking-wider after:content-[attr(data-glyph)]"
        data-glyph="お会計"
        aria-hidden="true"
      />
    </div>

    <!--
            Everything below depends on state that only exists in the browser (the persisted cart and signed-in user), so the
            server cannot render it: a client-only block with a same-sized skeleton avoids hydration mismatches and any jump
            between a server-rendered "anonymous / empty" version and the real one.
        -->
    <ClientOnly>
      <!-- Step Indicator: reflects the current sub-step inside checkout so users
             know which stage they're on (address, sign in, phone, review, payment). -->
      <nav
        class="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-sm mb-6"
        :aria-label="$t('checkout.stepCheckout')"
      >
        <!-- Each step carries its own trailing separator, so when the trail wraps a "〉" is never left alone at the start of a line. -->
        <span class="inline-flex items-center gap-x-2 whitespace-nowrap">
          <NuxtLinkLocale
            to="/menu"
            class="inline-flex min-h-11 items-center text-primary-700 hover:text-primary-800 font-medium"
          >
            {{ $t('checkout.stepMenu') }}
          </NuxtLinkLocale>
          <span
            class="text-lg leading-none"
            :class="currentStepIndex > 0 ? 'text-primary-300' : 'text-neutral-300'"
            aria-hidden="true"
            >〉</span
          >
        </span>
        <span
          v-for="(step, idx) in visibleSteps"
          :key="step.key"
          class="inline-flex items-center gap-x-2 whitespace-nowrap"
        >
          <span
            :class="[
              idx === currentStepIndex
                ? 'font-bold text-neutral-900'
                : idx < currentStepIndex
                  ? 'text-primary-700'
                  : 'text-neutral-600',
            ]"
            :aria-current="idx === currentStepIndex ? 'step' : undefined"
          >
            {{ step.label }}
          </span>
          <span
            v-if="idx < visibleSteps.length - 1"
            class="text-lg leading-none"
            :class="idx + 1 < currentStepIndex ? 'text-primary-300' : 'text-neutral-300'"
            aria-hidden="true"
            >〉</span
          >
        </span>
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
          ref="stickyBarRef"
          class="sticky top-[var(--nav-h,0px)] z-20 lg:hidden -mx-4 max-w-none px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-neutral-200/60 transition-all"
        >
          <div class="flex items-center justify-between text-sm">
            <span class="text-neutral-600">
              {{ $t('checkout.itemCount', { count: cartStore.totalItems }, cartStore.totalItems) }}
            </span>
            <span class="font-bold text-neutral-900">{{ formatCents(payableCents) }}</span>
          </div>
        </div>

        <!-- Grid Layout: 1 column by default, 2 on lg, 3 on xl -->
        <div ref="gridRef" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          <template v-if="restaurantConfigPending && !restaurantConfig">
            <div
              v-for="n in 3"
              :key="`skel-${n}`"
              aria-hidden="true"
              class="card relative overflow-hidden p-5 space-y-4 animate-shimmer"
            >
              <div class="h-5 w-32 rounded bg-neutral-100" />
              <div class="space-y-2">
                <div class="h-3 rounded bg-neutral-100" />
                <div class="h-3 rounded bg-neutral-100 w-5/6" />
                <div class="h-3 rounded bg-neutral-100 w-2/3" />
              </div>
              <div class="h-10 rounded-lg bg-neutral-100" />
            </div>
          </template>
          <template v-else-if="!configLoadFailed">
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
            <CheckoutPaymentExtras
              @checkout="handleCheckout"
              :isMinimumReached="isMinimumReached"
              :loading="isCheckoutProcessing"
              :isOrderingAvailable="isOrderingAvailable"
              :cashAckError="hasCashAckError"
              v-model:cashAcknowledged="cashAcknowledged"
            />
          </template>
        </div>

        <!-- Fixed Bottom Checkout Button (mobile only) -->
        <div
          ref="payBarRef"
          class="fixed left-0 right-0 sm:left-[var(--side-rail-width,0px)] bottom-0 z-30 lg:hidden bg-white border-t border-neutral-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] p-4"
        >
          <!--
            [label | total]: the total never shrinks or wraps (whitespace-nowrap), the label takes what is left and wraps onto a
            second line instead of pushing the total out of the button (uppercase YGF label + a 4-digit total at 320 px).
            The button's own side padding is tightened on phones to give both more room.
          -->
          <UiButton
            data-testid="checkout-place-order"
            size="lg"
            block
            class="justify-between gap-3 px-3 min-[400px]:px-4 sm:px-6"
            :disabled="!isOrderingAvailable || cartStore.products.length === 0 || isOrderBlocked"
            :loading="isCheckoutProcessing"
            @click="handleCheckout"
          >
            <span class="min-w-0 flex-1 whitespace-normal text-left leading-tight">
              <template v-if="isCheckoutProcessing">{{ $t('checkout.processing') }}</template>
              <template v-else>
                {{
                  cartStore.paymentOption === 'ONLINE'
                    ? $t('checkout.goToPayment')
                    : $t('checkout.placeOrder')
                }}
              </template>
            </span>
            <!-- w-0 min-w-full on the hint: it truncates inside the width of the total instead of widening the column. -->
            <span class="flex shrink-0 flex-col items-end leading-tight">
              <span class="whitespace-nowrap font-bold text-base tabular-nums">{{
                formatCents(payableCents)
              }}</span>
              <span
                v-if="isQuotePending"
                class="w-0 min-w-full truncate text-right text-xs font-normal opacity-80"
                data-testid="checkout-quote-updating"
                >{{ $t('cart.quoteUpdating') }}</span
              >
            </span>
          </UiButton>
          <div class="safe-area-spacer-bottom" />
        </div>
      </template>
      <template #fallback>
        <div aria-hidden="true" class="mb-6 h-5" />
        <div aria-hidden="true" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          <div
            v-for="n in 3"
            :key="`fallback-${n}`"
            class="relative overflow-hidden bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 space-y-4 animate-shimmer"
          >
            <div class="h-5 w-32 rounded bg-neutral-100" />
            <div class="space-y-2">
              <div class="h-3 rounded bg-neutral-100" />
              <div class="h-3 rounded bg-neutral-100 w-5/6" />
              <div class="h-3 rounded bg-neutral-100 w-2/3" />
            </div>
            <div class="h-10 rounded-lg bg-neutral-100" />
          </div>
        </div>
      </template>
    </ClientOnly>

    <!-- Payment Redirect Overlay (z-[110]: above the toasts, which sit at z-[100]); v-if on the Teleport itself (not the inner div) so the teleport vnode doesn't exist during normal navigation. An always-rendered Teleport with an empty body races with the out-in page transition and crashes Vue's unmount with "Cannot read 'type' of null". -->
    <Teleport v-if="isRedirectingToPayment" to="body">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        class="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm"
      >
        <svg
          class="animate-spin h-8 w-8 text-primary-500 mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p class="text-neutral-700 font-medium">{{ $t('checkout.openingPayment') }}</p>
      </div>
    </Teleport>

    <!-- Address Modal: a sheet that scrolls inside the screen, with the suggestions in its flow (not floating past its bottom edge) -->
    <div
      v-if="showAddressModal"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      @click.self="guardedCloseAddressModal"
    >
      <div
        ref="addressModalRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-modal-title"
        class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 max-w-lg w-full sm:mx-4 relative max-h-[92dvh] overflow-y-auto overscroll-contain"
        @click.stop
        @keydown.esc="guardedCloseAddressModal"
      >
        <button
          type="button"
          @click="guardedCloseAddressModal"
          :aria-label="$t('common.close')"
          class="absolute top-4 right-4 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h3
          id="address-modal-title"
          class="text-xl font-semibold text-neutral-900 text-center mb-6"
        >
          {{ $t('checkout.editAddress', 'Edit Address') }}
        </h3>
        <AddressAutocomplete @update:address="handleAddressUpdate" />
        <div class="mt-6 flex justify-end gap-2">
          <UiButton variant="secondary" @click="guardedCloseAddressModal">
            {{ $t('common.cancel', 'Cancel') }}
          </UiButton>
          <UiButton :disabled="!tempAddress" @click="confirmAddress">
            {{ $t('common.save', 'Save') }}
          </UiButton>
        </div>
        <div class="safe-area-spacer-bottom sm:hidden" />
      </div>
    </div>

    <!-- Discard-address confirmation (v-if on the component: see the Teleport note above) -->
    <ConfirmDialog
      v-if="showDiscardAddressConfirm"
      open
      :title="$t('checkout.discardAddress')"
      :confirm-label="$t('common.discard')"
      :cancel-label="$t('common.keepEditing')"
      @confirm="discardAddress"
      @cancel="showDiscardAddressConfirm = false"
    />
  </div>
</template>

<script lang="ts" setup>
// PageTransition disabled to avoid a Vue/Suspense + `mode: "out-in"` race that crashes with "Cannot read 'type' of null" during unmount when navigating away from /checkout. With out-in, the old subtree is held until the new page's async deps resolve; the resolve callback then unmounts the old branch and trips a stale vnode in the deep tree.
definePageMeta({ public: true, pageTransition: false })

import type { Address, CreateOrderRequest, Order } from '#engine/types'
import { RESTAURANT_TZ, isSameBrusselsDay } from '#engine/utils/datetime'
import { useDateLocale } from '#engine/composables/useDateLocale'
import {
  computed,
  navigateTo,
  nextTick,
  onMounted,
  useAuthStore,
  useCartStore,
  useGqlMutation,
  useLocalePath,
  useRoute,
  useState,
} from '#imports'
import { onMounted as onMountedVue, onUnmounted, ref, watch } from 'vue'
import AddressAutocomplete from '#engine/components/form/AddressAutocomplete.vue'
import CheckoutAuthStep from '#engine/components/checkout/CheckoutAuthStep.vue'
import CheckoutCollectionOptions from '#engine/components/checkout/CheckoutCollectionOptions.vue'
import CheckoutDeliveryGate from '#engine/components/checkout/CheckoutDeliveryGate.vue'
import CheckoutPaymentExtras from '#engine/components/checkout/CheckoutPaymentExtras.vue'
import CheckoutProductSummary from '#engine/components/checkout/CheckoutProductSummary.vue'
import QuoteIssuesNotice from '#engine/components/QuoteIssuesNotice.vue'
import { blockingProductName, orderPlacementRoute } from '#engine/utils/checkoutSubmit'
import { buildCreateOrderInput } from '#engine/utils/orderPayload'
import {
  checkoutPreflight,
  checkoutStepKeys,
  checkoutValidationIssues,
  currentCheckoutStep,
  hasCashAckIssue,
  type CheckoutStepKey,
} from '#engine/utils/checkoutRules'
import { createAddressPrefill } from '#engine/utils/addressPrefill'
import { formatCents } from '#engine/lib/price'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useOrderExtras } from '#engine/composables/useOrderExtras'
import { centsToEuros } from '#engine/utils/money'
import { reportError } from '#engine/utils/reportError'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useFocusTrap } from '#engine/composables/useFocusTrap'
import { useGqlErrorMessage } from '#engine/composables/useGqlErrorMessage'
import { unwrapGqlError } from '#engine/utils/gqlError'
import { useI18n } from 'vue-i18n'
import { deliveryMaxKm } from '#engine/utils/orderingPolicy'
import { deliveryZoneStatus } from '#engine/lib/delivery'
import { usePhoneCapture } from '#engine/composables/usePhoneCapture'
import { useHaptics } from '#engine/composables/useHaptics'
import { useBottomBarOffset } from '#engine/composables/useBottomBarOffset'
import { useStickyTopOffset } from '#engine/composables/useStickyTopOffset'
import { scrollBehavior } from '#engine/utils/scrollBehavior'
import { useCheckoutQuoteGuard } from '#engine/composables/useCheckoutQuoteGuard'
import { useOrderQuote } from '#engine/composables/useOrderQuote'
import LoadError from '#engine/components/LoadError.vue'
import { useOrderingAvailability } from '#engine/composables/useOrderingAvailability'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'
import { useTracking } from '#engine/composables/useTracking'

const { japaneseAccents = false } = useAppConfig().brand

const { t } = useI18n()
// Intl wants the regional locale (en-GB: 19:30, not 07:30 PM), as everywhere else in the shop.
const dateLocale = useDateLocale()
const gqlErrorMessage = useGqlErrorMessage()
// Names the cart item a line-level createOrder error points at (`extensions.productId`) in the message.
const blockingProductNameOf = (err: unknown): string | undefined =>
  blockingProductName(unwrapGqlError(err)?.extensions.productId, cartStore.products)
const authStore = useAuthStore()
const cartStore = useCartStore()
const { applyDefaults } = useOrderExtras()
const notifications = useNotificationsStore()
// The payable total is the amount Mollie is asked for (goods − discounts + delivery + online fee): the pay bar, the summary and the analytics payloads all use it.
const { payableCents, isMinimumReached, isOrderBlocked, isQuotePending } = useCartTotals()
// Keeps the server quote of this cart up to date: its totals replace the client's maths below, and its issues block the pay button.
useOrderQuote()
// The last check before createOrder, and the re-quotes while the page is open (prices / availability change on the server too).
const { confirmBeforeOrder } = useCheckoutQuoteGuard()
const localePath = useLocalePath()
const { notification: hapticNotification } = useHaptics()
const { trackEvent } = useTracking()

// Check restaurant ordering status. Lazy so the checkout page can render a skeleton while the initial query resolves on slow client hydration.
// The mobile pay bar publishes its height so the toasts float above it instead of covering the button.
const payBarRef = ref<HTMLElement | null>(null)
useBottomBarOffset(payBarRef, { reserveSpace: true })
// The sticky summary bar (mobile) publishes the bottom edge it covers, so a focused field scrolls clear of it.
const stickyBarRef = ref<HTMLElement | null>(null)
useStickyTopOffset(stickyBarRef)

// The one ordering gate (engine, utils/orderingAvailability.ts): open, or closed with a slot still bookable today (a pre-order). The closed banner only shows for a loaded config; a failed load shows its own error with Retry.
const {
  config: restaurantConfig,
  pending: restaurantConfigPending,
  isAvailable: isOrderingAvailable,
  isClosed: isOrderingClosed,
  isPreorderOnly,
  preorderTime,
  loadFailed: configLoadFailed,
  retry: retryConfig,
} = await useOrderingAvailability({ lazy: true })
const { policy } = useOrderingPolicy()
const minimumAmount = computed(() => centsToEuros(policy.value.deliveryMinimumCents))
// Open right now (ASAP is possible); while closed an order needs a fixed slot.
const isOrderingCurrentlyOpen = computed(
  () => restaurantConfig.value?.restaurantConfig?.isOrderingCurrentlyOpen ?? false,
)

// Pre-auth delivery zone gate: block anonymous users from hitting login/register
// Until we know their address is deliverable. Preserves the cart either way.
const needsDeliveryGate = computed(
  () =>
    !authStore.user &&
    cartStore.collectionOption === 'DELIVERY' &&
    (!cartStore.address || deliveryZoneStatus(policy.value, cartStore.address) !== 'ok'),
)

const needsPhoneCapture = computed(() => Boolean(authStore.user) && !authStore.user?.phoneNumber)

// Steps conditionally appear based on the user's state; current step advances as each gate is cleared (engine, utils/checkoutRules.ts).
const stepLabelKeys: Record<CheckoutStepKey, string> = {
  address: 'checkout.stepAddress',
  auth: 'checkout.stepSignIn',
  phone: 'checkout.stepPhone',
  review: 'checkout.stepReview',
  payment: 'checkout.stepPayment',
}
const stepInput = computed(() => ({
  isDelivery: cartStore.collectionOption === 'DELIVERY',
  signedIn: Boolean(authStore.user),
  needsPhone: needsPhoneCapture.value,
  needsDeliveryGate: needsDeliveryGate.value,
}))
const visibleSteps = computed(() =>
  checkoutStepKeys(stepInput.value).map((key) => ({ key, label: t(stepLabelKeys[key]) })),
)
const currentStepIndex = computed(() => {
  const current = currentCheckoutStep(stepInput.value)
  return visibleSteps.value.findIndex((s) => s.key === current)
})

// Redirect to cart if ordering becomes unavailable (restaurant closes or ordering disabled)
watch(isOrderingAvailable, (available) => {
  if (!available && import.meta.client) {
    notifications.notify({
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
  return new Intl.DateTimeFormat(dateLocale.value, {
    ...(sameDay ? {} : { weekday: 'long' }),
    hour: '2-digit',
    minute: '2-digit',
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

const CREATE_ORDER = /* GraphQL */ `
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
  notifications.notify({
    message: t('notify.errors.slotExpiredAutoReset'),
    persistent: false,
    duration: 5000,
    variant: 'warning',
  })
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
const showDiscardAddressConfirm = ref(false)
const guardedCloseAddressModal = () => {
  const typedSomething = Boolean(tempAddress.value)
  const differsFromSaved = tempAddress.value?.id !== cartStore.address?.id
  if (typedSomething && differsFromSaved) {
    showDiscardAddressConfirm.value = true
    return
  }
  closeAddressModal()
}
const discardAddress = () => {
  showDiscardAddressConfirm.value = false
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
  // Defend against an SSR-to-CSR hydration race: post-OIDC redirects land here with `cart.products = []` from the server payload, and the orderExtra/address writes below would persist that empty array; wiping the pre-auth selection. `$hydrate` (pinia-plugin-persistedstate) forces a re-read from localStorage first.
  if (import.meta.client) {
    const persisted = cartStore as unknown as { $hydrate?: (opts?: { runHooks?: boolean }) => void }
    persisted.$hydrate?.({ runHooks: false })
  }

  // Pre-select the brand's default extras (brand.orderExtras). Extras the cart can't take, such as wasabi on a hot-dishes-only cart, are cleared; CheckoutPaymentExtras disables their checkboxes.
  applyDefaults()

  prefillAddressFromUser()

  trackEvent('checkout_page_loaded', {
    total_items: cartStore.totalItems,
    total_price: centsToEuros(payableCents.value),
    collection_option: cartStore.collectionOption,
    has_address: Boolean(cartStore.address),
    is_authenticated: Boolean(authStore.user),
  })
})

// The signed-in customer's saved address pre-fills the cart address exactly once (engine, utils/addressPrefill.ts); the auth-sync plugin repairs a missing record a moment after first paint, so it can also happen after mount.
const addressPrefill = createAddressPrefill<Address>({
  userAddress: () => authStore.user?.address,
  cartAddress: () => cartStore.address,
  setCartAddress: (address) => {
    cartStore.address = address
  },
})
const prefillAddressFromUser = addressPrefill.prefill
watch(() => authStore.user?.address, prefillAddressFromUser)
watch(() => authStore.user, addressPrefill.onUserChanged)

// Same draft state as the phone card (CheckoutPhoneCapture): lets Pay save a number that was typed but not saved.
const phoneCapture = usePhoneCapture()

const cashAcknowledged = ref(false)
// Set by an order attempt so the cash-amount field says "less than the total" even if it was never left (see CheckoutPaymentExtras).
const cashTouched = useState('checkout-cash-touched', () => false)
watch(
  () => cartStore.paymentOption,
  (value) => {
    if (value === 'ONLINE') {
      cashAcknowledged.value = false
      cashTouched.value = false
      cartStore.cashPaymentAmount = null
    }
  },
)

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

const hasCashAckError = computed(() => hasCashAckIssue(submitErrors.value))

const scrollToValidationTarget = (targetId: string) => {
  if (!import.meta.client) return
  const target = document.getElementById(targetId)
  if (!target) return
  target.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
  if (target instanceof HTMLElement) {
    window.setTimeout(() => {
      target.focus({ preventScroll: true })
    }, 250)
  }
}

const getCheckoutValidationErrors = (): CheckoutValidationError[] => {
  const isDelivery = cartStore.collectionOption === 'DELIVERY'
  const zone =
    isDelivery && cartStore.address ? deliveryZoneStatus(policy.value, cartStore.address) : 'ok'
  return checkoutValidationIssues({
    isDelivery,
    hasAddress: Boolean(cartStore.address),
    zone,
    minimumReached: isMinimumReached.value,
    minimumAmount: minimumAmount.value,
    maxDistanceKm: deliveryMaxKm(policy.value),
    phoneUnsaved: phoneCapture.hasUnsavedInput.value,
    hasPhone: Boolean(authStore.user?.phoneNumber),
    paymentOption: cartStore.paymentOption,
    cashAcknowledged: cashAcknowledged.value,
    cashAmount: cartStore.cashPaymentAmount,
    payableCents: payableCents.value,
    totalLabel: formatCents(payableCents.value),
  }).map((issue) => ({
    message: issue.params
      ? t(issue.messageKey, issue.params)
      : issue.fallback
        ? t(issue.messageKey, issue.fallback)
        : t(issue.messageKey),
    targetId: issue.targetId,
    event: issue.event,
  }))
}

const handleCheckout = async () => {
  if (isCheckoutProcessing.value) return
  isCheckoutProcessing.value = true

  /* Set true once the order is created and we're committed to a redirect.
       The finally block leaves the button locked in that case so a stale
       tap during the navigation gap (or on Capacitor, while the Mollie
       Browser overlay is on top of this page) can't fire a second submit. */
  let createdOrder = false

  try {
    // What stops the order before the form is checked (engine, utils/checkoutRules.ts). Nothing is sent while the server has not priced the cart, or while it reports something that would fail the order.
    const cartHasLunchOnly = cartStore.products.some((item) => item.product.isLunchOnly)
    const slotValue = cartStore.preferredReadyTime
    const slot = slotValue
      ? restaurantConfig.value?.restaurantConfig?.availableSlotsToday?.find(
          (s) => s.value === slotValue,
        )
      : null
    const block = checkoutPreflight({
      orderingAvailable: isOrderingAvailable.value,
      orderBlocked: isOrderBlocked.value,
      quotePending: isQuotePending.value,
      openNow: isOrderingCurrentlyOpen.value,
      preferredReadyTime: cartStore.preferredReadyTime,
      cartEmpty: cartStore.products.length === 0,
      cartHasLunchOnly,
      slotAllowsLunchOnly: slot ? Boolean(slot.isLunchOnlyAllowed) : null,
    })
    if (block) {
      if (block.event) trackEvent(block.event)
      notifications.notify({
        message: block.fallback ? t(block.messageKey, block.fallback) : t(block.messageKey),
        persistent: false,
        duration: block.duration,
        variant: block.variant,
      })
      return
    }

    // A phone number typed but not saved yet is saved now, so the order carries the number on screen. When it is not valid, the field keeps its error and the summary below points at it.
    await phoneCapture.commitPending()

    if (cartStore.paymentOption === 'CASH') cashTouched.value = true
    const validationErrors = getCheckoutValidationErrors()
    submitErrors.value = validationErrors
    if (validationErrors.length > 0) {
      const [firstError] = validationErrors
      if (firstError) {
        trackEvent(firstError.event)
        scrollToValidationTarget(firstError.targetId)
      }

      // Surface the actual first missing field in the toast so the user knows what's wrong without scrolling up to the summary.
      const toastMessage =
        validationErrors.length === 1
          ? firstError!.message
          : t(
              'checkout.completeBeforeOrderCount',
              { count: validationErrors.length },
              validationErrors.length,
            )
      notifications.notify({
        message: toastMessage,
        persistent: false,
        duration: 3000,
        variant: 'error',
      })
      return
    }

    // Ask the server once more for the cart as it is now: when it reports an issue or another total than the one on screen, stop here (the page shows the new numbers and says so). A failed check lets the order go on.
    if (!(await confirmBeforeOrder(payableCents.value))) return

    // The same builder the quote uses (#engine/utils/orderPayload): the order is exactly what was priced.
    const orderData: CreateOrderRequest = buildCreateOrderInput(cartStore)

    try {
      const res: { createOrder: Order } = await mutationCreateOrder({
        input: orderData,
      })

      const order = res.createOrder
      // Remember which order this cart was checked out for: only its confirmation page may clear the cart.
      if (order?.id) cartStore.pendingOrderId = order.id
      hapticNotification('Success')

      trackEvent('order_placed', {
        order_id: order?.id,
        order_type: cartStore.collectionOption,
        is_online_payment: cartStore.paymentOption === 'ONLINE',
        total_price: centsToEuros(payableCents.value),
        items_count: cartStore.totalItems,
        revenue: order?.totalPrice ?? centsToEuros(payableCents.value),
        currency: 'EUR',
      })

      const route = orderPlacementRoute(order)
      if (route.kind === 'payment') {
        trackEvent('payment_redirect', { order_id: order?.id })
        isRedirectingToPayment.value = true
        createdOrder = true
        navigateTo(route.href, { external: true })
      } else if (route.kind === 'confirmation') {
        createdOrder = true
        navigateTo(localePath(`/order-completed/${route.orderId}`))
      }
    } catch (err: unknown) {
      reportError(err, 'checkout.createOrder')
      hapticNotification('Error')
      notifications.notify({
        message: gqlErrorMessage(err, 'notify.errors.orderCreationFailed', {
          productName: blockingProductNameOf(err),
        }),
        persistent: false,
        duration: 5000,
        variant: 'error',
      })
    }
  } catch (err: unknown) {
    reportError(err, 'checkout.processing')
    hapticNotification('Error')
    notifications.notify({
      message: gqlErrorMessage(err, 'notify.errors.orderCreationFailed'),
      persistent: false,
      duration: 5000,
      variant: 'error',
    })
  } finally {
    /* Only re-enable the button on validation failure or network error,
           so a created order stays locked until the page navigates / the
           Mollie overlay closes. */
    if (!createdOrder) isCheckoutProcessing.value = false
  }
}

// Arriving from a cart line that needs a lunch slot ("Choose a time slot"): bring the picker into view once the page has rendered it.
const route = useRoute()
watch(
  restaurantConfigPending,
  async (pending) => {
    if (pending || route.hash !== '#checkout-preferred-time') return
    await nextTick()
    scrollToValidationTarget('checkout-preferred-time')
  },
  { immediate: true },
)

// Keep the error summary in sync after submit; placed after deps so the getter doesn't hit TDZ.
watch(
  () => [
    cartStore.collectionOption,
    cartStore.products.length,
    cartStore.address?.id,
    cartStore.address?.distance,
    authStore.user?.phoneNumber,
    phoneCapture.hasUnsavedInput.value,
    cartStore.paymentOption,
    cashAcknowledged.value,
    cartStore.cashPaymentAmount,
    payableCents.value,
  ],
  () => {
    if (submitErrors.value.length === 0) return
    submitErrors.value = getCheckoutValidationErrors()
  },
)
</script>
