<template>
    <div class="lg:hidden">
        <!-- Backdrop -->
        <Transition name="fade">
            <div
                v-if="cartStore.isCartVisible"
                class="fixed inset-0 bg-black/30 z-[55]"
                @click="cartStore.toggleCartVisibility"
            />
        </Transition>

        <!-- Cart Panel -->
        <Transition name="slide-up">
            <aside
                v-if="cartStore.isCartVisible"
                data-testid="cart-mobile"
                aria-labelledby="cart-heading"
                class="fixed bottom-0 inset-x-0 bg-ygf-cream z-[60] flex flex-col max-h-[85vh] rounded-t-[var(--radius-lg)] shadow-ygf-lg"
            >
            <!-- Drag Handle -->
            <div class="flex justify-center pt-3 pb-1">
                <div class="w-10 h-1 rounded-full bg-ygf-gray-200" />
            </div>

            <!-- HEADER -->
            <header class="flex items-center justify-between px-4 pb-3 border-b border-ygf-gray-200">
                <h2 id="cart-heading" class="text-xl font-bold text-ygf-black">
                    {{ $t('cart.title') }}
                </h2>
                <button
                    :aria-label="$t('cart.closeCart')"
                    class="p-2 rounded-full hover:bg-ygf-orange-bg focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2 transition-colors"
                    @click="cartStore.toggleCartVisibility"
                >
                    <svg class="h-6 w-6 text-ygf-black" fill="none" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </header>

            <!-- ITEMS LIST -->
            <ul class="flex-1 overflow-y-auto p-4 space-y-3">
                <li
                    v-for="item in cartStore.products"
                    :key="getItemKey(item)"
                    data-testid="cart-item"
                    class="card grid grid-cols-6 gap-3 p-3 items-center"
                >
                    <!-- IMAGE -->
                    <picture
                        class="col-span-1 flex items-center justify-center w-16 h-16 bg-ygf-gray-100 rounded-[var(--radius-md)] overflow-hidden cursor-pointer active:scale-95 transition-transform"
                        @click="openLightbox(item.product.id, item.product.name)"
                    >
                        <source
                            :srcset="`${productImageBase(item.product.id)}.avif`"
                            type="image/avif"
                        />
                        <source
                            :srcset="`${productImageBase(item.product.id)}.webp`"
                            type="image/webp"
                        />
                        <img
                            ref="itemImageElements"
                            :src="`${productImageBase(item.product.id)}.png`"
                            :alt="item.product.name"
                            class="object-contain w-full h-full"
                            width="64"
                            height="64"
                            draggable="false"
                            @error="handleProductImageError"
                        />
                    </picture>

                    <!-- PRODUCT INFO -->
                    <div class="col-span-3 flex flex-col justify-center text-sm min-w-0">
                        <span v-if="itemLabelMeta(item)" class="text-xs text-ygf-gray-400 truncate">
                            {{ itemLabelMeta(item) }}
                        </span>
                        <span class="font-medium text-ygf-black leading-snug line-clamp-2">
                            {{ itemLabelName(item) }}
                        </span>
                        <span v-if="itemChoice(item)" class="text-xs text-ygf-orange-text">
                            ({{ itemChoice(item) }})
                        </span>
                        <span
                            v-if="item.product.pieceCount"
                            class="text-ygf-gray-400 text-xs mt-1"
                        >
                          {{ item.product.pieceCount }}
                          {{ item.product.pieceCount === 1 ? $t('menu.pc') : $t('menu.pcs') }}
                        </span>
                        <span class="text-ygf-black font-medium text-xs mt-1">
                            {{ formatPrice(getItemUnitPrice(item) * item.quantity) }}
                        </span>
                    </div>

                    <!-- QTY CONTROLS -->
                    <div class="col-span-2 grid grid-cols-3 items-center justify-items-center">
                        <button
                            data-testid="cart-item-decrement"
                            :aria-label="$t('cart.decreaseQty')"
                            class="p-1 bg-ygf-orange-bg hover:bg-ygf-orange-light rounded-full flex items-center justify-center h-10 w-10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ygf-orange-bg text-ygf-orange-text transition-colors focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2"
                            :disabled="hasChoices(item)"
                            :title="hasChoices(item) ? $t('cart.customizedItemHint') : undefined"
                            @click="handleDecrementQuantity(item)"
                        >
                            <span class="text-lg font-bold">−</span>
                        </button>
                        <span data-testid="cart-item-quantity" class="text-center text-ygf-black font-semibold">{{ item.quantity }}</span>
                        <button
                            data-testid="cart-item-increment"
                            :aria-label="$t('cart.increaseQty')"
                            class="p-1 bg-ygf-orange-bg hover:bg-ygf-orange-light rounded-full flex items-center justify-center h-10 w-10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ygf-orange-bg text-ygf-orange-text transition-colors focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2"
                            :disabled="hasChoices(item)"
                            :title="hasChoices(item) ? $t('cart.customizedItemHint') : undefined"
                            @click="handleIncrementQuantity(item)"
                        >
                            <span class="text-lg font-bold">+</span>
                        </button>
                    </div>
                    <p v-if="hasChoices(item)" class="col-span-6 text-[11px] text-ygf-gray-400 italic mt-1">
                        {{ $t('cart.customizedItemHint') }}
                    </p>
                </li>

                <!-- EMPTY STATE -->
                <li v-if="cartStore.products.length === 0" class="flex flex-col items-center justify-center h-64 text-ygf-gray-400">
                    <img
                        src="/icons/shopping-bag-icon.svg"
                        alt="Empty cart"
                        class="h-12 w-12 mb-4 flex-shrink-0"
                    />
                    <p>{{ $t('cart.empty') }}</p>
                </li>
            </ul>

            <!-- FOOTER: TOTAL + CHECKOUT -->
            <footer v-if="cartStore.products.length" class="p-4 border-t border-ygf-gray-200 bg-ygf-white rounded-b-none">
                <div class="space-y-1.5 text-sm mb-4">
                    <div v-if="hasBreakdown" class="flex justify-between text-ygf-gray-600">
                        <span>{{ $t('cart.subtotal') }}</span>
                        <span class="tabular-nums">{{ formatPrice(subtotal) }}</span>
                    </div>
                    <div v-if="cartStore.collectionOption === 'DELIVERY'" class="flex justify-between text-ygf-gray-600">
                        <span>{{ $t('cart.deliveryFee') }}</span>
                        <span v-if="!cartStore.address?.distance" class="text-ygf-gray-400 italic text-xs">
                            {{ $t('cart.deliveryTbd') }}
                        </span>
                        <span v-else-if="deliveryFee === -1" class="text-ygf-red font-medium text-xs">
                            {{ $t('checkout.tooFar') }}
                        </span>
                        <span v-else-if="deliveryFee === 0" class="chip chip-static bg-ygf-orange-bg text-ygf-orange-text text-[11px]">
                            {{ $t('checkout.free') }}
                        </span>
                        <span v-else class="tabular-nums">{{ formatPrice(deliveryFee) }}</span>
                    </div>
                    <div v-if="pickupDiscount > 0" class="flex justify-between text-ygf-success">
                        <span>{{ $t('cart.pickupDiscount') }}</span>
                        <span class="tabular-nums">-{{ formatPrice(pickupDiscount) }}</span>
                    </div>
                    <div v-if="couponDiscount > 0" class="flex justify-between text-ygf-orange-text">
                        <span>{{ $t('coupon.discount') }}<span v-if="cartStore.couponCode"> ({{ cartStore.couponCode }})</span></span>
                        <span class="tabular-nums">-{{ formatPrice(couponDiscount) }}</span>
                    </div>
                    <div class="flex justify-between items-baseline pt-2 mt-1 border-t border-ygf-gray-200">
                        <span class="font-medium text-ygf-black">{{ $t('cart.total') }}</span>
                        <span data-testid="cart-total" class="text-lg font-semibold text-ygf-black tabular-nums">{{ formatPrice(displayTotal) }}</span>
                    </div>
                </div>
                <div v-if="!isOrderingAvailable" class="text-sm text-ygf-red text-center mb-2">
                    {{ $t('cart.orderingUnavailable') }}
                </div>
                <NuxtLinkLocale
                    to="checkout"
                    :class="[
                        'btn block text-center transition-all',
                        isOrderingAvailable
                            ? 'btn-primary'
                            : 'opacity-45 pointer-events-none'
                    ]"
                    :tabindex="isOrderingAvailable ? 0 : -1"
                    :aria-disabled="!isOrderingAvailable"
                    @click="cartStore.toggleCartVisibility"
                >
                    {{ $t('cart.checkout') }}
                </NuxtLinkLocale>
                <div class="safe-area-spacer-bottom" />
            </footer>
            </aside>
        </Transition>
        <ImageLightbox v-if="showLightbox" ref="lightboxRef" :src="lightboxSrc" :alt="lightboxAlt" />
    </div>
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { defineAsyncComponent, nextTick, ref, useRuntimeConfig, watch } from '#imports'
import type { CartItem } from '#engine/types'
// Async-loaded so the lightbox bundle is only fetched if the user actually opens it. We pair it with `v-if="showLightbox"` so the async resolve only fires while the user is on this page — otherwise the resolve callback could race the page-transition unmount and crash Vue with "Cannot read 'type' of null".
const ImageLightbox = defineAsyncComponent(() => import('~/components/ImageLightbox.vue'))
import { formatPrice } from '#engine/lib/price'
import { orderItemLabelParts } from '#engine/utils/orderItemLabel'
import { useCartStore } from '#engine/stores/cart'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useHaptics } from '#engine/composables/useHaptics'
import { useTracking } from '#engine/composables/useTracking'

