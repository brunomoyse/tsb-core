<template>
    <button type="button" class="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="cartCount > 0 ? `${$t('nav.cart')}: ${cartCount}` : $t('nav.cart')"
            @click="handleToggleCart"
    >
        <!-- Cart Icon -->
        <div
            class="flex items-center justify-center w-11 h-11 rounded-full">
            <img alt="" class="w-6 h-6" src="/icons/shopping-bag-icon.svg"/>

            <!-- Tooltip positioned below -->
            <span
                class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none">
                    {{ $t('nav.cart') }}
                </span>
        </div>
        <!-- Badge for cart count -->
        <div v-if="cartCount > 0"
             aria-hidden="true"
             :class="['absolute inline-flex items-center justify-center min-w-6 h-6 px-1 text-xs font-bold text-primary-foreground bg-primary border-2 border-white rounded-full -top-1.5 -right-1.5', animating ? 'animate-bounce' : '']">
            {{ cartCount }}
        </div>
    </button>
</template>

<script lang="ts" setup>
import {computed, nextTick, ref, watch} from 'vue';
import {useCartStore} from '#engine/stores/cart';
import {useTracking} from '#engine/composables/useTracking';

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
