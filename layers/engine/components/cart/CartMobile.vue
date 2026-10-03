<template>
  <div class="lg:hidden">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="cartStore.isCartVisible"
        class="fixed inset-0 bg-black/30 z-[55]"
        @click="cartStore.toggleCartVisibility"
      />
    </Transition>

    <!-- Cart Panel -->
    <Transition name="slide-up">
      <div
        v-if="cartStore.isCartVisible"
        id="cart-mobile"
        ref="panelRef"
        data-testid="cart-mobile"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-heading"
        class="fixed bottom-0 inset-x-0 bg-tsb-one z-[60] flex flex-col max-h-[92dvh] rounded-t-2xl shadow-2xl"
      >
        <!-- Drag Handle -->
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 rounded-full bg-neutral-300" />
        </div>

        <!-- HEADER -->
        <header class="flex items-center justify-between px-4 pb-3 border-b border-neutral-200">
          <h2 id="cart-heading" class="text-xl font-semibold text-neutral-800">
            {{ $t('cart.title') }}
          </h2>
          <button
            ref="closeButtonRef"
            type="button"
            :aria-label="$t('cart.closeCart')"
            class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            @click="cartStore.toggleCartVisibility"
          >
            <svg
              class="h-6 w-6 text-neutral-700"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <!-- ITEMS + BREAKDOWN: one scroll area, so the footer under it stays down to the total and the button -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <ul class="space-y-3">
            <li
              v-for="(item, lineIndex) in cartStore.products"
              :key="lineKeys[lineIndex]"
              data-testid="cart-item"
              data-cart-line
              class="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-2 bg-white rounded-xl border border-neutral-100 shadow-sm p-3 items-center"
            >
              <!-- IMAGE -->
              <button
                type="button"
                class="row-span-2 flex shrink-0 items-center justify-center w-16 h-16 bg-neutral-50 rounded-md overflow-hidden cursor-pointer active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                :aria-label="$t('common.viewPhoto', { name: item.product.name })"
                aria-haspopup="dialog"
                @click="openLightbox(item.product.id, item.product.name)"
              >
                <picture class="contents">
                  <source :srcset="`${productImageBase(item.product.id)}.avif`" type="image/avif" />
                  <source :srcset="`${productImageBase(item.product.id)}.webp`" type="image/webp" />
                  <img
                    ref="itemImageElements"
                    :src="`${productImageBase(item.product.id)}.png`"
                    alt=""
                    class="object-contain w-full h-full"
                    width="64"
                    height="64"
                    draggable="false"
                    @error="handleProductImageError"
                  />
                </picture>
              </button>

              <!-- PRODUCT INFO (names and choices wrap in full: this is where the customer checks the order) -->
              <div class="flex flex-col justify-center text-sm min-w-0">
                <span v-if="itemLabelMeta(item)" class="text-xs text-neutral-600 break-words">
                  {{ itemLabelMeta(item) }}
                </span>
                <span class="font-medium text-neutral-800 leading-snug break-words">
                  {{ itemLabelName(item) }}
                </span>
                <span v-if="itemChoice(item)" class="text-xs text-primary-700 break-words">
                  ({{ itemChoice(item) }})
                </span>
                <span v-if="item.product.pieceCount" class="text-neutral-600 text-xs mt-1">
                  {{ item.product.pieceCount }}
                  {{ item.product.pieceCount === 1 ? $t('menu.pc') : $t('menu.pcs') }}
                </span>
                <span class="text-neutral-800 font-medium text-xs mt-1">
                  {{ formatCents(getItemLineTotalCents(item)) }}
                </span>
              </div>

              <!--
              CONTROLS: the same row for every line, under the information: the quantity at the start (a stepper, or the
              fixed "×N" of a customized line, which carries per-line selections and is edited in the modal), then the
              "Edit" button for a customized line, and the bin at the end.
            -->
              <div class="col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  v-if="hasChoices(item)"
                  data-testid="cart-item-quantity"
                  class="text-sm font-semibold tabular-nums text-primary-700"
                  >×{{ item.quantity }}</span
                >
                <QuantityStepper
                  v-else
                  :name="item.product.name"
                  :value="item.quantity"
                  :inc-disabled="item.quantity >= MAX_ITEM_QUANTITY"
                  dec-testid="cart-item-decrement"
                  inc-testid="cart-item-increment"
                  value-testid="cart-item-quantity"
                  @decrement="handleDecrementQuantity(item)"
                  @increment="handleIncrementQuantity(item)"
                />
                <div class="ml-auto flex items-center gap-2">
                  <UiButton
                    v-if="hasChoices(item)"
                    variant="secondary"
                    size="sm"
                    data-testid="cart-item-edit"
                    @click="editItem(item)"
                  >
                    {{ $t('cart.editItem') }}
                  </UiButton>
                  <button
                    type="button"
                    data-testid="cart-item-remove"
                    data-cart-remove
                    :aria-label="$t('cart.removeNamed', { name: item.product.name })"
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:text-primary-700 hover:bg-primary-50 active:bg-primary-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    @click="removeWithUndo(item)"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path
                        d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <!-- What the server quote says about this line, with the way out -->
              <CartLineIssues class="col-span-full" :item="item" :line-key="lineKeys[lineIndex]" />
            </li>

            <!-- EMPTY STATE -->
            <li
              v-if="cartStore.products.length === 0"
              class="flex flex-col items-center justify-center h-64 text-neutral-600"
            >
              <img src="/icons/shopping-bag-icon.svg" alt="" class="h-12 w-12 mb-4 flex-shrink-0" />
              <p>{{ $t('cart.empty') }}</p>
            </li>
          </ul>

          <!-- BREAKDOWN: with the lines, not in the footer, whose height is what the lines are left with on a small phone -->
          <div
            v-if="hasBreakdownRows"
            data-testid="cart-breakdown"
            class="space-y-1.5 rounded-xl border border-neutral-100 bg-white p-3 text-sm shadow-sm"
          >
            <div v-if="hasBreakdown" class="flex justify-between gap-3 text-neutral-600">
              <span>{{ $t('cart.subtotal') }}</span>
              <span class="tabular-nums">{{ formatCents(subtotalCents) }}</span>
            </div>
            <div
              v-if="cartStore.collectionOption === 'DELIVERY'"
              class="flex justify-between gap-3 text-neutral-600"
            >
              <span>{{ $t('cart.deliveryFee') }}</span>
              <span v-if="!cartStore.address?.distance" class="text-neutral-600 italic text-xs">
                {{ $t('cart.deliveryTbd') }}
              </span>
              <span
                v-else-if="deliveryFeeCents === -1"
                class="text-red-700 font-medium text-xs inline-flex flex-wrap items-center justify-end gap-x-2 text-right"
              >
                {{ $t(deliveryUnavailableKey, policyParams) }}
                <button
                  type="button"
                  data-testid="cart-out-of-zone-switch-to-pickup"
                  class="underline min-h-11 px-1 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
                  @click="switchToPickup"
                >
                  {{ $t('delivery.modal.switchToPickup') }}
                </button>
              </span>
              <span
                v-else-if="deliveryFeeCents === 0"
                class="inline-flex items-center px-2 py-0.5 rounded-full bg-tsb-four text-primary-700 text-xs font-semibold uppercase tracking-wide"
              >
                {{ $t('checkout.free') }}
              </span>
              <span v-else class="tabular-nums">{{ formatCents(deliveryFeeCents) }}</span>
            </div>
            <div v-if="pickupDiscountCents > 0" class="flex justify-between gap-3 text-green-800">
              <span>{{ $t('cart.pickupDiscount') }}</span>
              <span class="tabular-nums">-{{ formatCents(pickupDiscountCents) }}</span>
            </div>
            <div v-if="couponDiscountCents > 0" class="flex justify-between gap-3 text-green-800">
              <span
                >{{ $t('coupon.discount')
                }}<span v-if="cartStore.couponCode"> ({{ cartStore.couponCode }})</span></span
              >
              <span class="tabular-nums">-{{ formatCents(couponDiscountCents) }}</span>
            </div>
            <div v-if="onlineFeeCents > 0" class="flex justify-between gap-3 text-neutral-600">
              <span>{{ $t('cart.onlineFee') }}</span>
              <span class="tabular-nums">{{ formatCents(onlineFeeCents) }}</span>
            </div>
          </div>
        </div>

        <!-- FOOTER: TOTAL + CHECKOUT -->
        <footer
          v-if="cartStore.products.length"
          class="p-4 border-t border-neutral-200 bg-white rounded-b-none"
        >
          <div class="mb-3 text-sm">
            <div class="flex justify-between items-baseline gap-3">
              <span class="font-medium text-neutral-700">{{ $t('cart.total') }}</span>
              <span class="inline-flex flex-wrap items-baseline justify-end gap-x-2 text-right"
                ><QuoteUpdatingHint /><span
                  data-testid="cart-total"
                  class="text-lg font-semibold text-neutral-900 tabular-nums"
                  >{{ formatCents(payableCents) }}</span
                ></span
              >
            </div>
          </div>
          <!-- Delivery minimum (delivery only — pickup has no minimum) -->
          <div
            v-if="!isMinimumReached"
            data-testid="cart-minimum-warning"
            class="text-sm text-red-700 text-center mb-3"
          >
            <p>
              {{ $t('cart.addForDelivery', { amount: formatCents(amountToDeliveryMinimumCents) }) }}
            </p>
            <button
              type="button"
              data-testid="cart-switch-to-pickup"
              class="mt-1 min-h-11 px-3 font-medium underline hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
              @click="switchToPickup"
            >
              {{ $t('delivery.modal.switchToPickup') }}
            </button>
          </div>
          <div v-if="!isOrderingAvailable" class="text-sm text-amber-800 text-center mb-2">
            {{ $t('cart.orderingUnavailable') }}
          </div>
          <div
            v-else-if="preorderTime"
            data-testid="cart-preorder-hint"
            class="text-sm text-amber-800 text-center mb-2"
          >
            {{ $t('ordering.closedPreorder', { time: preorderTime }) }}
          </div>
          <UiButton
            to="/checkout"
            size="lg"
            block
            :disabled="!isOrderingAvailable || !isMinimumReached"
            @click="cartStore.toggleCartVisibility"
          >
            {{ $t('cart.checkout') }}
          </UiButton>
          <div class="safe-area-spacer-bottom" />
        </footer>
      </div>
    </Transition>
    <ImageLightbox v-if="showLightbox" ref="lightboxRef" :src="lightboxSrc" :alt="lightboxAlt" />
  </div>
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { computed, defineAsyncComponent, nextTick, ref, useRuntimeConfig, watch } from '#imports'
import type { CartItem } from '#engine/types'
// Async-loaded so the lightbox bundle is only fetched if the user actually opens it. We pair it with `v-if="showLightbox"` so the async resolve only fires while the user is on this page — otherwise the resolve callback could race the page-transition unmount and crash Vue with "Cannot read 'type' of null".
const ImageLightbox = defineAsyncComponent(() => import('#engine/components/ImageLightbox.vue'))
import { cartLineKeys } from '#engine/utils/cartLines'
import CartLineIssues from '#engine/components/CartLineIssues.vue'
import QuoteUpdatingHint from '#engine/components/QuoteUpdatingHint.vue'
import { formatCents } from '#engine/lib/price'
import { MAX_ITEM_QUANTITY, useCartStore } from '#engine/stores/cart'
import { until } from '@vueuse/core'
import { useCartItemActions } from '#engine/composables/useCartItemActions'
import { useCartSheet } from '#engine/composables/useCartSheet'
import { useBottomBarOffset } from '#engine/composables/useBottomBarOffset'
import { useCartItemLabel } from '#engine/composables/useCartItemLabel'
import { useCartRemoval } from '#engine/composables/useCartRemoval'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'
import { useHaptics } from '#engine/composables/useHaptics'
import { useOrderQuote } from '#engine/composables/useOrderQuote'
import { useTracking } from '#engine/composables/useTracking'

