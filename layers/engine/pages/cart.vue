<template>
  <div class="flex flex-col" :class="cartPageMinHeightClass" ref="pageRef">
    <!-- ═══ HEADER ═══ -->
    <div class="px-4 pt-5 pb-2 flex items-baseline justify-between">
      <PageTitle>{{ $t('cart.title') }}</PageTitle>
      <span v-if="hasLines" class="text-sm text-neutral-600 font-medium">
        {{ cartStore.totalItems }}
        {{ cartStore.totalItems === 1 ? $t('cart.item') : $t('cart.items') }}
      </span>
    </div>

    <!-- The persisted cart exists only in the browser: until mounted (and in the server render) a skeleton stands in, so neither an empty-cart state nor a list is rendered that the client would then contradict. -->
    <div
      v-if="!isMounted"
      aria-hidden="true"
      class="flex-1 flex flex-col px-4 pb-4 space-y-2 animate-pulse"
    >
      <div class="h-[88px] rounded-2xl bg-black/5" />
      <div class="h-[88px] rounded-2xl bg-black/5" />
      <div class="mt-2 h-[120px] rounded-2xl bg-black/5" />
    </div>

    <!-- ═══ ITEMS LIST ═══ -->
    <div v-if="hasLines" class="px-4 pb-4 space-y-2">
      <!-- Swipeable cart item wrapper -->
      <div
        v-for="(item, lineIndex) in cartStore.products"
        :key="lineKeys[lineIndex]"
        data-cart-line
        class="relative overflow-hidden rounded-2xl"
      >
        <!-- Delete action (revealed on swipe) -->
        <div class="absolute inset-y-0 right-0 flex items-center bg-red-500 rounded-2xl">
          <button
            type="button"
            :aria-label="$t('cart.removeNamed', { name: item.product.name })"
            class="h-full px-6 flex items-center justify-center text-white font-medium text-sm"
            @click="handleRemoveItem(item)"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>

        <!-- Card content (slides on swipe) -->
        <div
          class="relative bg-white border border-neutral-100 px-3 py-2.5 flex items-center gap-3 transition-transform duration-200 ease-out touch-pan-y"
          :style="{ transform: `translateX(${getSwipeOffset(item)}px)` }"
          @touchstart="onTouchStart($event, item)"
          @touchmove="onTouchMove($event, item)"
          @touchend="onTouchEnd(item)"
        >
          <!-- IMAGE — square, rounded, no crop -->
          <div
            class="w-[68px] h-[68px] shrink-0 rounded-xl bg-neutral-50 flex items-center justify-center overflow-hidden"
          >
            <picture>
              <source :srcset="itemImage(item.product).avif" type="image/avif" />
              <source :srcset="itemImage(item.product).webp" type="image/webp" />
              <img
                ref="itemImageElements"
                :src="itemImage(item.product).png"
                :alt="item.product.name"
                class="w-full h-full object-contain p-1"
                width="68"
                height="68"
                draggable="false"
                @error="handleProductImageError"
              />
            </picture>
          </div>

          <!-- INFO + CONTROLS -->
          <div class="flex-1 min-w-0">
            <!-- Row 1: Metadata (small, gray, truncated) -->
            <p
              v-if="itemLabelMeta(item)"
              class="text-[11px] text-neutral-600 truncate leading-tight mb-0.5"
            >
              {{ itemLabelMeta(item) }}
            </p>

            <!-- Row 2: Product name (bold, wraps up to 2 lines) -->
            <p class="text-[15px] font-semibold text-neutral-900 leading-tight line-clamp-2 pr-1">
              {{ itemLabelName(item) }}
            </p>

            <!-- Row 3: Choice (red) -->
            <p v-if="itemChoice(item)" class="text-xs text-primary-700 mt-0.5 truncate">
              ({{ itemChoice(item) }})
            </p>

            <p v-if="!canChangeQuantity(item)" class="text-[11px] text-neutral-600 italic mt-1">
              {{ $t('cart.customizedItemHint') }}
            </p>
            <!-- What the server quote says about this line, with the way out -->
            <CartLineIssues class="mt-2" :item="item" :line-key="lineKeys[lineIndex]" />

            <!-- Row 4: Price + Quantity stepper + remove -->
            <div class="flex items-center justify-between mt-1.5 gap-2">
              <div class="min-w-0 flex flex-col leading-tight">
                <span class="text-[15px] font-bold text-neutral-900 tabular-nums">
                  {{ formatCents(getItemLineTotalCents(item)) }}
                </span>
                <span
                  v-if="item.quantity > 1 && getItemExactUnitCents(item) !== null"
                  class="text-[11px] text-neutral-600 tabular-nums"
                >
                  {{ item.quantity }} × {{ formatCents(getItemExactUnitCents(item)!) }}
                </span>
              </div>

              <div class="flex items-center gap-1">
                <!-- Stepper: compact pill -->
                <div class="flex items-center gap-0 bg-neutral-100 rounded-full">
                  <button
                    type="button"
                    :aria-label="$t('cart.decreaseQty')"
                    class="w-11 h-11 flex items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:bg-transparent"
                    :disabled="!canChangeQuantity(item)"
                    :title="!canChangeQuantity(item) ? $t('cart.customizedItemHint') : undefined"
                    @click="handleDecrementQuantity(item)"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span
                    class="w-6 text-center text-sm font-semibold text-neutral-800 tabular-nums select-none"
                  >
                    {{ item.quantity }}
                  </span>
                  <button
                    type="button"
                    :aria-label="$t('cart.increaseQty')"
                    class="w-11 h-11 flex items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:bg-transparent"
                    :disabled="!canChangeQuantity(item)"
                    :title="!canChangeQuantity(item) ? $t('cart.customizedItemHint') : undefined"
                    @click="handleIncrementQuantity(item)"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>

                <!-- Explicit remove -->
                <button
                  type="button"
                  :aria-label="$t('cart.removeNamed', { name: item.product.name })"
                  data-cart-remove
                  class="w-11 h-11 flex items-center justify-center rounded-full text-neutral-600 hover:text-primary-700 hover:bg-primary-50 active:bg-primary-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  @click="handleRemoveItem(item)"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path
                      d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ ORDER SUMMARY ═══ -->
    <div v-if="hasLines" class="px-4 pb-4">
      <div class="bg-white rounded-2xl border border-neutral-100 px-4 py-3 space-y-1 text-sm">
        <div v-if="hasBreakdown" class="flex justify-between text-neutral-600">
          <span>{{ $t('cart.subtotal') }}</span>
          <span class="tabular-nums">{{ formatCents(subtotalCents) }}</span>
        </div>
        <div
          v-if="cartStore.collectionOption === 'DELIVERY'"
          class="flex justify-between text-neutral-600"
        >
          <span>{{ $t('cart.deliveryFee') }}</span>
          <span v-if="!cartStore.address?.distance" class="text-neutral-600 italic text-xs">
            {{ $t('cart.deliveryTbd') }}
          </span>
          <span
            v-else-if="deliveryFeeCents === -1"
            class="text-red-700 font-medium text-xs inline-flex flex-wrap items-center justify-end gap-x-2 text-right"
          >
            {{ $t(deliveryUnavailableKey) }}
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
            class="inline-flex items-center px-2 py-0.5 rounded-full bg-tsb-four text-primary-700 text-[11px] font-semibold uppercase tracking-wide"
          >
            {{ $t('checkout.free') }}
          </span>
          <span v-else class="tabular-nums">{{ formatCents(deliveryFeeCents) }}</span>
        </div>
        <div v-if="pickupDiscountCents > 0" class="flex justify-between text-green-800">
          <span>{{ $t('cart.pickupDiscount') }}</span>
          <span class="tabular-nums">-{{ formatCents(pickupDiscountCents) }}</span>
        </div>
        <div v-if="cartStore.couponDiscountCents > 0" class="flex justify-between text-green-800">
          <span
            >{{ $t('coupon.discount')
            }}<span v-if="cartStore.couponCode"> ({{ cartStore.couponCode }})</span></span
          >
          <span class="tabular-nums">-{{ formatCents(cartStore.couponDiscountCents) }}</span>
        </div>
        <div v-if="onlineFeeCents > 0" class="flex justify-between text-neutral-600">
          <span>{{ $t('cart.onlineFee') }}</span>
          <span class="tabular-nums">{{ formatCents(onlineFeeCents) }}</span>
        </div>
        <div class="flex justify-between items-baseline pt-2 mt-1 border-t border-neutral-100">
          <span class="font-bold text-neutral-900">{{ $t('cart.total') }}</span>
          <span class="inline-flex items-baseline gap-2"
            ><QuoteUpdatingHint /><span
              data-testid="cart-page-total"
              class="font-bold text-lg text-neutral-900 tabular-nums"
              >{{ formatCents(payableCents) }}</span
            ></span
          >
        </div>
      </div>
      <!-- Delivery minimum (delivery only — pickup has no minimum) -->
      <div
        v-if="!isMinimumReached"
        data-testid="cart-minimum-warning"
        class="text-sm text-red-700 text-center mt-3"
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
    </div>

    <!-- Spacer pushes checkout bar to the bottom -->
    <div v-if="hasLines" class="flex-1" />

    <!-- ═══ BOTTOM CHECKOUT BAR ═══ -->
    <div
      v-if="hasLines"
      ref="checkoutBarRef"
      class="sticky bottom-0 z-30 bg-white border-t border-neutral-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] p-4"
    >
      <UiButton to="/checkout" size="lg" block class="justify-between" :disabled="!canCheckout">
        <span class="flex items-center gap-2">
          <svg
            class="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {{ $t('cart.checkout') }}
        </span>
        <span class="font-bold text-base tabular-nums">{{ formatCents(payableCents) }}</span>
      </UiButton>
      <p v-if="isClosed" class="mt-2 text-center text-sm text-amber-800">
        {{ $t('cart.orderingUnavailable') }}
      </p>
      <p
        v-else-if="isPreorderOnly && firstSlotLabel"
        data-testid="cart-preorder-hint"
        class="mt-2 text-center text-sm text-amber-800"
      >
        {{ $t('ordering.closedPreorder', { time: firstSlotLabel }) }}
      </p>
      <div class="safe-area-spacer-bottom" />
    </div>

    <!-- ═══ EMPTY STATE ═══ -->
    <div
      v-else-if="isMounted"
      data-testid="cart-empty"
      class="flex-1 flex flex-col items-center justify-center px-8"
    >
      <div class="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-5">
        <svg
          class="w-9 h-9 text-neutral-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      </div>
      <p class="text-lg font-semibold text-neutral-800 mb-1">{{ $t('cart.empty') }}</p>
      <p class="text-sm text-neutral-600 text-center mb-6">{{ $t('cart.emptyHint') }}</p>
      <UiButton to="/menu" size="lg">
        {{ $t('nav.menu') }}
      </UiButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { PRODUCT_PHOTO_WIDTHS, productPhoto } from '#brand/data/productPhotos'
