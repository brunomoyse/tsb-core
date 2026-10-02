<template>
    <section class="card overflow-visible">
        <!-- Header -->
        <div class="px-5 pt-5 pb-3 flex items-baseline justify-between">
            <h2 class="text-lg font-bold text-neutral-900">
                {{ $t('checkout.orderSummary', 'Your Order') }}
            </h2>
            <span class="text-xs text-neutral-600 font-medium">
                {{ $t('checkout.itemCount', { count: cartStore.totalItems }, cartStore.totalItems) }}
            </span>
        </div>

        <!-- Empty state -->
        <div v-if="cartStore.products.length === 0" class="px-5 pb-5 text-neutral-600 text-center text-sm">
            {{ $t('checkout.emptyCart', 'Your cart is empty.') }}
        </div>

        <template v-else>
            <!-- Items -->
            <div class="px-5 space-y-3 pb-4">
                <div
                    v-for="(item, lineIndex) in cartStore.products"
                    :key="lineKeys[lineIndex]"
                    class="flex items-center gap-3"
                >
                    <!-- Product image -->
                    <button
                        type="button"
                        class="w-14 h-14 shrink-0 rounded-xl bg-neutral-50 flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        :aria-label="$t('common.viewPhoto', { name: item.product.name })"
                        aria-haspopup="dialog"
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
                                alt=""
                                class="w-full h-full object-contain p-0.5"
                                width="56"
                                height="56"
                                @error="handleProductImageError"
                            />
                        </picture>
                    </button>

                    <!-- Info + controls -->
                    <div class="flex-1 min-w-0">
                        <!-- Row 1: Name + price -->
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p v-if="itemLabelMeta(item)" class="text-xs text-neutral-600 truncate leading-tight mb-0.5">
                                    {{ itemLabelMeta(item) }}
                                </p>
                                <p class="text-[15px] font-semibold text-neutral-900 leading-tight line-clamp-2 pr-1">
                                    {{ itemLabelName(item) }}
                                </p>
                                <p v-if="itemChoice(item)" class="text-xs text-primary-700 mt-0.5 truncate">
                                    ({{ itemChoice(item) }})
                                </p>
                            </div>
                            <span class="text-[15px] font-bold text-neutral-900 shrink-0 tabular-nums">
                                {{ formatCents(getItemLineTotalCents(item)) }}
                            </span>
                        </div>

                        <p v-if="!canChangeQuantity(item)" class="text-[11px] text-neutral-600 italic mt-1">{{ $t('cart.customizedItemHint') }}</p>
                        <!-- What the server quote says about this line, with the way out -->
                        <CartLineIssues class="mt-2" :item="item" :line-key="lineKeys[lineIndex]" />

                        <!-- Row 2: Stepper + remove -->
                        <div class="flex items-center justify-between mt-1.5">
                            <div class="flex items-center gap-0 bg-neutral-100 rounded-full">
                                <button
                                    :aria-label="$t('cart.decreaseQty')"
                                    class="w-11 h-11 flex items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:active:bg-transparent"
                                    :disabled="!canChangeQuantity(item)"
                                    :title="!canChangeQuantity(item) ? $t('cart.customizedItemHint') : undefined"
                                    @click="handleDecrementQuantity(item)"
                                >
                                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                </button>
                                <span class="w-7 text-center text-sm font-semibold text-neutral-800 tabular-nums select-none">
                                    {{ item.quantity }}
                                </span>
                                <button
                                    :aria-label="$t('cart.increaseQty')"
                                    class="w-11 h-11 flex items-center justify-center rounded-full text-neutral-700 active:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:active:bg-transparent"
                                    :disabled="!canChangeQuantity(item)"
                                    :title="!canChangeQuantity(item) ? $t('cart.customizedItemHint') : undefined"
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
                                class="w-11 h-11 flex items-center justify-center rounded-full text-neutral-600 hover:text-primary-700 hover:bg-primary-50 active:bg-primary-100 transition-colors"
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
            <div class="mx-5 border-t border-neutral-100" />

            <!-- Price summary -->
            <div class="px-5 pt-3 pb-5 space-y-1.5 text-sm">
                <div class="flex justify-between text-neutral-600">
                    <span>{{ $t('checkout.subtotal', 'Subtotal:') }}</span>
                    <span class="tabular-nums">{{ formatCents(subtotalCents) }}</span>
                </div>
                <div v-if="cartStore.collectionOption === 'DELIVERY'" class="flex justify-between text-neutral-600 relative">
                    <div class="flex items-center gap-1">
                        <span>{{ $t('checkout.deliveryFee', 'Delivery Fee:') }}</span>
                        <button
                            ref="tooltipButtonRef"
                            type="button"
                            :aria-label="$t('checkout.deliveryFee')"
                            :aria-expanded="showTooltip"
                            class="min-w-11 min-h-11 -m-2.5 p-2.5 inline-flex items-center justify-center text-neutral-600 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none rounded-full relative"
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
                                class="absolute left-0 bottom-10 min-w-[260px] max-w-xs p-3 bg-neutral-800 text-white text-xs rounded-xl shadow-xl z-[999] whitespace-pre-line leading-relaxed text-left"
                            >
                                {{ deliveryFeeInfo }}
                                <div class="absolute top-full left-3 -mt-1">
                                    <div class="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-neutral-800" />
                                </div>
                            </div>
                        </button>
                    </div>
                    <span v-if="!cartStore.address?.distance" class="text-neutral-600 italic">{{ $t('checkout.tbd') }}</span>
                    <span v-else-if="deliveryFeeCents === -1" class="text-red-700 font-medium inline-flex flex-wrap items-center justify-end gap-x-2 text-right">
                        {{ $t(deliveryUnavailableKey, policyParams) }}
                        <button type="button" data-testid="cart-out-of-zone-switch-to-pickup" class="underline min-h-11 px-1 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded" @click="switchToPickup">{{ $t('delivery.modal.switchToPickup') }}</button>
                    </span>
                    <span v-else-if="deliveryFeeCents === 0" class="inline-flex items-center px-2 py-0.5 rounded-full bg-tsb-four text-primary-700 text-xs font-semibold uppercase tracking-wide">{{ $t('checkout.free') }}</span>
                    <span v-else class="tabular-nums">{{ formatCents(deliveryFeeCents) }}</span>
                </div>
                <div v-if="pickupDiscountCents > 0" class="flex justify-between text-green-800">
                    <span>{{ $t('checkout.discount') }}</span>
                    <span class="tabular-nums">-{{ formatCents(pickupDiscountCents) }}</span>
                </div>
                <div v-if="cartStore.couponDiscountCents > 0" class="flex justify-between text-green-800">
                    <span>{{ $t('coupon.discount') }} ({{ cartStore.couponCode }})</span>
                    <span class="tabular-nums">-{{ formatCents(cartStore.couponDiscountCents) }}</span>
                </div>
                <div v-if="onlineFeeCents > 0" class="flex justify-between text-neutral-600">
                    <span>{{ $t('checkout.transactionFee') }}</span>
                    <span class="tabular-nums">{{ formatCents(onlineFeeCents) }}</span>
                </div>
                <!-- Total -->
                <div class="flex justify-between items-baseline pt-2 mt-1 border-t border-neutral-100">
                    <span class="font-bold text-neutral-900">{{ $t('checkout.total', 'Total:') }}</span>
                    <span class="inline-flex items-baseline gap-2"><QuoteUpdatingHint /><span class="font-bold text-lg text-primary-700 tabular-nums">{{ formatCents(payableCents) }}</span></span>
                </div>
            </div>
        </template>
    </section>
    <ImageLightbox ref="lightboxRef" :src="lightboxSrc" :alt="lightboxAlt" />
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { canChangeLineQuantity, cartLineKeys } from '#engine/utils/cartLines'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { CartItem } from '#engine/types'
import CartLineIssues from '#engine/components/CartLineIssues.vue'
import ImageLightbox from '#engine/components/ImageLightbox.vue' // eslint-disable-line typescript-eslint/consistent-type-imports
import QuoteUpdatingHint from '#engine/components/QuoteUpdatingHint.vue'
import { deliveryFeeRows } from '#engine/utils/orderingPolicy'
import { formatCents } from '#engine/lib/price'
import { useCartItemLabel } from '#engine/composables/useCartItemLabel'
import { useCartRemoval } from '#engine/composables/useCartRemoval'
import { useCartStore } from '#engine/stores/cart'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useI18n } from 'vue-i18n'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'
import { useHaptics } from '#engine/composables/useHaptics'
import { useRuntimeConfig } from '#imports'