const { isOrderingAvailable = true, preorderTime = null } = defineProps<{
  isOrderingAvailable?: boolean
  preorderTime?: string | null
}>()

const config = useRuntimeConfig()
const cartStore = useCartStore()
// The open drawer is a bottom bar too: the toasts (Undo) float above it instead of covering its checkout button.
const panelRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLElement | null>(null)
useBottomBarOffset(panelRef)
// Dialog behaviour: focus trap, Escape, scroll lock, inert page behind, focus back to the opener.
useCartSheet(panelRef, closeButtonRef)
const { impact } = useHaptics()
const { trackEvent } = useTracking()
// Removing a line with the keyboard keeps focus in the sheet: on the next line, or on the close button when the cart is empty.
const { removeWithUndo, editItem } = useCartItemActions({
  container: () => panelRef.value,
  fallback: () => closeButtonRef.value,
})
const {
  getItemLineTotalCents,
  subtotalCents,
  pickupDiscountCents,
  deliveryFeeCents,
  deliveryUnavailableKey,
  couponDiscountCents,
  onlineFeeCents,
  payableCents,
  hasBreakdown,
  isMinimumReached,
  amountToDeliveryMinimumCents,
  switchToPickup,
} = useCartTotals()
const { policyParams } = useOrderingPolicy()
// Any row to show besides the total (the total itself is in the footer).
const hasBreakdownRows = computed(
  () =>
    cartStore.products.length > 0 &&
    (hasBreakdown.value ||
      cartStore.collectionOption === 'DELIVERY' ||
      pickupDiscountCents.value > 0 ||
      couponDiscountCents.value > 0 ||
      onlineFeeCents.value > 0),
)
// Keeps the server quote of the cart up to date (shared by every cart surface): its totals replace the client's maths once it answers.
useOrderQuote({ active: () => cartStore.isCartVisible })

