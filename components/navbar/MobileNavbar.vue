<template>
    <nav class="mobile-only bg-white text-gray-700 fixed z-50 h-20 w-full">
        <div class="relative px-4 flex items-center h-full mx-auto">
            <!-- Mobile Logo -->
            <div class="flex items-center shrink-0">
                <Logo
                    :aria-label="$t('nav.home')"
                    alt="Tokyo Sushi Bar logo"
                    class="list-none"
                    icon="/images/tsb-black-font-100.png"
                    to="/"
                    :size="56"
                />
            </div>

            <div
                v-if="typeof currentRoute.name === 'string' && currentRoute.name?.startsWith('menu')"
                class="absolute left-1/2 -translate-x-1/2 min-w-0 max-w-[148px]"
            >
                <ClientOnly>
                    <DeliveryZoneChip compact class="min-w-0 w-full" />
                </ClientOnly>
            </div>

            <!-- Right part -->
            <div class="flex items-center ml-auto shrink-0">
                <!-- Cart icon -->
                <div>
                    <CartButton v-if="typeof currentRoute.name === 'string' && currentRoute.name?.startsWith('menu') && cartStore.totalItems === 0"
                                class="lg:hidden"/>
                </div>

                <!-- Hamburger Menu -->
                <div class="flex flex-col items-center ml-6">
                    <button
                        type="button"
                        :aria-label="$t('nav.toggleMenu')"
                        :aria-expanded="isMenuOpen"
                        aria-controls="mobile-menu"
                        class="hamburger inline-flex h-11 w-11 items-center justify-center cursor-pointer rounded-lg border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        :class="{ 'hamburger-active': isMenuOpen }"
                        @click="toggleMenu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <!-- Mobile Sidebar Menu -->
                    <div id="mobile-menu"
                         :class="isMenuOpen ? 'menu-open' : 'menu-closed'"
                         class="fixed top-20 left-0 w-full h-[calc(100vh-5rem)] p-4 overflow-y-auto">

                        <!-- Top Section -->
                        <div class="flex flex-col items-center space-y-6 mt-4">
                            <ul class="flex flex-col items-center space-y-6 w-full">
                                <li><Logo :aria-label="$t('nav.home')" alt="Tokyo Sushi Bar logo" class="mb-6" icon="/images/tsb-black-font-100.png" to="/"
                                      @click="closeMenu"/></li>
                                <MobileNavItem :label="$t('nav.menu')" icon="/icons/menu-icon.svg"
                                               to="/menu"
                                               @click="closeMenu"/>
                                <MobileNavItem :label="$t('nav.contact')" icon="/icons/contact-icon.svg"
                                               to="/contact"
                                               @click="closeMenu"/>
                                <ClientOnly>
                                    <MobileNavItem v-if="!authStore.user" :label="$t('nav.login')" icon="/icons/login-icon.svg"
                                                   to="/auth/login"
                                                   @click="closeMenu"/>
                                    <MobileNavItem v-if="authStore.user" :label="$t('nav.myAccount')"
                                                   icon="/icons/account-circle-icon.svg"
                                                   to="/me"
                                                   @click="closeMenu"/>
                                </ClientOnly>

                                <LanguagePicker :label="$t('nav.language')" alt="Translate Icon"
                                                class="justify-center" icon="/icons/translate-icon.svg"
                                                tooltipText="Change Language"/>

                                <!-- Divider -->
                                <li class="w-full border-t border-gray-200 my-2"></li>

                                 <!-- Phone (tap-to-call) -->
                                 <li>
                                     <a href="tel:042229888"
                                        aria-label="Appeler le restaurant"
                                        class="flex min-h-11 items-center justify-center space-x-2 rounded-xl px-4 py-3 transition-colors hover:bg-tsb-one focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2"
                                        @click="closeMenu">
                                         <img alt="Phone" src="/icons/contact-icon.svg" class="w-5 h-5" />
                                         <span class="text-sm font-medium">04 222 98 88</span>
                                     </a>
                                 </li>
                            </ul>
                        </div>

                        <!-- Bottom Section -->
                        <ul class="flex flex-col items-center space-y-6 mt-auto pb-6 w-full"></ul>
                    </div>
                </div>
            </div>

        </div>
    </nav>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import CartButton from '~/components/cart/CartButton.vue'
import DeliveryZoneChip from '~/components/delivery/DeliveryZoneChip.vue'
import LanguagePicker from './LanguagePicker.vue'
import Logo from './Logo.vue'
import MobileNavItem from './MobileNavItem.vue'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useRoute } from 'vue-router'

const currentRoute = useRoute();
const authStore = useAuthStore()
const cartStore = useCartStore()

const isMenuOpen = ref(false)

const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
    isMenuOpen.value = false
}

// Toggle body overflow based on menu state
watch(isMenuOpen, (open) => {
    if (open) {
        document.body.classList.add('overflow-hidden')
    } else {
        document.body.classList.remove('overflow-hidden')
    }
})
</script>

<style>
:root {
    --transition-duration: 0.4s;
    --transition-easing: ease;
}

/* Hamburger lines */
.hamburger {
    position: relative;
    color: #374151;
}

.hamburger span {
    position: absolute;
    left: 50%;
    width: 24px;
    height: 2px;
    border-radius: 9999px;
    background-color: currentColor;
    transform: translateX(-50%);
    transition: transform 0.3s ease, opacity 0.3s ease, top 0.3s ease;
}

.hamburger span:nth-child(1) {
    top: calc(50% - 8px);
}

.hamburger span:nth-child(2) {
    top: 50%;
    transform: translate(-50%, -50%);
}

.hamburger span:nth-child(3) {
    top: calc(50% + 8px);
}

/* Transform the hamburger into an X when active */
.hamburger-active span:nth-child(1) {
    top: 50%;
    transform: translate(-50%, -50%) rotate(45deg);
}

.hamburger-active span:nth-child(2) {
    opacity: 0;
    transform: translate(-50%, -50%) scaleX(0.6);
}

.hamburger-active span:nth-child(3) {
    top: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
}

/* Mobile Menu Styles */
#mobile-menu {
    background-color: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    z-index: 40;
}

.menu-closed {
    opacity: 0;
    transform: translateY(-20px);
    pointer-events: none;
    transition: opacity 0.4s ease, transform 0.4s ease;
}

.menu-open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
    transition: opacity 0.4s ease, transform 0.4s ease;
}

.menu-closed li {
    opacity: 0;
    transform: translateX(-10px);
    transition: opacity 0.2s ease-out, transform 0.2s ease-out;
    transition-delay: 0s;
}

.menu-open li {
    opacity: 1;
    transform: translateX(0);
    transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}
.menu-open li:nth-child(1) { transition-delay: 0.05s; }
.menu-open li:nth-child(2) { transition-delay: 0.1s; }
.menu-open li:nth-child(3) { transition-delay: 0.15s; }
.menu-open li:nth-child(4) { transition-delay: 0.2s; }
.menu-open li:nth-child(5) { transition-delay: 0.25s; }
.menu-open li:nth-child(6) { transition-delay: 0.3s; }
.menu-open li:nth-child(7) { transition-delay: 0.35s; }
.menu-open li:nth-child(8) { transition-delay: 0.4s; }
</style>
