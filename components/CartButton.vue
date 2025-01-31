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
        <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" class="h-5 w-5 fill-current">
            <path fill-rule="evenodd" clip-rule="evenodd"
                d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z">
            </path>
        </svg>

        <!-- Button Text -->
        <span class="desktop-only">Panier</span>
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
