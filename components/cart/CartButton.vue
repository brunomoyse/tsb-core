<template>
    <button type="button" class="relative"
            @click="handleToggleCart"
    >
        <!-- Cart Icon -->
        <div
            class="flex items-center justify-center w-10 h-10 rounded-full">
            <img alt="Cart Icon" class="w-6 h-6" src="/icons/shopping-bag-icon.svg"/>

            <!-- Tooltip positioned below -->
            <span
                class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50">
                    {{ $t('nav.cart') }}
                </span>
        </div>
        <!-- Badge for cart count -->
        <div v-if="cartCount > 0"
             class="absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full -top-2 -right-2 dark:border-gray-900">
            {{ cartCount }}
        </div>
        <span class="sr-only">Cart Notifications</span>
    </button>
</template>

<script lang="ts" setup>
import {computed} from 'vue';
import {useCartStore} from '@/stores/cart';

const handleToggleCart = () => {
    cartStore.toggleCartVisibility();
}

// Initialize the cart store
const cartStore = useCartStore();

const isCartEmpty = computed(() => cartStore.products.length === 0);
const isCartVisible = computed(() => cartStore.isCartVisible);

// Computed property for the total quantity of products
const cartCount = computed(() => cartStore.totalItems);
</script>
