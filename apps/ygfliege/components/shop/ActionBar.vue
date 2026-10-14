<template>
  <!-- The thumb-zone bar of a phone (audit 1a + webshop P2): Itinéraire, Appeler and Menu on every page, and once the
       cart has items its third button becomes the cart (count and total), so there is one bar, never two. -->
  <Transition name="action-bar">
    <nav
      v-if="visible"
      ref="barRef"
      :inert="cartStore.isCartVisible"
      :aria-label="$t('mkt.actionBar.label')"
      data-testid="action-bar"
      class="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-white border-t border-ygf-border shadow-[0_-8px_30px_rgba(242,123,32,0.12)]"
      :class="{ 'animate-cart-pulse': isPulsing }"
    >
      <div
        class="grid gap-2 px-3.5 pt-3 pb-3"
        :class="
          hasCart
            ? 'grid-cols-[auto_auto_minmax(0,1fr)]'
            : primary
              ? 'grid-cols-[1fr_1fr_1.25fr]'
              : 'grid-cols-2'
        "
      >
        <a
          :href="brand.mapsUrl"
          target="_blank"
          rel="noopener"
          class="action-btn action-btn-secondary"
          :aria-label="hasCart ? $t('mkt.actionBar.directions') : undefined"
          data-testid="action-bar-directions"
        >
          <MktIcon name="map-pin" :size="18" />
          <span v-if="!hasCart">{{ $t('mkt.actionBar.directions') }}</span>
        </a>
        <a
          :href="telHref(brand.phone)"
          class="action-btn action-btn-secondary"
          :aria-label="hasCart ? $t('mkt.actionBar.call') : undefined"
          data-testid="action-bar-call"
        >
          <MktIcon name="phone" :size="18" />
          <span v-if="!hasCart">{{ $t('mkt.actionBar.call') }}</span>
        </a>
        <button
          v-if="hasCart"
          type="button"
          data-testid="floating-cart-bar"
          data-cart-trigger
          class="action-btn action-btn-primary justify-between"
          @click="cartStore.toggleCartVisibility"
        >
          <span class="flex min-w-0 items-center gap-2">
            <span
              class="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-bold text-ygf-black tabular-nums"
              >{{ cartStore.totalItems }}</span
            >
            <span class="truncate">{{ $t('cart.viewCart') }}</span>
          </span>
          <span class="tabular-nums whitespace-nowrap">{{ formatCents(payableCents) }}</span>
        </button>
        <NuxtLinkLocale
          v-else-if="primary"
          :to="primary.to"
          class="action-btn action-btn-primary"
          data-testid="action-bar-primary"
        >
          {{ primary.label }}
        </NuxtLinkLocale>
      </div>
      <div class="safe-area-spacer-bottom" />
    </nav>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEventBus, useMounted } from '@vueuse/core'
import MktIcon from '~/components/mkt/MktIcon.vue'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatCents } from '#engine/lib/price'
import { telHref } from '#engine/utils/phone'
import { useBottomBarOffset } from '#engine/composables/useBottomBarOffset'
import { useCartStore } from '#engine/stores/cart'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useMenuOpen, useShopEnabled } from '#engine/composables/useShopEnabled'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const { brand } = useAppConfig()
const route = useRoute()
const cartStore = useCartStore()
const { payableCents } = useCartTotals()
const shopEnabled = useShopEnabled()
const menuOpen = useMenuOpen()
const isMounted = useMounted()

const hasCart = computed(() => shopEnabled && isMounted.value && cartStore.totalItems > 0)

/** The pages that have their own bottom bar or no use for this one (checkout, cart, account, sign-in, order). */
const HIDDEN =
  /\/(?:checkout|cart|order-completed|me|auth|login|logout|register|forgot-password|reset-password)(?:\/|$)/u
const isMenuPage = computed(() => route.path.endsWith('/menu'))
const isHomePage = computed(() => /^\/(?:[a-z]{2}\/?)?$/u.test(route.path))

/** Menu everywhere but on the menu itself; with the shop on, "Commander" opens the composer. */
const primary = computed(() => {
  if (isMenuPage.value) return null
  if (shopEnabled) return { to: '/menu?compose', label: t('mkt.actionBar.order') }
  return menuOpen
    ? { to: '/menu', label: t('mkt.actionBar.menu') }
    : { to: '/concept', label: t('mkt.nav.concept') }
})

// On the home page the hero's own buttons come first: the bar slides up once the hero has scrolled away.
const pastHero = ref(false)
const onScroll = () => {
  pastHero.value = window.scrollY > window.innerHeight * 0.6
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const visible = computed(() => {
  if (!isMounted.value || HIDDEN.test(route.path)) return false
  if (hasCart.value) return true
  if (isHomePage.value) return pastHero.value
  return true
})

// Publishes the bar's height so the toasts and the scroll-to-top button float above it, and reserves room at the end
// of the page so the footer's last links can scroll out from under it.
const barRef = ref<HTMLElement | null>(null)
useBottomBarOffset(barRef, { reserveSpace: true })
// Its own height too, as --action-bar-h: the reorder card of a phone sits on top of the bar instead of under it.
let resize: ResizeObserver | undefined
watch(barRef, (el) => {
  resize?.disconnect()
  const root = document.documentElement
  if (!el) {
    root.style.removeProperty('--action-bar-h')
    return
  }
  resize = new ResizeObserver(() =>
    root.style.setProperty('--action-bar-h', `${el.offsetHeight}px`),
  )
  resize.observe(el)
})
onBeforeUnmount(() => {
  resize?.disconnect()
  document.documentElement.style.removeProperty('--action-bar-h')
})

const isPulsing = ref(false)
let pulseTimeout: ReturnType<typeof setTimeout> | undefined
// Client only: the bus is a module singleton and SSR never disposes scopes.
if (import.meta.client)
  useEventBus(cartItemAddedKey).on(() => {
    isPulsing.value = false
    requestAnimationFrame(() => {
      isPulsing.value = true
      clearTimeout(pulseTimeout)
      pulseTimeout = setTimeout(() => (isPulsing.value = false), 300)
    })
  })
onBeforeUnmount(() => clearTimeout(pulseTimeout))
</script>

<style scoped>
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border: 2px solid transparent;
  border-radius: var(--radius-btn);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 300ms ease-out,
    border-color 300ms ease-out;
}

.action-btn:focus-visible {
  outline: 2px solid var(--ygf-focus);
  outline-offset: 2px;
}

.action-btn-secondary {
  border-color: var(--ygf-orange);
  color: var(--ygf-orange-text);
  background: var(--ygf-white);
}

/* Ink on the brand orange (6.7:1), never white (2.6:1). */
.action-btn-primary {
  background: var(--ygf-orange);
  border-color: var(--ygf-orange);
  color: var(--ygf-black);
}

.action-bar-enter-active,
.action-bar-leave-active {
  transition:
    transform 400ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 300ms ease-out;
}

.action-bar-enter-from,
.action-bar-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .action-bar-enter-active,
  .action-bar-leave-active {
    transition: none;
  }
}
</style>
