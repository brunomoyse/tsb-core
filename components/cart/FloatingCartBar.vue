<template>
    <Transition name="slide-up">
        <button
            v-if="cartStore.totalItems > 0 && !cartStore.isCartVisible"
            type="button"
            class="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-gray-800 text-white px-4 py-3 flex items-center justify-between shadow-lg transition-all active:scale-[0.98]"
            :class="{ 'animate-cart-pulse': isPulsing }"
            @click="cartStore.toggleCartVisibility"
        >
            <div class="flex items-center gap-2">
                <span class="bg-white text-gray-800 font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm">
                    {{ cartStore.totalItems }}
                </span>
                <div class="flex flex-col items-start">
                    <span class="text-sm font-medium">{{ $t('cart.title') }}</span>
                    <Transition name="fade">
                        <span v-if="addedProductName" class="text-xs text-gray-300 truncate max-w-[180px]">
                            + {{ addedProductName }}
                        </span>
                    </Transition>
                </div>
            </div>
            <span class="font-semibold">{{ formatPrice(cartStore.totalPrice) }}</span>
        </button>
    </Transition>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from '#imports'

import { eventBus } from '~/eventBus'
import { formatPrice } from '~/lib/price'
import { useCartStore } from '@/stores/cart'

const cartStore = useCartStore()

const addedProductName = ref<string | null>(null)
const isPulsing = ref(false)
let nameTimeout: NodeJS.Timeout | null = null
let pulseTimeout: NodeJS.Timeout | null = null

const onCartItemAdded = (payload: { productName: string }) => {
    // Show product name briefly
    addedProductName.value = payload.productName
    if (nameTimeout) clearTimeout(nameTimeout)
    nameTimeout = setTimeout(() => {
        addedProductName.value = null
    }, 2000)

    // Pulse animation
    isPulsing.value = false
    // Force reflow to restart animation
    requestAnimationFrame(() => {
        isPulsing.value = true
        if (pulseTimeout) clearTimeout(pulseTimeout)
        pulseTimeout = setTimeout(() => {
            isPulsing.value = false
        }, 300)
    })
}

onMounted(() => {
    eventBus.on('cart-item-added', onCartItemAdded)
})

onUnmounted(() => {
    eventBus.off('cart-item-added', onCartItemAdded)
    if (nameTimeout) clearTimeout(nameTimeout)
    if (pulseTimeout) clearTimeout(pulseTimeout)
})
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

.fade-enter-active {
    transition: opacity 0.2s ease;
}
.fade-leave-active {
    transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