const { isOrderingAvailable = true } = defineProps<{ isOrderingAvailable?: boolean }>()

const config = useRuntimeConfig();
const cartStore = useCartStore();
const { impact } = useHaptics()
const { trackEvent } = useTracking();
const {
    getItemUnitPrice,
    subtotal,
    pickupDiscount,
    deliveryFee,
    couponDiscount,
    displayTotal,
    hasBreakdown,
} = useCartTotals()

const lightboxRef = ref<{ open: () => void } | null>(null)
const lightboxSrc = ref('')
const lightboxAlt = ref('')
const showLightbox = ref(false)

const openLightbox = async (id: string, name: string) => {
    lightboxSrc.value = productImage.productImageBase(config.public.s3bucketUrl, id, 'classic')
    lightboxAlt.value = name
    showLightbox.value = true
    await nextTick()
    lightboxRef.value?.open()
}

const { handleProductImageError } = productImage
const productImageBase = (id?: string | null) => productImage.productImageBase(config.public.s3bucketUrl, id)
const itemImageElements = ref<HTMLImageElement[]>([])

watch(itemImageElements, () => {
    itemImageElements.value.forEach((img) => productImage.ensureProductImageFallback(img))
}, { flush: 'post' })

const getItemKey = (item: CartItem): string => {
    const signature = (item.selectedChoices ?? [])
        .map((selection) => `${selection.groupId}:${selection.choiceId}:${selection.quantity}`)
        .sort()
        .join('|')
    return `${item.product.id}-${signature || (item.selectedChoice?.id ?? 'none')}`
}

