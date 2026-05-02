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
                    :key="getItemKey(item)"
                    class="flex items-center gap-3"
                >
                    <!-- Product image -->
                    <div
                        class="w-14 h-14 shrink-0 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform"
                        @click="openLightbox(item.product.id, item.product.name)"
                    >
                        <picture>
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
                                class="w-full h-full object-contain p-0.5"
                                width="56"
                                height="56"
                                @error="handleProductImageError"
                            />
                        </picture>
                    </div>

                    <!-- Info + controls -->
                    <div class="flex-1 min-w-0">
                        <!-- Row 1: Name + price -->
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p v-if="itemLabelMeta(item)" class="text-xs text-gray-500 truncate leading-tight mb-0.5">
                                    {{ itemLabelMeta(item) }}
                                </p>
                                <p class="text-[15px] font-semibold text-gray-900 leading-tight line-clamp-2 pr-1">
                                    {{ itemLabelName(item) }}
                                </p>
                                <p v-if="itemChoice(item)" class="text-xs text-red-500 mt-0.5 truncate">
                                    ({{ itemChoice(item) }})
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
                                    class="w-11 h-11 flex items-center justify-center rounded-full text-gray-700 active:bg-gray-200 transition-colors"
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
                                    class="w-11 h-11 flex items-center justify-center rounded-full text-gray-700 active:bg-gray-200 transition-colors"
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
                                class="w-11 h-11 flex items-center justify-center rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
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
                            ref="tooltipButtonRef"
                            type="button"
                            :aria-label="$t('checkout.deliveryFee')"
                            :aria-expanded="showTooltip"
                            class="min-w-11 min-h-11 -m-2.5 p-2.5 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none rounded-full relative"
                            @click.stop="showTooltip = !showTooltip"
                            @mouseenter="showTooltip = true"
                            @mouseleave="showTooltip = false"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                            </svg>
                            <div
                                v-if="showTooltip"
                                role="tooltip"
                                class="absolute left-0 bottom-10 min-w-[260px] max-w-xs p-3 bg-gray-800 text-white text-xs rounded-xl shadow-xl z-[999] whitespace-pre-line leading-relaxed text-left"
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
                    <span v-else-if="deliveryFee === 0" class="inline-flex items-center px-2 py-0.5 rounded-full bg-tsb-four text-red-700 text-xs font-semibold uppercase tracking-wide">{{ $t('checkout.free') }}</span>
                    <span v-else class="tabular-nums">{{ formatPrice(deliveryFee) }}</span>
                </div>
                <div v-if="cartStore.collectionOption === 'PICKUP'" class="flex justify-between text-gray-500">
                    <span>{{ $t('checkout.discount') }}</span>
                    <span class="tabular-nums">-{{ formatPrice(totalDiscount) }}</span>
                </div>
                <div v-if="cartStore.couponDiscount > 0" class="flex justify-between text-red-600">
                    <span>{{ $t('coupon.discount') }} ({{ cartStore.couponCode }})</span>
                    <span class="tabular-nums">-{{ formatPrice(cartStore.couponDiscount) }}</span>
                </div>
                <div v-if="cartStore.paymentOption === 'ONLINE'" class="flex justify-between text-gray-500">
                    <span>{{ $t('checkout.transactionFee') }}</span>
                    <span class="tabular-nums">{{ formatPrice(TRANSACTION_FEE) }}</span>
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
import * as productImage from '~/utils/productImage'
import { type ComputedRef, computed, onBeforeUnmount, ref, watch } from 'vue'
import type { CartItem } from '~/types'
import ImageLightbox from '~/components/ImageLightbox.vue' // eslint-disable-line typescript-eslint/consistent-type-imports
import { TRANSACTION_FEE } from '~/lib/fees'
import { deliveryFeeForDistance } from '~/lib/delivery'
import { formatPrice } from '~/lib/price'
import { orderItemLabelParts } from '~/utils/orderItemLabel'
import { useCartStore } from '@/stores/cart'
import { useHaptics } from '~/composables/useHaptics'
import { useRuntimeConfig } from '#imports'

const cartStore = useCartStore()
const config = useRuntimeConfig()
const { impact: hapticImpact } = useHaptics()
const showTooltip = ref(false)
const tooltipButtonRef = ref<HTMLElement | null>(null)

