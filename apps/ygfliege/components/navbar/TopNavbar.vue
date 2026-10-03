<template>
    <nav
        :aria-label="$t('nav.primary')"
        class="hidden sm:block sticky top-0 z-40 bg-ygf-bg/95 backdrop-blur border-b border-ygf-orange-100"
    >
        <div class="max-w-7xl mx-auto px-3 md:px-4 lg:px-8 h-16 flex items-center gap-1 md:gap-2 lg:gap-8">
            <!-- Logo with its name, left-aligned per GUIDELINES.md §4.5 (the circle is never shown without it, §2.2) -->
            <BrandLockup />

            <!-- Primary destinations. Text labels, not icons: an icon-only rail
                 hides where things are, and the guide asks for 5–6 clear items. -->
            <ul class="flex min-w-0 items-center lg:gap-1">
                <li v-for="item in navItems" :key="item.to">
                    <NuxtLinkLocale
                        :to="item.to"
                        :aria-current="isActive(item.to) ? 'page' : undefined"
                        class="relative inline-flex items-center h-16 px-1.5 md:px-2 lg:px-3 text-sm whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-inset"
                        :class="isActive(item.to) ? 'text-ygf-orange-800' : 'text-ygf-black/70 hover:text-ygf-black'"
                    >
                        {{ item.label }}
                        <!-- Current location marked by an underline as well as
                             colour, so it isn't signalled by colour alone. -->
                        <span
                            aria-hidden="true"
                            class="absolute inset-x-1.5 md:inset-x-2 lg:inset-x-3 bottom-0 h-0.5 rounded-full bg-ygf-orange-600 transition-transform duration-normal ease-brand-out origin-center"
                            :class="isActive(item.to) ? 'scale-x-100' : 'scale-x-0'"
                        />
                    </NuxtLinkLocale>
                </li>
            </ul>

            <div class="flex-1 min-w-0" />

            <div class="flex shrink-0 items-center gap-1 lg:gap-2">
                <!-- Delivery zone: ordering-wide state, so it lives here from xl up; below, the row has no room for it and
                     the menu page carries the chip beside its search. -->
                <DeliveryZoneChip class="hidden xl:inline-flex" />

                <!-- Cart, on every page once the cart has items. Tablet: opens the cart drawer. -->
                <ClientOnly>
                    <button
                        v-if="isMounted && cartStore.totalItems > 0"
                        type="button"
                        class="lg:hidden chip"
                        data-testid="cart-button"
                        data-cart-trigger
                        :aria-label="cartLabel"
                        :aria-expanded="cartStore.isCartVisible"
                        :aria-controls="cartStore.isCartVisible ? 'cart-mobile' : undefined"
                        @click="cartStore.toggleCartVisibility()"
                    >
                        <img src="/icons/shopping-bag-icon.svg" alt="" aria-hidden="true" class="w-4 h-4" />
                        <span class="tabular-nums" aria-hidden="true">{{ cartStore.totalItems }}</span>
                    </button>
                    <!-- Desktop has no drawer: the menu page shows the SideCart, every other page links to /cart. -->
                    <NuxtLinkLocale
                        v-if="isMounted && cartStore.totalItems > 0 && !isMenuPage"
                        to="/cart"
                        class="hidden lg:inline-flex chip"
                        data-testid="cart-link"
                        :aria-label="cartLabel"
                    >
                        <img src="/icons/shopping-bag-icon.svg" alt="" aria-hidden="true" class="w-4 h-4" />
                        <span class="tabular-nums" aria-hidden="true">{{ cartStore.totalItems }}</span>
                    </NuxtLinkLocale>
                </ClientOnly>

                <!-- LanguagePicker's root element is an <li>, so it needs a
                     list parent to stay valid HTML. -->
                <ul class="flex items-center">
                    <LanguagePicker :label="$t('nav.language')" icon="/icons/translate-icon.svg" />
                </ul>

                <ClientOnly>
                    <template v-if="!authStore.user">
                        <!-- Below lg the row has no room for the labelled button: an icon with the same name. -->
                        <NuxtLinkLocale
                            to="auth-login"
                            :aria-label="$t('nav.login')"
                            class="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-ygf-orange-100 hover:bg-ygf-orange-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <img src="/icons/account-circle-icon.svg" alt="" aria-hidden="true" class="w-5 h-5" />
                        </NuxtLinkLocale>
                        <NuxtLinkLocale to="auth-login" class="hidden lg:inline-flex btn btn-secondary !py-2 !px-5 text-sm">
                            {{ $t('nav.login') }}
                        </NuxtLinkLocale>
                    </template>
                    <NuxtLinkLocale
                        v-else
                        to="me"
                        :aria-label="$t('nav.myAccount')"
                        class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-ygf-orange-100 hover:bg-ygf-orange-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <img src="/icons/account-circle-icon.svg" alt="" aria-hidden="true" class="w-5 h-5" />
                    </NuxtLinkLocale>
                </ClientOnly>
            </div>
        </div>
    </nav>
</template>

<script lang="ts" setup>
import BrandLockup from '~/components/navbar/BrandLockup.vue'
import DeliveryZoneChip from '#engine/components/delivery/DeliveryZoneChip.vue'
import LanguagePicker from '~/components/navbar/LanguagePicker.vue'
import { computed } from 'vue'
import { useAuthStore } from '#engine/stores/auth'
import { useCartStore } from '#engine/stores/cart'
import { useI18n } from 'vue-i18n'
import { useMounted } from '@vueuse/core'
import { useRoute } from 'vue-router'

/**
 * Desktop/tablet header. Replaces the inherited 142px vertical icon rail,
 * which was Tokyo Sushi's layout: GUIDELINES.md §4.5 calls for a sticky header
 * with the logo left-aligned and 5–6 plainly-labelled destinations.
 */

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const cartStore = useCartStore()

// Cart store rehydrates from localStorage post-mount; defer the totalItems read.
const isMounted = useMounted()
const isMenuPage = computed(() => route.path.endsWith('/menu'))
// "Cart, 3 items": the count is part of the accessible name.
const cartLabel = computed(() => t('cart.buttonLabel', { count: cartStore.totalItems }, cartStore.totalItems))

const navItems = computed(() => [
    { to: 'menu', label: t('nav.menu') },
    { to: 'concept', label: t('mkt.nav.concept') },
    { to: 'about', label: t('mkt.nav.about') },
    { to: 'contact', label: t('nav.contact') },
])

const isActive = (to: string) => {
    const normalizedTo = to.startsWith('/') ? to : `/${to}`
    // Strip the locale segment: "/fr/menu" → "/menu".
    const normalizedPath = route.path.replace(/^\/[^/]+/u, '')
    return normalizedPath === normalizedTo || normalizedPath.startsWith(`${normalizedTo}/`)
}
</script>