const hasChoices = (item: CartItem): boolean =>
    (item.selectedChoices?.length ?? 0) > 0 || Boolean(item.selectedChoice)

const itemLabelParts = (item: CartItem) => orderItemLabelParts({
    code: item.product.code,
    categoryName: item.product.category?.name,
    productName: item.product.name,
})

const itemLabelMeta = (item: CartItem): string | undefined => {
    // Category name only: the internal menu code ("E1") read like debug
    // output next to the product name.
    return itemLabelParts(item).category || undefined
}

const itemLabelName = (item: CartItem): string => itemLabelParts(item).name

const itemChoice = (item: CartItem): string | undefined =>
    (item.selectedChoices?.length ?? 0) > 0
        ? (item.selectedChoices ?? [])
            .map((selection) => {
                const choice = item.product.choices.find((productChoice) => productChoice.id === selection.choiceId)
                if (!choice) return ''
                return selection.quantity > 1 ? `${choice.name} x${selection.quantity}` : choice.name
            })
            .filter(Boolean)
            .join(', ') || undefined
        : orderItemLabelParts({
            code: item.product.code,
            categoryName: item.product.category?.name,
            productName: item.product.name,
            choiceName: item.selectedChoice?.name,
        }).choice

const handleIncrementQuantity = (cartItem: CartItem): void => {
    impact('Light')
    cartStore.incrementQuantity(cartItem.product, {
        choice: cartItem.selectedChoice,
        selections: cartItem.selectedChoices,
    });
    trackEvent('product_quantity_incremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
};

const handleDecrementQuantity = (cartItem: CartItem): void => {
    impact('Light')
    cartStore.decrementQuantity(cartItem.product, {
        choice: cartItem.selectedChoice,
        selections: cartItem.selectedChoices,
    });
    trackEvent('product_quantity_decremented', { product_id: cartItem.product.id, new_quantity: cartItem.quantity })
};
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.35s cubic-bezier(0.33, 1, 0.68, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
