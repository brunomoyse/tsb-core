<template>
    <nav
        aria-label="Sidebar Navigation"
        class="hidden sm:flex flex-col justify-between items-center bg-tsb-two rounded-2xl w-[110px] h-[calc(100vh-4rem)] fixed left-8 top-8 z-40"
    >
        <!-- Top Navigation Items -->
        <ul class="flex flex-col items-center space-y-6 mt-6">
            <li><Logo :tooltipText="$t('nav.home')" alt="Tokyo Sushi Bar logo" icon="/images/tsb-black-font-100.png" to="/"/></li>
            <NavItem :tooltipText="$t('nav.menu')" alt="Menu Icon" icon="/icons/menu-icon.svg" to="menu"/>
            <NavItem :tooltipText="$t('nav.contact')" alt="Contact Icon" icon="/icons/contact-icon.svg" to="contact"/>
            <!-- Cart button for tablet (hidden on lg+ where SideCart is visible) -->
            <NavItemButton
                v-if="cartStore.totalItems > 0 && isMenuPage"
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
            <!-- Decorative wave accent -->
            <li aria-hidden="true" class="pb-1">
                <svg class="w-8 h-4 text-red-300/30" viewBox="0 0 40 16" fill="none">
                    <path d="M0 12 C10 12 10 4 20 4 C30 4 30 12 40 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
            </li>
            <NavItem v-if="!authStore.user" :tooltipText="$t('nav.login')" alt="Login Icon" icon="/icons/login-icon.svg"
                     to="auth-login"/>
            <NavItem v-if="authStore.user" :tooltipText="$t('nav.myAccount')" alt="My account Icon" icon="/icons/account-circle-icon.svg"
                     to="me"/>
            <NavItem v-if="authStore.user" :tooltipText="$t('nav.logout')" alt="Logout Icon" icon="/icons/logout-icon.svg"
                     to="logout"/>
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
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useRoute } from 'vue-router'

const authStore = useAuthStore();
const cartStore = useCartStore();
const route = useRoute()
const isMenuPage = computed(() => route.path.endsWith('/menu'))
</script>
