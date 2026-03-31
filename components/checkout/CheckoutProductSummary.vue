<template>
    <section class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">
        <!-- Header -->
        <div class="px-5 pt-5 pb-3 flex items-baseline justify-between">
            <h2 class="text-lg font-bold text-gray-900">
                {{ $t('checkout.orderSummary', 'Your Order') }}
            </h2>
            <span class="text-xs text-gray-400 font-medium">
                {{ $t('checkout.itemCount', { count: cartStore.totalItems }, cartStore.totalItems) }}
            </span>
        </div>

        <!-- Empty state -->
        <div v-if="cartStore.products.length === 0" class="px-5 pb-5 text-gray-400 text-center text-sm">
            {{ $t('checkout.emptyCart', 'Your cart is empty.') }}
        </div>

        <template v-else>
            <!-- Items -->
            <div class="px-5 space-y-3 pb-4">
                <div
                    v-for="item in cartStore.products"
                    :key="`${item.product.id}-${item.selectedChoice?.id ?? 'none'}`"
                    class="flex items-center gap-3"
                >
                    <!-- Product image -->
                    <div
                        class="w-14 h-14 shrink-0 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform"
                        @click="openLightbox(item.product.slug, item.product.name)"
                    >
                        <picture>
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product.slug}.avif`"
                                type="image/avif"
                            />
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${item.product.slug}.webp`"
                                type="image/webp"
                            />
                            <img
                                :src="`${config.public.s3bucketUrl}/images/thumbnails/${item.product.slug}.png`"
                                :alt="item.product.name"
                                class="w-full h-full object-contain p-0.5"
                                width="56"
                                height="56"
                            />
                        </picture>
                    </div>

                    <!-- Info + controls -->
                    <div class="flex-1 min-w-0">
                        <!-- Row 1: Name + price -->
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="text-[15px] font-semibold text-gray-900 truncate leading-tight">
                                    <span v-if="item.product.code" class="text-gray-400 font-normal text-xs mr-1">{{ item.product.code }}</span>
                                    {{ item.product.name }}
                                </p>
                                <p class="text-xs text-gray-400 mt-0.5 truncate">
                                    {{ item.product.category?.name || '' }}
                                    <template v-if="item.selectedChoice">
                                        &middot; <span class="text-red-500">{{ item.selectedChoice.name }}</span>
                                    </template>
                                </p>
                            </div>
                            <span class="text-[15px] font-bold text-gray-900 shrink-0 tabular-nums">
                                {{ formatPrice(getItemUnitPrice(item) * item.quantity) }}
                            </span>
                        </div>

                        <!-- Row 2: Stepper + remove -->
                        <div class="flex items-center justify-between mt-1.5">
                            <div class="flex items-center gap-0 bg-gray-100 rounded-full">
                                <button
                                    :aria-label="$t('cart.decreaseQty')"
                                    class="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 active:bg-gray-200 transition-colors"
                                    @click="handleDecrementQuantity(item)"
                                >
                                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                </button>
                                <span class="w-7 text-center text-sm font-semibold text-gray-800 tabular-nums select-none">
                                    {{ item.quantity }}
                                </span>
                                <button
                                    :aria-label="$t('cart.increaseQty')"
                                    class="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 active:bg-gray-200 transition-colors"
                                    @click="handleIncrementQuantity(item)"
                                >
                                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                </button>
                            </div>
                            <button
                                :aria-label="$t('cart.removeItem')"
                                class="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 active:bg-red-100 transition-colors"
                                @click="handleRemoveFromCart(item)"
                            >
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Divider -->
            <div class="mx-5 border-t border-gray-100" />

            <!-- Price summary -->
            <div class="px-5 pt-3 pb-5 space-y-1.5 text-sm">
                <div class="flex justify-between text-gray-500">
                    <span>{{ $t('checkout.subtotal', 'Subtotal:') }}</span>
                    <span class="tabular-nums">{{ formatPrice(cartTotal) }}</span>
                </div>
                <div v-if="cartStore.collectionOption === 'DELIVERY'" class="flex justify-between text-gray-500 relative">
                    <div class="flex items-center gap-1">
                        <span>{{ $t('checkout.deliveryFee', 'Delivery Fee:') }}</span>
                        <button
                            type="button"
                            class="text-gray-400 hover:text-gray-600 focus:outline-none relative"
                            @mouseenter="showTooltip = true"
                            @mouseleave="showTooltip = false"
                            @focus="showTooltip = true"
                            @blur="showTooltip = false"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                            </svg>
                            <div
                                v-if="showTooltip"
                                class="absolute left-0 bottom-6 min-w-[260px] max-w-xs p-3 bg-gray-800 text-white text-xs rounded-xl shadow-xl z-[999] whitespace-pre-line pointer-events-none leading-relaxed text-left"
                            >
                                {{ $t('checkout.deliveryFeeInfo') }}
                                <div class="absolute top-full left-3 -mt-1">
                                    <div class="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800" />
                                </div>
                            </div>
                        </button>
                    </div>
                    <span v-if="!cartStore.address?.distance" class="text-gray-400 italic">{{ $t('checkout.tbd') }}</span>
                    <span v-else-if="deliveryFee === -1" class="text-red-500 font-medium">{{ $t('checkout.tooFar') }}</span>
                    <span v-else-if="deliveryFee === 0" class="text-emerald-600 font-medium">{{ $t('checkout.free') }}</span>
                    <span v-else class="tabular-nums">{{ formatPrice(deliveryFee) }}</span>
                </div>
                <div v-if="cartStore.collectionOption === 'PICKUP'" class="flex justify-between text-gray-500">
                    <span>{{ $t('checkout.discount') }}</span>
                    <span class="tabular-nums">-{{ formatPrice(totalDiscount) }}</span>
                </div>
                <div v-if="cartStore.couponDiscount > 0" class="flex justify-between text-emerald-600">
                    <span>{{ $t('coupon.discount') }} ({{ cartStore.couponCode }})</span>
                    <span class="tabular-nums">-{{ formatPrice(cartStore.couponDiscount) }}</span>
                </div>
                <!-- Total -->
                <div class="flex justify-between items-baseline pt-2 mt-1 border-t border-gray-100">
                    <span class="font-bold text-gray-900">{{ $t('checkout.total', 'Total:') }}</span>
                    <span class="font-bold text-lg text-red-600 tabular-nums">{{ formatPrice(finalTotal) }}</span>
                </div>
            </div>
        </template>
    </section>
    <ImageLightbox ref="lightboxRef" :src="lightboxSrc" :alt="lightboxAlt" />
