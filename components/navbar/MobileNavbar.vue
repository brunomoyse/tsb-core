<template>
    <nav class="mobile-only bg-white text-tsb-gray fixed z-50 h-20 w-full">
        <div class="px-4 flex justify-between items-center h-full mx-auto">
            <!-- Hamburger Menu -->
            <div class="flex flex-col items-center">
                <input type="checkbox" id="menu-toggle" class="hidden" ref="menuToggle" />
                <label for="menu-toggle" class="hamburger cursor-pointer focus:outline-none"
                    aria-label="Toggle navigation menu" tabindex="0">
                    <span></span>
                    <span></span>
                    <span></span>
                </label>

                <!-- Mobile Sidebar Menu -->
                <div id="mobile-menu"
                    class="fixed top-20 left-0 w-full h-[calc(100vh-5rem)] bg-tsb-two p-4 opacity-0 transform -translate-x-full transition-all duration-400 ease-out pointer-events-none overflow-y-auto">

                    <!-- Top Section -->
                    <div class="flex flex-col items-center space-y-6 mt-4">


                        <ul class="flex flex-col items-center space-y-6 w-full">
                            <Logo @click="closeMenu" to="/" icon="/icons/tsb-logo.svg" alt="Tokyo Sushi Bar logo" class="mb-6" />
                            <MobileNavItem @click="closeMenu" to="menu" icon="/icons/menu-icon.svg" :label="$t('nav.menu')" />
                            <MobileNavItem @click="closeMenu" to="reservation" icon="/icons/reservation-icon.svg"
                                :label="$t('nav.book')" />
                            <MobileNavItem @click="closeMenu" to="contact" icon="/icons/contact-icon.svg" :label="$t('nav.contact')" />
                        </ul>
                    </div>

                    <!-- Bottom Section -->
                    <ul class="flex flex-col items-center space-y-6 mt-auto pb-6 w-full">
                        <MobileNavItem @click="closeMenu" v-if="!isUserConnected" to="login" icon="/icons/login-icon.svg"
                            :label="$t('nav.login')" />
                        <MobileNavItem @click="closeMenu" v-if="isUserConnected" to="logout" icon="/icons/logout-icon.svg"
                            :label="$t('nav.logout')" @click.prevent="handleLogOut" />

                        <LanguagePicker icon="/icons/translate-icon.svg" alt="Translate Icon"
                            tooltipText="Change Language" :label="$t('nav.language')" class="justify-center" />
                    </ul>
                </div>
            </div>

            <!-- Mobile Logo -->
            <Logo to="/" icon="/icons/tsb-logo.svg" alt="Tokyo Sushi Bar logo" class="h-12 w-12 list-none" />
        </div>
    </nav>
</template>

<script setup lang="ts">
import { ref, useRoute, watch, useLocalePath } from '#imports';
import { useAuthStore } from '@/stores/auth'
import MobileNavItem from './MobileNavItem.vue';
import Logo from './Logo.vue';
import LanguagePicker from './LanguagePicker.vue';

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

const isUserConnected = authStore.user !== null

const handleLogOut = () => {
    authStore.logout()
}

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
#menu-toggle:checked+.hamburger span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
}

#menu-toggle:checked+.hamburger span:nth-child(2) {
    opacity: 0;
}

#menu-toggle:checked+.hamburger span:nth-child(3) {
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
    justify-content: center;
    opacity: 0;
    transform: translateY(-20px);
    pointer-events: none;
    transition: opacity 0.4s ease, transform 0.4s ease;
    z-index: 40;
    /* Ensure it's below the navbar (z-50) */
}

/* When menu is checked, show the mobile menu */
#menu-toggle:checked~#mobile-menu {
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
#menu-toggle:checked~#mobile-menu {
    animation: fadeIn 0.4s forwards;
}

#menu-toggle:not(:checked)~#mobile-menu {
    animation: fadeOut 0.4s forwards;
}
</style>