<template>
    <Transition name="slide-up">
        <button
            v-if="cartStore.totalItems > 0 && !cartStore.isCartVisible"
            type="button"
            class="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-red-500 text-white px-4 py-3 flex items-center justify-between shadow-lg"
            @click="cartStore.toggleCartVisibility"
        >
            <div class="flex items-center gap-2">
                <span class="bg-white text-red-500 font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm">
                    {{ cartStore.totalItems }}
                </span>
                <span class="text-sm font-medium">{{ $t('cart.title') }}</span>
            </div>
            <span class="font-semibold">{{ formatPrice(cartStore.totalPrice) }}</span>
        </button>
    </Transition>
</template>

<script lang="ts" setup>
import { useCartStore } from '@/stores/cart'
import { formatPrice } from '~/lib/price'
const cartStore = useCartStore()
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
}
</style>