const lightboxRef = ref<{ open: () => void } | null>(null)
const lightboxSrc = ref('')
const lightboxAlt = ref('')
const showLightbox = ref(false)

const openLightbox = async (id: string, name: string) => {
  lightboxSrc.value = productImage.productImageBase(config.public.s3bucketUrl, id, 'classic')
  lightboxAlt.value = name
  showLightbox.value = true
  await nextTick()
  // The lightbox is an async component: its instance only exists once its chunk has loaded (the first tap used to open nothing).
  if (!lightboxRef.value) await until(lightboxRef).toBeTruthy({ timeout: 5000 })
  lightboxRef.value?.open()
}

const { handleProductImageError } = productImage
const productImageBase = (id?: string | null) =>
  productImage.productImageBase(config.public.s3bucketUrl, id)
const itemImageElements = ref<HTMLImageElement[]>([])

watch(
  itemImageElements,
  () => {
    itemImageElements.value.forEach((img) => productImage.ensureProductImageFallback(img))
  },
  { flush: 'post' },
)

const { itemLabelMeta, itemLabelName, itemChoice, getItemKey } = useCartItemLabel()
// Unique even if an old persisted cart still holds two lines that share a key.
const lineKeys = computed(() => cartLineKeys(cartStore.products))

const hasChoices = (item: CartItem): boolean =>
  (item.selectedChoices?.length ?? 0) > 0 || Boolean(item.selectedChoice)

const handleIncrementQuantity = (cartItem: CartItem): void => {
  impact('Light')
  cartStore.incrementQuantity(cartItem.product, {
    choice: cartItem.selectedChoice,
    selections: cartItem.selectedChoices,
    quantity: cartItem.quantity,
  })
  trackEvent('product_quantity_incremented', {
    product_id: cartItem.product.id,
    new_quantity: cartItem.quantity,
  })
}

// The "−" and the remove button share one flow with every other cart surface: the last unit going down is a removal, and every removal offers Undo.
// Removing a line with the keyboard keeps focus in the sheet: on the next line, or on the close button when the cart is empty.
const { decrementLine: handleDecrementQuantity } = useCartRemoval({
  container: () => panelRef.value,
  fallback: () => closeButtonRef.value,
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.35s cubic-bezier(0.33, 1, 0.68, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
