<template>
    <nav
        aria-label="Sidebar Navigation"
        class="hidden sm:flex flex-col justify-between items-center bg-ygf-cream rounded-2xl w-[110px] h-[calc(100vh-4rem)] fixed left-8 top-8 z-40"
    >
        <!-- Top Navigation Items -->
        <ul class="flex flex-col items-center space-y-6 mt-6">
            <li><Logo :tooltipText="$t('nav.home')" :alt="logoAlt" icon="/images/logos/logo-color.svg" to="/"/></li>
            <NavItem :tooltipText="$t('nav.menu')" alt="Menu Icon" icon="/icons/menu-icon.svg" to="menu"/>
            <NavItem :tooltipText="$t('nav.contact')" alt="Contact Icon" icon="/icons/contact-icon.svg" to="contact"/>
            <!-- Cart button for tablet (hidden on lg+ where SideCart is visible) -->
            <NavItemButton
                v-if="isMounted && cartStore.totalItems > 0 && isMenuPage"
                class="lg:hidden"
                :tooltipText="$t('nav.cart')"
                alt="Cart Icon"
                icon="/icons/shopping-bag-icon.svg"
                :badge="cartStore.totalItems"
                @click="cartStore.toggleCartVisibility()"
            />
        </ul>

        <!-- Bottom Navigation Items -->
        <ul class="flex flex-col items-center space-y-6 mb-6">
            <!-- Decorative steam-wisp accent -->
            <li aria-hidden="true" class="pb-1">
                <svg class="w-8 h-4 text-ygf-orange-300/30" viewBox="0 0 40 16" fill="none">
                    <path d="M14 15 C12 11 16 9 14 5 C12 2 15 1 14 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                    <path d="M22 15 C20 11 24 9 22 5 C20 2 23 1 22 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6"/>
                </svg>
            </li>
            <ClientOnly>
                <NavItem v-if="!authStore.user" :tooltipText="$t('nav.login')" alt="Login Icon" icon="/icons/login-icon.svg"
                         to="auth-login"/>
                <NavItem v-if="authStore.user" :tooltipText="$t('nav.myAccount')" alt="My account Icon" icon="/icons/account-circle-icon.svg"
                         to="me"/>
                <NavItem v-if="authStore.user" :tooltipText="$t('nav.logout')" alt="Logout Icon" icon="/icons/logout-icon.svg"
                         to="auth-logout"/>
            </ClientOnly>
            <!-- Language picker -->
            <LanguagePicker :tooltipText="$t('nav.language')" alt="Choose language Icon"
                            icon="/icons/translate-icon.svg"/>
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
import { useCartStore } from '#engine/stores/cart'
import { useMounted } from '@vueuse/core'
import { useRoute } from 'vue-router'

const authStore = useAuthStore();
const cartStore = useCartStore();
const route = useRoute()
const logoAlt = `${useAppConfig().brand.name} logo`
const isMenuPage = computed(() => route.path.endsWith('/menu'))
// Cart store rehydrates from localStorage post-mount; defer the totalItems read.
const isMounted = useMounted()
</script>
