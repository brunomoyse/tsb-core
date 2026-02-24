<template>
    <div :class="{ 'pointer-events-none grayscale': !product.isAvailable }">
        <div v-if="product" :key="product.id"
             data-testid="product-card"
             :data-has-choices="hasChoices"
             class="min-w-[140px] max-w-[185px] w-full h-[260px] bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col p-2 transition-all duration-300 hover:shadow-md">
            <!-- Product Image (flexible: grows/shrinks to fill remaining space) -->
            <div class="flex-1 min-h-0 flex justify-center items-center p-2 cursor-pointer relative" @contextmenu.prevent @click="emit('openProductModal')">
                <!-- Dietary badges -->
                <div v-if="product.isHalal || product.isVegan || product.isSpicy" class="absolute top-1 right-1 z-10 flex flex-col gap-0.5">
                    <div v-if="product.isHalal" class="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500" :title="$t('menu.halal')">
                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                    </div>
                    <div v-if="product.isVegan" class="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500" :title="$t('menu.vegan')">
                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/>
                            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                        </svg>
                    </div>
                    <div v-if="product.isSpicy" class="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500" :title="$t('menu.spicy')">
                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M13.73 2.18a1 1 0 0 0-1.46 0C10.6 3.87 9 6.81 9 10a6 6 0 0 0 12 0c0-3.19-1.6-6.13-3.27-7.82z"/>
                            <path d="M13.73 6.18a1 1 0 0 0-1.46 0C11.27 7.27 10 9.13 10 11a4 4 0 0 0 8 0c0-1.87-1.27-3.73-2.27-4.82z"/>
                        </svg>
                    </div>
                </div>
                <!-- Shimmer placeholder -->
                <div v-if="!loaded"
                     class="absolute inset-0 animate-shimmer rounded-lg"
                     style="background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%;"
                />
                <picture class="w-full h-full flex justify-center items-center">
                    <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.avif`"
                            type="image/avif"/>
                    <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.webp`"
                            type="image/webp"/>
                    <img ref="imageElement" :alt="product.name"
                         width="185" height="130"
                         :class="[loaded ? 'opacity-100' : 'opacity-0', !product.isAvailable ? 'grayscale' : '']"
                         :draggable="false" :fetchpriority="index < 6 ? 'high' : 'low'"
                         :loading="index > 5 ? 'lazy' : 'eager'"
                         :src="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.png`" class="object-contain max-h-full transition-opacity duration-500"/>
                </picture>
            </div>

            <!-- Product Details (fixed size: does not grow) -->
            <div class="shrink-0 px-2 pb-1">
                <!-- Text block: fixed height so price always aligns across cards -->
                <div class="h-[76px] flex flex-col items-center overflow-hidden">
                    <span class="text-gray-600 font-medium text-xs mb-0.5 truncate">
                      {{ product.category?.name }}
                    </span>
                    <span
                        data-testid="product-name"
                        class="text-black font-semibold text-sm line-clamp-2 text-center mb-0.5"
                        :title="product.name"
                    >
                      {{ product.name }}
                    </span>
                    <span class="text-gray-600 text-xs">
                      {{ product?.pieceCount }}
                        {{ product?.pieceCount ? product?.pieceCount > 1 ? $t('menu.pcs') : $t('menu.pc') : "" }}
                    </span>
                </div>

                <!-- Price and Cart Controls -->
                <div v-if="product.isAvailable" class="flex justify-between items-center mt-1">
                    <template v-if="!showControls">
                        <span class="text-black font-semibold text-sm">
                          {{ formatPrice(product.price) }}
                        </span>
                        <div>
                            <button v-if="!isInCart" aria-label="Add to Cart" data-testid="product-add-to-cart"
                                    class="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-tsb-four hover:text-red-400 hover:border-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                                    type="button"
                                    :disabled="props.orderingDisabled"
                                    @click="addToCart">
                                <img alt="Cart Icon" class="w-6 h-6" src="/icons/shopping-bag-icon.svg"/>
                            </button>
                            <button v-else
                                 class="flex items-center justify-center w-10 h-10 rounded-xl bg-tsb-four text-red-700 font-semibold border border-red-200 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-all duration-300 cursor-pointer"
                                 :class="{ 'animate-number-bounce': isQuantityBouncing }"
                                 @click="showExpandedControls">
                                {{ cardQuantity }}
                            </button>
                        </div>
                    </template>
                    <div v-else class="w-full flex justify-between items-center">
                        <button class="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-tsb-four hover:text-red-400 hover:border-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-all duration-300" type="button"
                                @click="decrement">
                            -
                        </button>
                        <span class="text-sm font-semibold text-red-700" :class="{ 'animate-number-bounce': isQuantityBouncing }">{{ cardQuantity }}</span>
                        <button class="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-tsb-four hover:text-red-400 hover:border-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-all duration-300" type="button"
                                @click="increment">
                            +
                        </button>
                    </div>
                </div>
                <div v-else class="flex justify-center text-sm text-gray-600 mt-1">{{ $t('menu.unavailable') }}</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {useCartStore} from "@/stores/cart";
import {formatPrice} from "~/lib/price";
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import type {Product} from "@/types";
import {useRuntimeConfig} from "#imports";
import {useTracking} from "~/composables/useTracking";
import {eventBus} from "~/eventBus";
import { useI18n } from 'vue-i18n'

const cartStore = useCartStore();
useI18n()
const config = useRuntimeConfig();
const { trackEvent } = useTracking();

const props = defineProps<{
    index: number;
    product: Product;
    orderingDisabled?: boolean;
}>();

const emit = defineEmits(['openProductModal']);

const showControls = ref(false);
const timeoutId = ref<NodeJS.Timeout | null>(null);

// Clear timeout when component unmounts
onUnmounted(() => {
    if (timeoutId.value) {
        clearTimeout(timeoutId.value);
    }
});

const hasChoices = computed(() => props.product.choices?.length > 0);

const isInCart = computed(() => {
    return cartStore.products.some(
        (cartItem) => cartItem.product.id === props.product.id
    );
});

const cardQuantity = computed(() => {
    return cartStore.products
        .filter((cartItem) => cartItem.product.id === props.product.id)
        .reduce((sum, item) => sum + item.quantity, 0);
});

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
    cartStore.incrementQuantity(props.product);
    trackEvent('product_added_to_cart', {
        product_id: props.product.id,
        product_name: props.product.name,
        price: props.product.price,
        quantity: 1,
        source: 'card',
    });
    eventBus.emit('cart-item-added', {
        productName: props.product.name,
        productId: props.product.id,
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
    cartStore.decrementQuantity(props.product);
    resetTimeout();
};

const increment = () => {
    cartStore.incrementQuantity(props.product);
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

// Track whether the image has loaded
const loaded = ref(false);

onMounted(() => {
    if (imageElement.value) {
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
