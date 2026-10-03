<template>
    <nav ref="navRef" @keydown.esc.capture="onEscape" class="sm:hidden bg-white text-neutral-700 fixed z-50 h-20 w-full">
        <div class="relative px-4 flex items-center h-full mx-auto">
            <!-- Mobile Logo -->
            <div class="flex items-center shrink-0">
                <Logo
                    :aria-label="$t('nav.home')"
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
                <!-- Cart icon: on the menu, and on any page once the cart has items with its count, on every page once the cart has items (it opens the cart drawer) -->
                <div>
                    <CartButton v-if="showCartButton" class="lg:hidden"/>
                </div>

                <!-- Hamburger Menu -->
                <div class="flex flex-col items-center ml-6">
                    <button
                        ref="hamburgerRef"
                        type="button"
                        :aria-label="$t('nav.toggleMenu')"
                        :aria-expanded="isMenuOpen"
                        aria-controls="mobile-menu"
                        class="hamburger inline-flex h-11 w-11 items-center justify-center cursor-pointer rounded-xl border border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        :class="{ 'hamburger-active': isMenuOpen }"
                        @click="toggleMenu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <!-- Mobile Sidebar Menu (same entries as the desktop sidebar) -->
                    <div id="mobile-menu"
                         ref="menuRef"
                         :inert="!isMenuOpen"
                         :class="isMenuOpen ? 'menu-open' : 'menu-closed'"
                         class="fixed top-20 left-0 w-full h-[calc(100dvh-5rem)] p-4 overflow-y-auto bg-tsb-two">

                        <ul class="flex flex-col items-center space-y-4 w-full mt-4">
                            <MobileNavItem
                                v-for="item in visibleNavItems('main', false)"
                                :key="item.key"
                                :label="$t(item.labelKey)"
                                :icon="item.icon"
                                :to="item.to"
                                @click="closeMenu"
                            />
                            <ClientOnly>
                                <MobileNavItem
                                    v-for="item in visibleNavItems('account', Boolean(authStore.user))"
                                    :key="item.key"
                                    :label="$t(item.labelKey)"
                                    :icon="item.icon"
                                    :to="item.to"
                                    @click="closeMenu"
                                />
                            </ClientOnly>

                            <li><LanguagePicker placement="top-center" /></li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    </nav>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, ref, watch } from '#imports'
import CartButton from '#engine/components/cart/CartButton.vue'
const DeliveryZoneChip = defineAsyncComponent(() => import('#engine/components/delivery/DeliveryZoneChip.vue'))
import LanguagePicker from './LanguagePicker.vue'
import MobileNavItem from './MobileNavItem.vue'
import { computed } from 'vue'
import { useAuthStore } from '#engine/stores/auth'
import { useBodyScrollLock } from '#engine/composables/useBodyScrollLock'
import { useCartStore } from '#engine/stores/cart'
import { useFocusTrap } from '#engine/composables/useFocusTrap'
import { useMediaQuery, useMounted } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { visibleNavItems } from './navItems'

const currentRoute = useRoute();
const authStore = useAuthStore()
const cartStore = useCartStore()
// Cart store rehydrates from localStorage post-mount; defer the totalItems read.
const isMounted = useMounted()

const routeName = computed(() => (typeof currentRoute.name === 'string' ? currentRoute.name : ''))
// Hidden on cart/checkout, which already show the cart.
const showCartButton = computed(() =>
    isMounted.value
    && !/^(?:cart|checkout)/u.test(routeName.value)
    && (routeName.value.startsWith('menu') || cartStore.totalItems > 0),
)

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
    if (target?.closest('[data-language-panel]') || (target !== hamburgerRef.value && target?.getAttribute('aria-expanded') === 'true')) return
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
    top: 50%;
    width: 24px;
    height: 2px;
    border-radius: 9999px;
    background-color: currentColor;
    /* The bars move with transform only (the old top transition animated layout). */
    transform: translate(-50%, calc(-50% - 8px));
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.hamburger span:nth-child(2) {
    transform: translate(-50%, -50%);
}

.hamburger span:nth-child(3) {
    transform: translate(-50%, calc(-50% + 8px));
}

/* Transform the hamburger into an X when active */
.hamburger-active span:nth-child(1) {
    transform: translate(-50%, -50%) rotate(45deg);
}

.hamburger-active span:nth-child(2) {
    opacity: 0;
    transform: translate(-50%, -50%) scaleX(0.6);
}

.hamburger-active span:nth-child(3) {
    transform: translate(-50%, -50%) rotate(-45deg);
}

/* Mobile Menu Styles */
#mobile-menu {
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
