<template>
  <!--
    "Your last order", one tap from the cart: for a signed-in customer whose cart is empty, on the home page and the
    menu (the layout decides where). Fixed at the bottom like the floating cart bar (which only shows once the cart has
    something, so the two never meet), as a card in the corner from `sm` up. It appears after the page has loaded and
    moves nothing on the page.
  -->
  <Transition name="reorder-bar">
    <section
      v-if="shown"
      ref="barRef"
      data-testid="reorder-bar"
      :aria-label="$t('reorder.barTitle')"
      class="fixed z-30 inset-x-0 bottom-0 border-t border-neutral-100 bg-white shadow-lg sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96 sm:rounded-2xl sm:border"
    >
      <div class="flex items-center gap-3 py-3 pl-4 pr-1 sm:pr-2">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-neutral-900">
            {{ $t('reorder.barTitle') }}
            <span class="font-normal text-neutral-500">· {{ orderDate }}</span>
          </p>
          <p class="truncate text-xs text-neutral-600" data-testid="reorder-bar-summary">
            {{ itemsLabel }} · {{ total }}
          </p>
        </div>
        <button
          type="button"
          data-testid="reorder-bar-button"
          class="btn btn-primary btn-sm shrink-0"
          @click="onReorder"
        >
          {{ $t('reorder.button') }}
        </button>
        <button
          type="button"
          data-testid="reorder-bar-close"
          :aria-label="$t('reorder.barClose')"
          class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          @click="onDismiss"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="safe-area-spacer-bottom sm:hidden" />
    </section>
  </Transition>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDayMonth } from '#engine/utils/datetime'
import { formatPrice } from '#engine/lib/price'
import { summarizeOrder } from '#engine/utils/lastOrder'
import { useBottomBarOffset } from '#engine/composables/useBottomBarOffset'
import { useCartStore } from '#engine/stores/cart'
import { useDateLocale } from '#engine/composables/useDateLocale'
import { useLastOrder } from '#engine/composables/useLastOrder'
import { useReorder } from '#engine/composables/useReorder'
import { useTracking } from '#engine/composables/useTracking'

const { t } = useI18n()
const cartStore = useCartStore()
const dateLocale = useDateLocale()
const { order, dismiss } = useLastOrder()
const { reorder } = useReorder()
const { trackEvent } = useTracking()

// Only with an empty cart and the cart drawer closed: with something in the cart, the cart is the way forward.
const shown = computed(
  () => order.value !== null && cartStore.totalItems === 0 && !cartStore.isCartVisible,
)

const orderDate = computed(() =>
  order.value ? formatDayMonth(order.value.createdAt, dateLocale.value) : '',
)
const total = computed(() => (order.value ? formatPrice(order.value.totalPrice) : ''))
const itemsLabel = computed(() => {
  if (!order.value) return ''
  const { names, more } = summarizeOrder(order.value)
  const listed = names.join(', ')
  return more > 0 ? `${listed} ${t('reorder.barMore', { count: more }, more)}` : listed
})

// Publishes the bar's height so the toasts and the scroll-to-top button float above it.
const barRef = ref<HTMLElement | null>(null)
useBottomBarOffset(barRef, { reserveSpace: true })

// One "shown" per order and page view, to compare with the taps.
let trackedOrderId: string | null = null
watch(
  shown,
  (isShown) => {
    if (!isShown || !order.value || trackedOrderId === order.value.id) return
    trackedOrderId = order.value.id
    trackEvent('reorder_bar_shown')
  },
  { immediate: true },
)

const onReorder = () => {
  if (!order.value) return
  const { added, skipped } = reorder(order.value)
  trackEvent('reorder_bar_clicked', { added, skipped })
}

const onDismiss = () => {
  dismiss()
  trackEvent('reorder_bar_dismissed')
}
</script>

<style scoped>
.reorder-bar-enter-active,
.reorder-bar-leave-active {
  transition:
    transform 0.3s ease-out,
    opacity 0.3s ease-out;
}
.reorder-bar-enter-from,
.reorder-bar-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .reorder-bar-enter-active,
  .reorder-bar-leave-active {
    transition: opacity 0.15s linear;
  }
  .reorder-bar-enter-from,
  .reorder-bar-leave-to {
    transform: none;
  }
}
</style>
