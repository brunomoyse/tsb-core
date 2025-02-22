<template>
    <button @click="cartStore.toggleCartVisibility" :class="`relative flex items-center justify-center rounded-full h-9 p-4 border-2 
            font-semibold text-sm ${isCartVisible
            ? 'bg-red-400 text-white'
            : 'bg-off-white text-tsb-gray'
        } ${!isCartEmpty ? 'border-tsb-red' : 'border-transparent'
        }`" aria-label="Toggle Cart">
        <!-- Badge for total product quantity -->
        <span v-if="!isCartEmpty"
            class="absolute bottom-0 right-0 transform translate-x-[50%] translate-y-[50%] bg-tsb-red text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
            {{ totalProductQuantity }}
        </span>

        <!-- Cart SVG Icon -->
        <img src="/icons/shopping-bag-icon.svg" alt="Logout" class="h-6 w-6" />


        <!-- Button Text -->
        <span class="pl-1 desktop-only">Panier</span>
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCartStore } from '@/stores/cart';

// Initialize the cart store
const cartStore = useCartStore();

const isCartEmpty = computed(() => cartStore.products.length === 0);
const isCartVisible = computed(() => cartStore.isCartVisible);

// Computed property for the total quantity of products
const totalProductQuantity = computed(() => cartStore.totalItems);

</script>