const cartStore = useCartStore()
const config = useRuntimeConfig()
const { t } = useI18n()
const { policy, policyParams } = useOrderingPolicy()
// The fee grid tooltip: one line per distance band of the API's policy (the first band is "less than X km").
const deliveryFeeInfo = computed(() => t('checkout.deliveryFeeInfo', {
    tiers: deliveryFeeRows(policy.value).map((row) => t(row.fromKm === null ? 'checkout.deliveryFeeTierFirst' : 'checkout.deliveryFeeTier', {
        from: row.fromKm,
        to: row.toKm,
        fee: row.feeCents === 0 ? t('checkout.free') : formatCents(row.feeCents),
    })).join('\n'),
}))
const { impact: hapticImpact } = useHaptics()
const {
    getItemLineTotalCents,
    subtotalCents,
    pickupDiscountCents,
    deliveryFeeCents,
    deliveryUnavailableKey,
    switchToPickup,
    onlineFeeCents,
    payableCents,
} = useCartTotals()
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

const canChangeQuantity = (item: CartItem): boolean => canChangeLineQuantity(item.selectedChoices, item.quantity)

const { itemLabelMeta, itemLabelName, itemChoice, getItemKey } = useCartItemLabel()
// Unique even if an old persisted cart still holds two lines that share a key.
const lineKeys = computed(() => cartLineKeys(cartStore.products))

const handleIncrementQuantity = (item: CartItem) => {
    cartStore.incrementQuantity(item.product, {
        choice: item.selectedChoice,
        selections: item.selectedChoices,
        quantity: item.quantity,
    })
    hapticImpact('Light')
}

// The "−" and the remove button share one flow with every other cart surface: the last unit going down is a removal, and every removal offers Undo.
const { removeLine: handleRemoveFromCart, decrementLine: handleDecrementQuantity } = useCartRemoval()
</script>
