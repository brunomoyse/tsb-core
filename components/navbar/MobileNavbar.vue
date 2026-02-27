<template>
    <nav class="mobile-only bg-white text-gray-700 fixed z-50 h-20 w-full">
        <div class="px-4 flex justify-between items-center h-full mx-auto">
            <!-- Mobile Logo -->
            <div class="flex items-center">
                <Logo alt="Tokyo Sushi Bar logo" class="h-12 w-12 list-none" icon="/images/tsb-black-font-100.png" to="/"/>
            </div>

            <!-- Right part -->
            <div class="flex items-center">
                <!-- Cart icon -->
                <div>
                    <CartButton v-if="typeof currentRoute.name === 'string' && currentRoute.name?.startsWith('menu')"
                                class="lg:hidden"/>
                </div>

                <!-- Hamburger Menu -->
                <div class="flex flex-col items-center ml-6">
                    <button
                        type="button"
                        :aria-label="$t('nav.toggleMenu')"
                        :aria-expanded="isMenuOpen"
                        aria-controls="mobile-menu"
                        class="hamburger cursor-pointer p-2 rounded-lg border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
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
                                <li><Logo alt="Tokyo Sushi Bar logo" class="mb-6" icon="/images/tsb-black-font-100.png" to="/"
                                      @click="closeMenu"/></li>
                                <MobileNavItem :label="$t('nav.menu')" icon="/icons/menu-icon.svg"
                                               to="/menu"
                                               @click="closeMenu"/>
                                <MobileNavItem :label="$t('nav.contact')" icon="/icons/contact-icon.svg"
                                               to="/contact"
                                               @click="closeMenu"/>
                                <MobileNavItem v-if="!authStore.accessValid" :label="$t('nav.login')" icon="/icons/login-icon.svg"
                                               to="/login"
                                               @click="closeMenu"/>
                                <MobileNavItem v-if="authStore.accessValid" :label="$t('nav.myAccount')"
                                               icon="/icons/account-circle-icon.svg"
                                               to="/me"
                                               @click="closeMenu"/>

                                <LanguagePicker :label="$t('nav.language')" alt="Translate Icon"
                                                class="justify-center" icon="/icons/translate-icon.svg"
                                                tooltipText="Change Language"/>

                                <!-- Divider -->
                                <li class="w-full border-t border-gray-200 my-2"></li>

                                <!-- Phone (tap-to-call) -->
                                <li>
                                    <a href="tel:042229888"
                                       class="flex items-center justify-center space-x-2 p-3 rounded-xl hover:bg-tsb-one transition-colors"
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
import LanguagePicker from './LanguagePicker.vue'
import Logo from './Logo.vue'
import MobileNavItem from './MobileNavItem.vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute } from 'vue-router'

const currentRoute = useRoute();
const authStore = useAuthStore()

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
.hamburger span {
    display: block;
    width: 24px;
    height: 2px;
    background-color: currentColor;
    margin: 5px 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
}

/* Transform the hamburger into an X when active */
.hamburger-active span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
}

.hamburger-active span:nth-child(2) {
    opacity: 0;
}

.hamburger-active span:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
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
