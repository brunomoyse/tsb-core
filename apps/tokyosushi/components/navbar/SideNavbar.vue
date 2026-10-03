<template>
  <nav
    :aria-label="$t('nav.sidebar')"
    class="hidden sm:flex flex-col justify-between items-center bg-tsb-two rounded-2xl w-[110px] h-[calc(100vh-4rem)] fixed left-8 top-8 z-40"
  >
    <!-- Top Navigation Items -->
    <ul class="flex flex-col items-center space-y-6 mt-6">
      <li>
        <Logo
          :tooltipText="$t('nav.home')"
          :alt="logoAlt"
          icon="/images/tsb-black-font-100.png"
          to="/"
        />
      </li>
      <NavItem
        v-for="item in visibleNavItems('main', false)"
        :key="item.key"
        :tooltipText="$t(item.labelKey)"
        :icon="item.icon"
        :to="item.to"
      />
      <!-- Cart, on every page once the cart has items. Tablet: opens the cart drawer. -->
      <NavItemButton
        v-if="isMounted && cartStore.totalItems > 0 && !isCartFlowPage"
        class="lg:hidden"
        :tooltipText="cartLabel"
        icon="/icons/shopping-bag-icon.svg"
        :badge="cartStore.totalItems"
        :expanded="cartStore.isCartVisible"
        :controls="cartStore.isCartVisible ? 'cart-mobile' : undefined"
        @click="cartStore.toggleCartVisibility()"
      />
      <!-- Desktop has no drawer: the menu page shows the SideCart, every other page links to /cart. -->
      <NavItem
        v-if="isMounted && cartStore.totalItems > 0 && !isMenuPage"
        class="hidden lg:block"
        :tooltipText="cartLabel"
        alt="Cart Icon"
        icon="/icons/shopping-bag-icon.svg"
        :badge="cartStore.totalItems"
        to="cart"
      />
    </ul>

    <!-- Bottom Navigation Items -->
    <ul class="flex flex-col items-center space-y-6 mb-6">
      <!-- Decorative wave accent -->
      <li aria-hidden="true" class="pb-1">
        <svg class="w-8 h-4 text-primary-300/30" viewBox="0 0 40 16" fill="none">
          <path
            d="M0 12 C10 12 10 4 20 4 C30 4 30 12 40 12"
            stroke="currentColor"
            stroke-width="1.5"
            fill="none"
          />
        </svg>
      </li>
      <!-- Phone (tap-to-call), same entry as the mobile menu -->
      <NavItem
        :tooltipText="phoneLabel"
        :ariaLabel="$t('nav.callRestaurant')"
        icon="/icons/contact-icon.svg"
        :href="phoneHref"
        class="hidden [@media(min-height:800px)]:block"
      />
      <ClientOnly>
        <NavItem
          v-for="item in visibleNavItems('account', Boolean(authStore.user))"
          :key="item.key"
          :tooltipText="$t(item.labelKey)"
          :icon="item.icon"
          :to="item.to"
        />
      </ClientOnly>
      <!-- Language picker -->
      <li><LanguagePicker variant="rail" placement="right" /></li>
    </ul>
  </nav>
</template>

<script lang="ts" setup>
import LanguagePicker from '~/components/navbar/LanguagePicker.vue'
import Logo from './Logo.vue'
import NavItem from './NavItem.vue'
import NavItemButton from './NavItemButton.vue'
import { computed } from 'vue'
import { useAuthStore } from '#engine/stores/auth'
import { useBrandPhone } from '#engine/composables/useBrandPhone'
import { useCartStore } from '#engine/stores/cart'
import { useI18n } from 'vue-i18n'
import { useMounted } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { visibleNavItems } from './navItems'

const authStore = useAuthStore()
const cartStore = useCartStore()
const route = useRoute()
const logoAlt = `${useAppConfig().brand.name} logo`
const { phoneHref, phoneLabel } = useBrandPhone()
// The cart and checkout pages already show the cart; no shortcut there.
const isCartFlowPage = computed(() => /\/(?:cart|checkout)$/u.test(route.path))
// The menu page shows the SideCart on desktop, so the nav cart link is hidden there.
const isMenuPage = computed(() => /\/menu$/u.test(route.path))
// "Cart, 3 items": the count is part of the accessible name.
const { t } = useI18n()
const cartLabel = computed(() =>
  t('cart.buttonLabel', { count: cartStore.totalItems }, cartStore.totalItems),
)
// Cart store rehydrates from localStorage post-mount; defer the totalItems read.
const isMounted = useMounted()
</script>
