<template>
    <nav class="sm:hidden bg-white text-neutral-700 fixed z-50 h-20 w-full">
        <div class="relative px-4 flex items-center h-full mx-auto">
            <!-- Mobile Logo -->
            <div class="flex items-center shrink-0">
                <Logo
                    :aria-label="$t('nav.home')"
                    :alt="logoAlt"
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
                <!-- Cart icon: on the menu, and on any page once the cart has items -->
                <div>
                    <CartButton v-if="showCartButton" class="lg:hidden"/>
                </div>

                <!-- Hamburger Menu -->
                <div class="flex flex-col items-center ml-6">
                    <button
                        type="button"
                        :aria-label="$t('nav.toggleMenu')"
                        :aria-expanded="isMenuOpen"
                        aria-controls="mobile-menu"
                        class="hamburger inline-flex h-11 w-11 items-center justify-center cursor-pointer rounded-xl border border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        :class="{ 'hamburger-active': isMenuOpen }"
                        @click="toggleMenu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <!-- Mobile Sidebar Menu (same entries as the desktop sidebar) -->
                    <div id="mobile-menu"
                         :class="isMenuOpen ? 'menu-open' : 'menu-closed'"
                         class="fixed top-20 left-0 w-full h-[calc(100vh-5rem)] p-4 overflow-y-auto bg-tsb-two">

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

                            <!-- Divider -->
                            <li class="w-full border-t border-neutral-300/60 my-2"></li>

                            <!-- Phone (tap-to-call) -->
                            <li>
                                <a :href="phoneHref"
                                   :aria-label="$t('nav.callRestaurant')"
                                   class="flex min-h-11 items-center justify-center space-x-2 rounded-xl px-4 py-3 transition-colors hover:bg-tsb-one focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                   @click="closeMenu">
                                    <NavIcon src="/icons/contact-icon.svg" class="w-5 h-5" />
                                    <span class="text-sm font-medium">{{ phoneLabel }}</span>
                                </a>
                            </li>

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
import Logo from './Logo.vue'
import MobileNavItem from './MobileNavItem.vue'
import NavIcon from './NavIcon.vue'
import { computed } from 'vue'
import { useAuthStore } from '#engine/stores/auth'
import { useBrandPhone } from '#engine/composables/useBrandPhone'
import { useCartStore } from '#engine/stores/cart'
import { useMounted } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { visibleNavItems } from './navItems'

const currentRoute = useRoute();
const authStore = useAuthStore()
const cartStore = useCartStore()
const logoAlt = `${useAppConfig().brand.name} logo`
// Cart store rehydrates from localStorage post-mount; defer the totalItems read.
const isMounted = useMounted()
const { phoneHref, phoneLabel } = useBrandPhone()

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
