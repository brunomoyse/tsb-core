<template>
    <div :class="{ 'grayscale': !product.isAvailable }" class="h-full">
        <div v-if="product" :key="product.id"
             ref="cardRef"
             data-testid="product-card"
             :data-product-id="product.id"
             :data-has-choices="hasChoices"
             class="min-w-[140px] md:max-w-[185px] w-full h-full min-h-[260px] bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col p-2 transition-all duration-300 hover:shadow-md">
            <!-- Product Image (flexible: grows/shrinks to fill remaining space) -->
            <div class="flex-1 min-h-0 flex justify-center items-center p-2 cursor-pointer relative" @contextmenu.prevent @click="emit('openProductModal')">
                <!-- Dietary badges -->
                <div v-if="product.isHalal || product.isVegetarian || product.isSpicy" class="absolute top-1 right-1 z-10 flex flex-col gap-0.5">
                    <DietBadge v-if="product.isHalal" kind="halal" />
                    <DietBadge v-if="product.isVegetarian" kind="vegetarian" />
                    <DietBadge v-if="product.isSpicy" kind="spicy" />
                </div>
                <!-- Lunch-only ribbon (Mon–Fri lunch service) -->
                <div v-if="product.isLunchOnly" class="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded-md bg-tsb-four text-red-700 text-[10px] font-semibold uppercase tracking-wide" :title="$t('menu.lunchOnly')">
                    {{ $t('menu.lunchOnlyShort') }}
                </div>
                <!-- Shimmer placeholder -->
                <div v-if="!loaded"
                     class="absolute inset-0 animate-shimmer rounded-lg"
                     style="background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%;"
                />
                <picture class="w-full h-full flex justify-center items-center">
                    <source :srcset="`${productImageBaseSrc}.avif`"
                            type="image/avif"/>
                    <source :srcset="`${productImageBaseSrc}.webp`"
                            type="image/webp"/>
                    <img ref="imageElement" :alt="product.name"
                         width="185" height="130"
                         :class="[loaded ? 'opacity-100' : 'opacity-0', !product.isAvailable ? 'grayscale' : '']"
                         :draggable="false" :fetchpriority="index < 6 ? 'high' : 'low'"
                         :loading="index > 5 ? 'lazy' : 'eager'"
                         :src="`${productImageBaseSrc}.png`"
                         class="object-contain max-h-full transition-opacity duration-500"
                         @error="handleImageError"/>
                </picture>
            </div>

            <!-- Product Details (fixed size: does not grow) -->
            <div class="shrink-0 px-2 pb-1">
                <!-- Text block: fixed height so price always aligns across cards -->
                <div class="min-h-[76px] flex flex-col items-center">
                    <span translate="no" class="text-gray-600 font-medium text-xs mb-0.5 truncate">
                      {{ product.category?.name }}
                    </span>
                    <!-- The name is the keyboard-reachable way into the details modal. -->
                    <button
                        type="button"
                        data-testid="product-name"
                        translate="no"
                        class="text-black font-semibold text-sm line-clamp-2 text-center mb-0.5 rounded-md hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-300"
                        :title="product.name"
                        :aria-label="$t('menu.viewDetails', { name: product.name })"
                        @click="emit('openProductModal')"
                    >
                      {{ product.name }}
                    </button>
                    <span class="text-gray-600 text-xs text-center">
                      <template v-if="product?.pieceCount">{{ product.pieceCount }} {{ product.pieceCount > 1 ? $t('menu.pcs') : $t('menu.pc') }}</template>
                      <template v-for="(group, idx) in forcedChoiceGroups" :key="group.id">
                        {{ (product?.pieceCount || idx > 0) ? ' + ' : '' }}{{ group.maxSelections }} {{ forcedChoiceGroupLabel(group) }}
                      </template>
                    </span>
                </div>

                <!-- Price and Cart Controls -->
                <div v-if="product.isAvailable" class="flex justify-between items-center mt-1">
                    <template v-if="!showControls">
                        <span class="text-black font-semibold text-sm">
                          {{ formatPrice(product.price) }}
                        </span>
                        <div>
                            <button v-if="!isInCart" :aria-label="$t('cart.addToCart')" data-testid="product-add-to-cart"
                                    class="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-tsb-four hover:text-red-400 hover:border-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                                    type="button"
                                    :disabled="orderingDisabled"
                                    @click="addToCart">
                                <img alt="" class="w-6 h-6" src="/icons/shopping-bag-icon.svg"/>
                            </button>
                            <button v-else
                                 class="flex items-center justify-center w-10 h-10 rounded-xl bg-tsb-four text-red-700 font-semibold border border-red-200 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-300 cursor-pointer"
                                 type="button"
                                 :aria-label="`${$t('nav.cart')}: ${cardQuantity}`"
                                 :class="{ 'animate-number-bounce': isQuantityBouncing }"
                                 @click="showExpandedControls">
                                {{ cardQuantity }}
                            </button>
                        </div>
                    </template>
                    <QuantityStepper
                        v-else
                        class="w-full"
                        :value="cardQuantity"
                        :bounce="isQuantityBouncing"
                        :inc-disabled="cardQuantity >= MAX_ITEM_QUANTITY"
                        @decrement="decrement"
                        @increment="increment"
                    />
                </div>
                <div v-else class="flex justify-center text-sm text-gray-600 mt-1">{{ $t('menu.unavailable') }}</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { MAX_ITEM_QUANTITY, useCartStore } from '#engine/stores/cart'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useEventBus, useIntersectionObserver, useMounted } from '@vueuse/core'
