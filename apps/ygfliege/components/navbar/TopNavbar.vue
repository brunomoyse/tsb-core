<template>
    <nav
        :aria-label="$t('nav.primary')"
        class="hidden sm:block sticky top-0 z-40 bg-ygf-bg/95 backdrop-blur border-b border-ygf-orange-100"
    >
        <div class="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center gap-8">
            <!-- Logo, left-aligned per GUIDELINES.md §4.5 -->
            <NuxtLinkLocale
                to="/"
                :aria-label="$t('nav.home')"
                class="shrink-0 inline-flex items-center rounded-ygf-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2"
            >
                <img src="/images/logos/logo-color.svg" :alt="logoAlt" width="44" height="44" class="h-11 w-11" />
            </NuxtLinkLocale>

            <!-- Primary destinations. Text labels, not icons: an icon-only rail
                 hides where things are, and the guide asks for 5–6 clear items. -->
            <ul class="flex items-center gap-1">
                <li v-for="item in navItems" :key="item.to">
                    <NuxtLinkLocale
                        :to="item.to"
                        :aria-current="isActive(item.to) ? 'page' : undefined"
                        class="relative inline-flex items-center h-16 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-inset"
                        :class="isActive(item.to) ? 'text-ygf-orange-800' : 'text-ygf-black/70 hover:text-ygf-black'"
                    >
                        {{ item.label }}
                        <!-- Current location marked by an underline as well as
                             colour, so it isn't signalled by colour alone. -->
                        <span
                            aria-hidden="true"
                            class="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-ygf-orange-600 transition-transform duration-200 ease-out origin-center"
                            :class="isActive(item.to) ? 'scale-x-100' : 'scale-x-0'"
                        />
                    </NuxtLinkLocale>
                </li>
            </ul>

            <div class="flex-1" />

            <div class="flex items-center gap-2">
                <!-- Delivery zone: ordering-wide state, so it lives here rather
                     than on the menu page's search row. -->
                <DeliveryZoneChip class="hidden md:inline-flex" />

                <!-- Cart: tablet only; lg+ shows the persistent SideCart instead. -->
                <ClientOnly>
                    <button
                        v-if="isMounted && cartStore.totalItems > 0 && isMenuPage"
                        type="button"
                        class="lg:hidden chip"
                        :aria-label="$t('nav.cart')"
                        @click="cartStore.toggleCartVisibility()"
                    >
                        <img src="/icons/shopping-bag-icon.svg" alt="" aria-hidden="true" class="w-4 h-4" />
                        <span class="tabular-nums">{{ cartStore.totalItems }}</span>
                    </button>
                </ClientOnly>

                <!-- LanguagePicker's root element is an <li>, so it needs a
                     list parent to stay valid HTML. -->
                <ul class="flex items-center">
                    <LanguagePicker :tooltipText="$t('nav.language')" alt="" icon="/icons/translate-icon.svg" />
                </ul>

                <ClientOnly>
                    <NuxtLinkLocale v-if="!authStore.user" to="auth-login" class="btn btn-secondary !py-2 !px-5 text-sm">
                        {{ $t('nav.login') }}
                    </NuxtLinkLocale>
                    <NuxtLinkLocale
                        v-else
                        to="me"
                        :aria-label="$t('nav.myAccount')"
                        class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-ygf-orange-100 hover:bg-ygf-orange-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2"
                    >
                        <img src="/icons/account-circle-icon.svg" alt="" aria-hidden="true" class="w-5 h-5" />
                    </NuxtLinkLocale>
                </ClientOnly>
            </div>
        </div>
    </nav>
</template>

<script lang="ts" setup>
import DeliveryZoneChip from '~/components/delivery/DeliveryZoneChip.vue'
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
const logoAlt = `${useAppConfig().brand.name} logo`

// Cart store rehydrates from localStorage post-mount; defer the totalItems read.
const isMounted = useMounted()
const isMenuPage = computed(() => route.path.endsWith('/menu'))

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
