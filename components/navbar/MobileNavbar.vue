<template>
    <nav class="mobile-only bg-white text-gray-700 fixed z-50 h-20 w-full">
        <div class="px-4 flex justify-between items-center h-full mx-auto">
            <!-- Mobile Logo -->
            <div class="flex items-center">
                <Logo alt="Tokyo Sushi Bar logo" class="h-12 w-12 list-none" icon="/images/tsb-logo-b.png" to="/"/>
                <span class="font-semibold text-lg ml-2"></span>
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
                    <input id="menu-toggle" ref="menuToggle" class="hidden" type="checkbox"/>
                    <label :aria-label="$t('nav.toggleMenu')" class="hamburger cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                           for="menu-toggle" tabindex="0">
                        <span></span>
                        <span></span>
                        <span></span>
                    </label>

                    <!-- Mobile Sidebar Menu -->
                    <div id="mobile-menu"
                         class="fixed top-20 left-0 w-full h-[calc(100vh-5rem)] p-4 opacity-0 transform -translate-x-full transition-all duration-400 ease-out pointer-events-none overflow-y-auto">

                        <!-- Top Section -->
                        <div class="flex flex-col items-center space-y-6 mt-4">
                            <ul class="flex flex-col items-center space-y-6 w-full">
                                <li><Logo alt="Tokyo Sushi Bar logo" class="mb-6" icon="/images/tsb-logo-b.png" to="/"
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
import {ref, watch} from '#imports';
import {useAuthStore} from '@/stores/auth'
import CartButton from "~/components/cart/CartButton.vue";
import MobileNavItem from './MobileNavItem.vue';
import Logo from './Logo.vue';
import LanguagePicker from './LanguagePicker.vue';
import {useRoute} from 'vue-router'

const currentRoute = useRoute();
const authStore = useAuthStore()

// Reference to the menu toggle checkbox
const menuToggle = ref<HTMLInputElement | null>(null);

// Watch the checkbox state to toggle body overflow
watch(
    () => menuToggle.value?.checked,
    (checked) => {
        if (checked) {
            document.body.classList.add('overflow-hidden');
        } else {
            document.body.classList.remove('overflow-hidden');
        }
    }
);

const closeMenu = () => {
    if (menuToggle.value) {
        menuToggle.value.checked = false
    }
}

</script>

<style>
:root {
    --transition-duration: 0.4s;
    --transition-easing: ease;
}

/* Custom styles for the hamburger animation */
/* Hide the default checkbox */
#menu-toggle {
    display: none;
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

/* Transform the hamburger into an X when checked */
#menu-toggle:checked + .hamburger span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
}

#menu-toggle:checked + .hamburger span:nth-child(2) {
    opacity: 0;
}

#menu-toggle:checked + .hamburger span:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
}

/* Mobile Menu Styles */
#mobile-menu {
    position: fixed;
    top: 5rem;
    /* Adjust based on navbar height (h-20 = 5rem) */
    left: 0;
    right: 0;
    bottom: 0;
    background-color: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    opacity: 0;
    transform: translateY(-20px);
    pointer-events: none;
    transition: opacity 0.4s ease, transform 0.4s ease;
    z-index: 40;
    /* Ensure it's below the navbar (z-50) */
}

/* When menu is checked, show the mobile menu */
#menu-toggle:checked ~ #mobile-menu {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

/* Optional: Fade-in and fade-out effect */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fadeOut {
    from {
        opacity: 1;
        transform: translateY(0);
    }

    to {
        opacity: 0;
        transform: translateY(-20px);
    }
}

/* Apply animations */
#menu-toggle:checked ~ #mobile-menu {
    animation: fadeIn 0.4s forwards;
}

#menu-toggle:not(:checked) ~ #mobile-menu {
    animation: fadeOut 0.4s forwards;
}
</style>