import type { Product } from '#engine/types'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatPrice } from '#engine/lib/price'
import { useHaptics } from '#engine/composables/useHaptics'
import { useI18n } from 'vue-i18n'
import { useRuntimeConfig } from '#imports'
import { useTracking } from '#engine/composables/useTracking'

const cartItemAdded = useEventBus(cartItemAddedKey)
const cartStore = useCartStore();
const { t } = useI18n()
const config = useRuntimeConfig();
const { trackEvent } = useTracking();
const { impact } = useHaptics()

const {
    index,
    product,
    orderingDisabled
} = defineProps<{
    index: number;
    product: Product;
    orderingDisabled?: boolean;
}>();

const emit = defineEmits<{
    openProductModal: []
}>()

const showControls = ref(false);
const timeoutId = ref<NodeJS.Timeout | null>(null);

// Clear timeout when component unmounts
onUnmounted(() => {
    if (timeoutId.value) {
        clearTimeout(timeoutId.value);
    }
});

const hasChoices = computed(() => product.choices?.length > 0);

const forcedChoiceGroups = computed(() =>
    (product.choiceGroups ?? [])
        .filter((g) => g.minSelections > 0)
        .toSorted((a, b) => a.sortOrder - b.sortOrder),
);

const forcedChoiceGroupLabel = (group: { name: string; maxSelections: number }) => {
    if (product.category?.slug === 'menu-plateau') {
        return t(group.maxSelections > 1 ? 'menu.soups' : 'menu.soup').toLowerCase();
    }
    return group.name.toLowerCase();
};
const { handleProductImageError } = productImage
const productImageBaseSrc = computed(() => productImage.productImageBase(config.public.s3bucketUrl, product?.id));

// SSR-safe: cart store hydrates from localStorage post-mount, so render as empty until then.
const isMounted = useMounted()

const isInCart = computed(() =>
    isMounted.value && cartStore.products.some(
        (cartItem) => cartItem.product.id === product.id
    )
);

const cardQuantity = computed(() =>
    isMounted.value
        ? cartStore.products
            .filter((cartItem) => cartItem.product.id === product.id)
            .reduce((sum, item) => sum + item.quantity, 0)
        : 0
);

const isQuantityBouncing = ref(false)
watch(cardQuantity, () => {
    if (cardQuantity.value > 0) {
        isQuantityBouncing.value = true
        setTimeout(() => { isQuantityBouncing.value = false }, 200)
    }
})

const addToCart = () => {
    if (hasChoices.value) {
        emit('openProductModal');
        return;
    }
    impact('Light')
    cartStore.incrementQuantity(product);
    trackEvent('product_added_to_cart', {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: 1,
        source: 'card',
    });
    cartItemAdded.emit({
        productName: product.name,
        productId: product.id,
    });

    showControls.value = true;
    resetTimeout();
};

const showExpandedControls = () => {
    if (hasChoices.value) {
        emit('openProductModal');
        return;
    }
    // Show the expanded - + UI when the user clicks on the existing quantity
    showControls.value = true;
    resetTimeout();
};

const decrement = () => {
    cartStore.decrementQuantity(product);
    resetTimeout();
};

const increment = () => {
    cartStore.incrementQuantity(product);
    resetTimeout();
};

const resetTimeout = () => {
    if (timeoutId.value) {
        clearTimeout(timeoutId.value);
    }
    timeoutId.value = setTimeout(() => {
        showControls.value = false;
    }, 4000);
};

// Define the ref with the correct type (HTMLImageElement)
const imageElement = ref<HTMLImageElement | null>(null);

// Fire one product_viewed event per mount when the card scrolls ≥50% into view.
const cardRef = ref<HTMLElement | null>(null)
const hasTrackedImpression = ref(false)
const { stop: stopImpressionObserver } = useIntersectionObserver(
    cardRef,
    ([entry]) => {
        if (!entry?.isIntersecting || hasTrackedImpression.value) return
        hasTrackedImpression.value = true
        trackEvent('product_viewed', {
            product_id: product.id,
            product_name: product.name,
            category_name: product.category?.name,
            price: product.price,
            source: 'card',
        })
        stopImpressionObserver()
    },
    { threshold: 0.5 },
)

// Track whether the image has loaded
const loaded = ref(false);
const handleImageError = (event: Event) => {
    handleProductImageError(event)
    loaded.value = true
}

onMounted(() => {
    if (imageElement.value) {
        productImage.ensureProductImageFallback(imageElement.value)

        // Check if the image is already loaded (e.g., cached)
        if (imageElement.value.complete) {
            loaded.value = true;
        } else {
            // Wait for the image to load
            imageElement.value.addEventListener('load', () => {
                loaded.value = true;
            });
        }
    }
});
</script>
