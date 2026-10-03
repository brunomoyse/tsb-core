<template>
  <button
    type="button"
    data-testid="cart-button"
    data-cart-trigger
    :aria-label="label"
    :aria-expanded="cartStore.isCartVisible"
    :aria-controls="cartStore.isCartVisible ? 'cart-mobile' : undefined"
    class="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    @click="handleToggleCart"
  >
    <!-- Cart Icon -->
    <div class="flex items-center justify-center w-11 h-11 rounded-full">
      <img alt="" aria-hidden="true" class="w-6 h-6" src="/icons/shopping-bag-icon.svg" />

      <!-- Tooltip positioned below -->
      <span
        aria-hidden="true"
        class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none"
      >
        {{ $t('nav.cart') }}
      </span>
    </div>
    <!-- Badge for cart count -->
    <div
      v-if="cartCount > 0"
      data-testid="cart-button-count"
      aria-hidden="true"
      :class="[
        'absolute inline-flex items-center justify-center min-w-6 h-6 px-1 text-xs font-bold text-white bg-primary-600 border-2 border-white rounded-full -top-1.5 -right-1.5',
        animating ? 'animate-bounce' : '',
      ]"
    >
      {{ cartCount }}
    </div>
  </button>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { centsToEuros } from '#engine/utils/money'
import { useCartStore } from '#engine/stores/cart'
import { useI18n } from 'vue-i18n'
import { useTracking } from '#engine/composables/useTracking'

const { trackEvent } = useTracking()

const handleToggleCart = () => {
  if (!cartStore.isCartVisible) {
    trackEvent('cart_viewed', {
      total_items: cartStore.totalItems,
      total_price: centsToEuros(cartStore.subtotalCents),
    })
  }
  cartStore.toggleCartVisibility()
}

// Initialize the cart store
const cartStore = useCartStore()

// Computed property for the total quantity of products
const cartCount = computed(() => cartStore.totalItems)

// "Cart, 3 items": the count is part of the accessible name (the badge itself is decorative).
const { t } = useI18n()
const label = computed(() =>
  cartCount.value > 0
    ? t('cart.buttonLabel', { count: cartCount.value }, cartCount.value)
    : t('nav.cart'),
)

// Badge bounce animation
const animating = ref(false)
watch(cartCount, (newVal) => {
  if (newVal > 0) {
    nextTick(() => {
      animating.value = true
      setTimeout(() => {
        animating.value = false
      }, 600)
    })
  }
})
</script>