import { canChangeLineQuantity, cartLineKey, cartLineKeys } from '#engine/utils/cartLines'
import { computed, reactive, ref } from 'vue'
import { useRuntimeConfig, useSeoMeta } from '#imports'
import type { CartItem } from '#engine/types'
import CartLineIssues from '#engine/components/CartLineIssues.vue'
import QuoteUpdatingHint from '#engine/components/QuoteUpdatingHint.vue'
import { formatCents } from '#engine/lib/price'
import { orderItemLabelParts } from '#engine/utils/orderItemLabel'
import { useBottomBarOffset } from '#engine/composables/useBottomBarOffset'
import { useCartRemoval } from '#engine/composables/useCartRemoval'
import { useCartStore } from '#engine/stores/cart'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useHaptics } from '#engine/composables/useHaptics'
import { useI18n } from 'vue-i18n'
import { useMounted } from '@vueuse/core'
import { useOrderQuote } from '#engine/composables/useOrderQuote'
import { useOrderingAvailability } from '#engine/composables/useOrderingAvailability'
import { useTracking } from '#engine/composables/useTracking'

const { showProductCode = false } = useAppConfig().brand

definePageMeta({ public: true })

const config = useRuntimeConfig()
const cartStore = useCartStore()
// The cart is read from localStorage in the browser only: nothing that depends on it renders before the page is mounted.
const isMounted = useMounted()
const hasLines = computed(() => isMounted.value && cartStore.products.length > 0)
const { impact: hapticImpact } = useHaptics()
const { trackEvent } = useTracking()
const { t } = useI18n()

