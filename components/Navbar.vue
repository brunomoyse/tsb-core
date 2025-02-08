<template>
    <nav class="bg-white text-tsb-gray fixed z-50 h-20 w-full">
        <div class="px-4 flex justify-between items-center h-full mx-auto">

            <!-- Hamburger Menu and Mobile Menu (visible on mobile) -->
            <div class="mobile-only flex flex-col items-center">
                <!-- Hidden checkbox -->
                <input type="checkbox" id="menu-toggle" class="hidden" ref="menuToggle" />

                <!-- Hamburger icon -->
                <label for="menu-toggle" class="hamburger cursor-pointer focus:outline-none"
                    aria-label="Toggle navigation menu" tabindex="0">
                    <span></span>
                    <span></span>
                    <span></span>
                </label>

                <!-- Mobile Menu -->
                <div id="mobile-menu"
                    class="fixed top-20 left-0 right-0 bottom-0 bg-white shadow-lg flex flex-col items-center justify-center opacity-0 transform translate-y-[-20px] transition-transform duration-400 ease-out pointer-events-none">
                    <ul role="menu" class="w-full text-center">
                        <li role="none">
                            <NuxtLink :to="$localePath('index')"
                                class="block px-4 py-2 text-gray-700 hover:bg-gray-200 transition-colors duration-200"
                                role="menuitem">
                                Home
                            </NuxtLink>
                        </li>
                        <li role="none">
                            <NuxtLinkLocale to="menu"
                                class="block px-4 py-2 text-gray-700 hover:bg-gray-200 transition-colors duration-200"
                                role="menuitem">
                                Menu
                            </NuxtLinkLocale>
                        </li>
                        <li role="none">
                            <NuxtLinkLocale to="contact"
                                class="block px-4 py-2 text-gray-700 hover:bg-gray-200 transition-colors duration-200"
                                role="menuitem">
                                Contact
                            </NuxtLinkLocale>
                        </li>
                    </ul>
                </div>
            </div>

            <NuxtLink :to="$localePath('index')" class="flex items-center space-x-2">
                <h1 class="flex text-lg items-center font-['Channel'] text-charcoal">
                    Tokyo
                </h1>
            </NuxtLink>

            <div class="flex items-center space-x-2">
                <ConnectButton @click="openLoginModal" />

                <CartButton v-if="typeof currentRoute.name === 'string' && currentRoute.name.startsWith('menu')" />
            </div>

            <!-- Login Modal -->
            <Login v-if="isLoginOpen" @close="isLoginOpen = false" />
        </div>
    </nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const currentRoute = useRoute();

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


const isLoginOpen = ref(false)

const openLoginModal = () => isLoginOpen.value = true

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