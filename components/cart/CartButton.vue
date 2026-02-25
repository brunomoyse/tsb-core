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
             :class="['absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full -top-2 -right-2 dark:border-gray-900', animating ? 'animate-bounce' : '']">
            {{ cartCount }}
        </div>
        <span class="sr-only">{{ $t('cart.notifications') }}</span>
    </button>
</template>

<script lang="ts" setup>
import {computed, nextTick, ref, watch} from 'vue';
import {useCartStore} from '@/stores/cart';
import {useTracking} from '~/composables/useTracking';

const { trackEvent } = useTracking()

const handleToggleCart = () => {
    if (!cartStore.isCartVisible) {
        trackEvent('cart_viewed', { total_items: cartStore.totalItems, total_price: cartStore.totalPrice })
    }
    cartStore.toggleCartVisibility();
}

// Initialize the cart store
const cartStore = useCartStore();

// Computed property for the total quantity of products
const cartCount = computed(() => cartStore.totalItems);

// Badge bounce animation
const animating = ref(false);
watch(cartCount, (newVal) => {
    if (newVal > 0) {
        nextTick(() => {
            animating.value = true;
            setTimeout(() => { animating.value = false; }, 600);
        });
    }
});
</script>