// The page had no title, so the tab, the history and the screen-reader route announcement all said the site name. Private, like checkout: not indexed.
useSeoMeta({
  title: () => t('schema.cart.title'),
  robots: 'noindex,nofollow',
})
const { handleProductImageError } = productImage
const productImageBase = (id?: string | null) =>
  productImage.productImageBase(config.public.s3bucketUrl, id)
/*
 * The same image as every other surface: the official photo of a mapped product (smallest size, the PNG fallback),
 * otherwise the dashboard upload keyed by product id (audit PR 3.8, P9: this used the slug, so it never found one).
 */
const itemImage = (product: { id: string; slug?: string | null }) => {
  const photo = productPhoto(product.slug)
  if (photo) {
    const small = Math.min(...(photo.widths ?? PRODUCT_PHOTO_WIDTHS))
    return {
      avif: `${photo.base}-${small}.avif`,
      webp: `${photo.base}-${small}.webp`,
      png: `${photo.base}-${photo.fallbackWidth ?? 560}.png`,
    }
  }
  const base = productImageBase(product.id)
  return { avif: `${base}.avif`, webp: `${base}.webp`, png: `${base}.png` }
}
const itemImageElements = ref<HTMLImageElement[]>([])
// Publishes the checkout bar's height so the toasts float above it.
const checkoutBarRef = ref<HTMLElement | null>(null)
useBottomBarOffset(checkoutBarRef)
// Blocking: the page renders with the config loaded (or failed). The checkout link is only disabled once the config says nothing can be ordered, never because it is missing; checkout shows the load error with its Retry.
const { isClosed, isPreorderOnly, firstSlotLabel } = await useOrderingAvailability()
const {
  getItemLineTotalCents,
  getItemExactUnitCents,
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
// Keeps the server quote of the cart up to date (shared by every cart surface): its totals replace the client's maths once it answers.
useOrderQuote()
// The delivery minimum blocks the CTA here exactly as it does in SideCart and at checkout.
const canCheckout = computed(() => !isClosed.value && isMinimumReached.value)

watch(
  itemImageElements,
  () => {
    itemImageElements.value.forEach((img) => productImage.ensureProductImageFallback(img))
  },
  { flush: 'post' },
)

const cartPageMinHeightClass = 'min-h-[100dvh]'

const itemLabelParts = (item: CartItem) =>
  orderItemLabelParts({
    code: item.product.code,
    categoryName: item.product.category?.name,
    productName: item.product.name,
  })

const itemLabelMeta = (item: CartItem): string | undefined => {
  const parts = itemLabelParts(item)
  const bits: string[] = []
  if (showProductCode && parts.code) bits.push(parts.code)
  if (parts.category) bits.push(parts.category)
  if (item.product.pieceCount) {
    const suffix = item.product.pieceCount === 1 ? t('menu.pc') : t('menu.pcs')
    bits.push(`${item.product.pieceCount} ${suffix}`)
  }
  return bits.length > 0 ? bits.join(' · ') : undefined
}

const itemLabelName = (item: CartItem): string => itemLabelParts(item).name

const itemChoice = (item: CartItem): string | undefined =>
  (item.selectedChoices?.length ?? 0) > 0
    ? (item.selectedChoices ?? [])
        .map((selection) => {
          const choice = item.product.choices.find(
            (productChoice) => productChoice.id === selection.choiceId,
          )
          if (!choice) return ''
          return selection.quantity > 1 ? `${choice.name} x${selection.quantity}` : choice.name
        })
        .filter(Boolean)
        .join(', ') || undefined
    : orderItemLabelParts({
        code: item.product.code,
        categoryName: item.product.category?.name,
        productName: item.product.name,
        choiceName: item.selectedChoice?.name,
      }).choice

// ── Cart mutations: every removal (the remove button, swipe, the last unit going down) goes through the shared undo flow
// Removing a line with the keyboard keeps focus on the page: on the next line, or on the "menu" link of the empty state.
const pageRef = ref<HTMLElement | null>(null)
const { removeLine: handleRemoveItem, decrementLine: handleDecrementQuantity } = useCartRemoval({
  container: () => pageRef.value,
  fallback: () => pageRef.value?.querySelector<HTMLElement>('[data-testid="cart-empty"] a'),
})

const handleIncrementQuantity = (cartItem: CartItem): void => {
  cartStore.incrementQuantity(cartItem.product, {
    choice: cartItem.selectedChoice,
    selections: cartItem.selectedChoices,
    quantity: cartItem.quantity,
  })
  hapticImpact('Light')
  trackEvent('product_quantity_incremented', {
    product_id: cartItem.product.id,
    new_quantity: cartItem.quantity,
  })
}

// ── Swipe-to-delete state
const SWIPE_THRESHOLD = 72
const swipeState = reactive<
  Record<string, { startX: number; currentX: number; swiping: boolean; open: boolean }>
>({})
const swipingItemKey = ref<string | null>(null)

const canChangeQuantity = (item: CartItem): boolean =>
  canChangeLineQuantity(item.selectedChoices, item.quantity)

const getItemKey = (item: CartItem): string => cartLineKey(item)
// Unique even if an old persisted cart still holds two lines that share a key.
const lineKeys = computed(() => cartLineKeys(cartStore.products))

const getSwipeOffset = (item: CartItem) => {
  const key = getItemKey(item)
  const state = swipeState[key]
  if (!state) return 0
  if (state.open) return -SWIPE_THRESHOLD
  if (!state.swiping) return 0
  const delta = state.currentX - state.startX
  return Math.min(0, Math.max(-SWIPE_THRESHOLD, delta))
}

const onTouchStart = (e: TouchEvent, item: CartItem) => {
  const key = getItemKey(item)
  // Close any other open swipe
  if (swipingItemKey.value && swipingItemKey.value !== key && swipeState[swipingItemKey.value]) {
    swipeState[swipingItemKey.value]!.open = false
  }
  const touch = e.touches[0]!
  swipeState[key] = {
    startX: touch.clientX,
    currentX: touch.clientX,
    swiping: false,
    open: swipeState[key]?.open ?? false,
  }
  if (swipeState[key]!.open) {
    swipeState[key]!.startX = touch.clientX - -SWIPE_THRESHOLD
  }
  swipingItemKey.value = key
}

const onTouchMove = (e: TouchEvent, item: CartItem) => {
  const key = getItemKey(item)
  const state = swipeState[key]
  if (!state) return
  const touch = e.touches[0]!
  state.currentX = touch.clientX
  state.swiping = true
}

const onTouchEnd = (item: CartItem) => {
  const key = getItemKey(item)
  const state = swipeState[key]
  if (!state) return
  const delta = state.currentX - state.startX
  state.swiping = false
  if (delta < -SWIPE_THRESHOLD / 2) {
    state.open = true
    hapticImpact('Light')
  } else {
    state.open = false
  }
}
</script>