const handleDocClick = (e: Event) => {
    if (!showTooltip.value) return
    const btn = tooltipButtonRef.value
    if (btn && !btn.contains(e.target as Node)) showTooltip.value = false
}
const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showTooltip.value) showTooltip.value = false
}
watch(showTooltip, (open) => {
    if (!import.meta.client) return
    if (open) {
        document.addEventListener('click', handleDocClick)
        document.addEventListener('keydown', handleEscKey)
    } else {
        document.removeEventListener('click', handleDocClick)
        document.removeEventListener('keydown', handleEscKey)
    }
})
onBeforeUnmount(() => {
    if (!import.meta.client) return
    document.removeEventListener('click', handleDocClick)
    document.removeEventListener('keydown', handleEscKey)
})

const lightboxRef = ref<InstanceType<typeof ImageLightbox> | null>(null)
const lightboxSrc = ref('')
const lightboxAlt = ref('')

const openLightbox = (id: string, name: string) => {
    lightboxSrc.value = productImage.productImageBase(config.public.s3bucketUrl, id, 'classic')
    lightboxAlt.value = name
    lightboxRef.value?.open()
}

const { handleProductImageError } = productImage
const productImageBase = (id?: string | null) => productImage.productImageBase(config.public.s3bucketUrl, id)
const itemImageElements = ref<HTMLImageElement[]>([])

watch(itemImageElements, () => {
    itemImageElements.value.forEach((img) => productImage.ensureProductImageFallback(img))
}, { flush: 'post' })

const getItemUnitPrice = (item: { product: { price: string | number }; selectedChoice?: { priceModifier: string | number } | null }) => {
    const base = Number(item.product.price)
    const cartItem = item as CartItem
    const modifier = (cartItem.selectedChoices?.length ?? 0) > 0
        ? (cartItem.selectedChoices ?? []).reduce((sum, selection) => {
            const choice = cartItem.product.choices.find((productChoice) => productChoice.id === selection.choiceId)
            if (!choice) return sum
            return sum + Number(choice.priceModifier) * selection.quantity
        }, 0)
        : (item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0)
    return base + modifier
}

const getItemKey = (item: CartItem): string => {
    const signature = (item.selectedChoices ?? [])
        .map((selection) => `${selection.groupId}:${selection.choiceId}:${selection.quantity}`)
        .sort()
        .join('|')
    return `${item.product.id}-${signature || (item.selectedChoice?.id ?? 'none')}`
}

const itemLabelParts = (item: CartItem) => orderItemLabelParts({
    code: item.product.code,
    categoryName: item.product.category?.name,
    productName: item.product.name,
})

const itemLabelMeta = (item: CartItem): string | undefined => {
    const parts = itemLabelParts(item)
    const meta = [parts.code, parts.category].filter(Boolean).join('·')
    return meta || undefined
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

const cartTotal = computed(() =>
    cartStore.products.reduce((total, item) => total + getItemUnitPrice(item) * item.quantity, 0)
)

const deliveryFee = computed(() => {
    if (cartStore.collectionOption !== 'DELIVERY' || !cartStore.address) return 0
    return deliveryFeeForDistance(cartStore.address.distance)
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
    const txFee = cartStore.paymentOption === 'ONLINE' ? TRANSACTION_FEE : 0
    return cartTotal.value
        + (cartStore.collectionOption === 'DELIVERY' ? fee : 0)
        - totalDiscount.value
        - cartStore.couponDiscount
        + txFee
})

const handleIncrementQuantity = (item: CartItem) => {
    cartStore.incrementQuantity(item.product, {
        choice: item.selectedChoice,
        selections: item.selectedChoices,
    })
    hapticImpact('Light')
}

const handleDecrementQuantity = (item: CartItem) => {
    cartStore.decrementQuantity(item.product, {
        choice: item.selectedChoice,
        selections: item.selectedChoices,
    })
    hapticImpact('Light')
}

const handleRemoveFromCart = (item: CartItem) => {
    cartStore.removeFromCart(item.product, {
        choice: item.selectedChoice,
        selections: item.selectedChoices,
    })
    hapticImpact('Medium')
}
</script>