</template>

<script lang="ts" setup>
import { type ComputedRef, computed, ref } from 'vue'
import type { CartItem } from '~/types'
import ImageLightbox from '~/components/ImageLightbox.vue' // eslint-disable-line typescript-eslint/consistent-type-imports
import { formatPrice } from '~/lib/price'
import { useCartStore } from '@/stores/cart'
import { useHaptics } from '~/composables/useHaptics'
import { useRuntimeConfig } from '#imports'

const cartStore = useCartStore()
const config = useRuntimeConfig()
const { impact: hapticImpact } = useHaptics()
const showTooltip = ref(false)

const lightboxRef = ref<InstanceType<typeof ImageLightbox> | null>(null)
const lightboxSrc = ref('')
const lightboxAlt = ref('')

const openLightbox = (slug: string, name: string) => {
    lightboxSrc.value = `${config.public.s3bucketUrl}/images/thumbnails/${slug}`
    lightboxAlt.value = name
    lightboxRef.value?.open()
}

const getItemUnitPrice = (item: { product: { price: string | number }; selectedChoice?: { priceModifier: string | number } | null }) => {
    const base = Number(item.product.price)
    const modifier = item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0
    return base + modifier
}

const cartTotal = computed(() =>
    cartStore.products.reduce((total, item) => total + getItemUnitPrice(item) * item.quantity, 0)
)

const deliveryFee = computed(() => {
    if (cartStore.collectionOption !== 'DELIVERY' || !cartStore.address) return 0

    const { distance } = cartStore.address
    if (distance >= 9000) return -1

    const thresholds = [4000, 5000, 6000, 7000, 8000, 9000]
    const fee = thresholds.findIndex((threshold) => distance < threshold)
    return fee === -1 ? 0 : fee
})

const totalDiscount = computed(() => (
    cartStore.collectionOption === 'PICKUP'
        ? cartStore.products.reduce((acc, item) =>
            item.product.isDiscountable
                ? acc + (getItemUnitPrice(item) * item.quantity * 0.1)
                : acc, 0)
        : 0
));

const finalTotal: ComputedRef<number> = computed(() => {
    const fee = deliveryFee.value === -1 ? 0 : deliveryFee.value
    return cartTotal.value + (cartStore.collectionOption === 'DELIVERY' ? fee : 0) - totalDiscount.value - cartStore.couponDiscount
})

const handleIncrementQuantity = (item: CartItem) => {
    cartStore.incrementQuantity(item.product, item.selectedChoice)
    hapticImpact('Light')
}

const handleDecrementQuantity = (item: CartItem) => {
    cartStore.decrementQuantity(item.product, item.selectedChoice)
    hapticImpact('Light')
}

const handleRemoveFromCart = (item: CartItem) => {
    cartStore.removeFromCart(item.product, item.selectedChoice)
    hapticImpact('Medium')
}
</script>
