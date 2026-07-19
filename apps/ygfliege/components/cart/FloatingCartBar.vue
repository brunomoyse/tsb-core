<template>
    <Transition name="slide-up">
        <div
            v-if="cartStore.totalItems > 0 && !cartStore.isCartVisible"
            class="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-ygf-orange-on-white shadow-ygf-md"
            :class="{ 'animate-cart-pulse': isPulsing }"
        >
            <button
                type="button"
                data-testid="floating-cart-bar"
                class="w-full min-h-14 text-ygf-white px-4 py-3 flex items-center justify-between transition-all duration-200 ease-out active:scale-[0.985] active:bg-ygf-orange-on-white-hover focus-visible:ring-2 focus-visible:ring-ygf-white focus-visible:ring-offset-2"
                @click="cartStore.toggleCartVisibility"
            >
                <div class="flex items-center gap-3 min-w-0">
                    <span class="bg-ygf-white text-ygf-orange-on-white font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm shrink-0">
                        {{ cartStore.totalItems }}
                    </span>
                    <span class="text-sm font-semibold truncate">
                        {{ $t('cart.viewCart') }} · {{ cartStore.totalItems }}
                        {{ cartStore.totalItems > 1 ? $t('cart.items') : $t('cart.item') }}
                    </span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span class="font-semibold tabular-nums">{{ formatPrice(displayTotal) }}</span>
                    <svg class="w-4 h-4 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                        <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </button>
            <div class="safe-area-spacer-bottom bg-ygf-orange-on-white" />
        </div>
    </Transition>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from '#imports'

import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatPrice } from '#engine/lib/price'
import { useCartStore } from '#engine/stores/cart'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useEventBus } from '@vueuse/core'

const cartStore = useCartStore()
const { displayTotal } = useCartTotals()

const isPulsing = ref(false)
let pulseTimeout: NodeJS.Timeout | null = null

const onCartItemAdded = () => {
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

// SSR-safe: VueUse useEventBus auto-cleans via tryOnScopeDispose
useEventBus(cartItemAddedKey).on(onCartItemAdded)

onUnmounted(() => {
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
</style>
