<template>
    <nav ref="navRef" @keydown.esc.capture="onEscape" class="mobile-only bg-white text-gray-700 fixed z-50 h-20 w-full">
        <div class="relative px-4 flex items-center h-full mx-auto">
            <!-- Logo with its name (never the circle alone, GUIDELINES.md §2.2) -->
            <BrandLockup />

            <!-- Right part -->
            <div class="flex items-center ml-auto shrink-0">
                <!-- Cart icon with its count, on every page once the cart has items (it opens the cart drawer) -->
                <div>
                    <CartButton v-if="isMounted && cartStore.totalItems > 0" class="lg:hidden"/>
                </div>

                <!-- Hamburger Menu -->
                <div class="flex flex-col items-center ml-6">
                    <button
                        ref="hamburgerRef"
                        type="button"
                        :aria-label="$t('nav.toggleMenu')"
                        :aria-expanded="isMenuOpen"
                        aria-controls="mobile-menu"
                        class="hamburger inline-flex h-11 w-11 items-center justify-center cursor-pointer rounded-lg border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        :class="{ 'hamburger-active': isMenuOpen }"
                        @click="toggleMenu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <!-- Mobile Sidebar Menu -->
                    <div id="mobile-menu"
                         ref="menuRef"
                         :inert="!isMenuOpen"
                         :class="isMenuOpen ? 'menu-open' : 'menu-closed'"
                         class="fixed top-20 left-0 w-full h-[calc(100vh-5rem)] p-4 overflow-y-auto">

                        <!-- Top Section -->
                        <div class="flex flex-col items-center space-y-6 mt-4">
                            <ul class="flex flex-col items-center space-y-6 w-full">
                                <li><Logo :aria-label="$t('nav.home')" :alt="logoAlt" class="mb-6" icon="/images/logos/logo-white.svg" to="/"
                                      @click="closeMenu"/></li>
                                <MobileNavItem :label="$t('nav.menu')"
                                               to="/menu"
                                               @click="closeMenu"/>
                                <!-- Concept and About were reachable only from
                                     the footer on mobile; the guide asks for the
                                     same 5–6 destinations as desktop. -->
                                <MobileNavItem :label="$t('mkt.nav.concept')"
                                               to="/concept"
                                               @click="closeMenu"/>
                                <MobileNavItem :label="$t('mkt.nav.about')"
                                               to="/about"
                                               @click="closeMenu"/>
                                <MobileNavItem :label="$t('nav.contact')"
                                               to="/contact"
                                               @click="closeMenu"/>
                                <ClientOnly>
                                    <MobileNavItem v-if="!authStore.user" :label="$t('nav.login')"
                                                   to="/auth/login"
                                                   @click="closeMenu"/>
                                    <MobileNavItem v-if="authStore.user" :label="$t('nav.myAccount')"
                                                   to="/me"
                                                   @click="closeMenu"/>
                                </ClientOnly>

                                <LanguagePicker :label="$t('nav.language')" alt="Translate Icon"
                                                class="justify-center" icon="/icons/translate-icon.svg"
                                                tooltipText="Change Language"/>

                                <!-- Divider -->
                                <li class="w-full border-t border-white/20 my-2"></li>

                                 <!-- Phone (tap-to-call) -->
                                 <li>
                                     <a :href="telHref(brand.phone)"
                                        :aria-label="$t('nav.callRestaurant')"
                                        class="flex min-h-12 items-center justify-center gap-3 rounded-ygf-btn px-6 py-3 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                                        @click="closeMenu">
                                         <span class="text-base font-medium">{{ nationalPhone(brand.phone) }}</span>
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
import { computed, ref, watch } from '#imports'
import BrandLockup from './BrandLockup.vue'
import CartButton from '#engine/components/cart/CartButton.vue'
import LanguagePicker from './LanguagePicker.vue'
import MobileNavItem from './MobileNavItem.vue'
import { useAuthStore } from '#engine/stores/auth'
import { nationalPhone, telHref } from '#engine/utils/phone'
import { useBodyScrollLock } from '#engine/composables/useBodyScrollLock'
import { useCartStore } from '#engine/stores/cart'
import { useFocusTrap } from '#engine/composables/useFocusTrap'
import { useMediaQuery, useMounted } from '@vueuse/core'

const authStore = useAuthStore()
const cartStore = useCartStore()
const { brand } = useAppConfig()
const logoAlt = `${brand.name} logo`
// Cart store rehydrates from localStorage post-mount; defer the totalItems read.
const isMounted = useMounted()

const isMenuOpen = ref(false)

const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
    isMenuOpen.value = false
}

// The open menu is a modal overlay: the page cannot scroll behind it, and Tab stays inside the header and the menu.
useBodyScrollLock(isMenuOpen)

const navRef = ref<HTMLElement | null>(null)
const hamburgerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

useFocusTrap(computed(() => (isMenuOpen.value ? navRef.value : null)), {
    // First link of the menu; the menu stops being inert in the same render, so this runs once it is reachable.
    initialFocus: () => menuRef.value?.querySelector<HTMLElement>('a[href]'),
    // Back to the hamburger, unless the cart sheet took over (it manages its own focus).
    returnFocus: () => (cartStore.isCartVisible ? false : hamburgerRef.value),
})

// Escape closes the menu, except while the language dropdown is open: it closes itself first (read in the capture phase, before it does).
const onEscape = (event: KeyboardEvent) => {
    if (!isMenuOpen.value) return
    const target = event.target as HTMLElement | null
    if (target?.closest('[role="listbox"]') || (target !== hamburgerRef.value && target?.getAttribute('aria-expanded') === 'true')) return
    closeMenu()
}

/*
 * `.mobile-only` hides this whole navbar from 641px up (rotating a phone to landscape): the hamburger is gone, so an open menu
 * must close or its scroll lock would stay on a page nobody can unlock.
 */
const isWide = useMediaQuery('(min-width: 641px)')
watch(isWide, (wide) => {
    if (wide) closeMenu()
})

// Opening the cart from the header hands the screen over to the cart sheet.
watch(() => cartStore.isCartVisible, (visible) => {
    if (visible) closeMenu()
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
    /* Full-screen orange overlay with white links, per GUIDELINES.md §4.5.
       The deeper --ygf-orange-on-white step is used rather than #F58220 so the
       white link text clears WCAG AA (4.50:1 vs 2.59:1). */
    background-color: var(--ygf-orange-on-white);
    color: var(--ygf-white);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    z-index: 40;
}

/* visibility flips only after the fade-out, so the animation stays and the closed menu is never focusable or read aloud. */
.menu-closed {
    opacity: 0;
    transform: translateY(-20px);
    pointer-events: none;
    visibility: hidden;
    transition: opacity 0.4s ease, transform 0.4s ease, visibility 0s linear 0.4s;
}

.menu-open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
    visibility: visible;
    transition: opacity 0.4s ease, transform 0.4s ease, visibility 0s;
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
