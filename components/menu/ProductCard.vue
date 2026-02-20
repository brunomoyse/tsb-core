<template>
    <div :class="{ 'pointer-events-none opacity-50': !product.isAvailable }">
        <div v-if="product" :key="product.id"
             class="min-w-[140px] max-w-[185px] w-full h-[260px]  bg-white border-2 rounded-xl shadow-md flex flex-col p-2 overflow-hidden">
            <!-- Product Image -->
            <div class="flex justify-center items-center h-1/2 p-4 cursor-pointer" @contextmenu.prevent @click="emit('openProductModal')">
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
            <!-- Product Details -->
            <div class="flex-1 flex flex-col p-2" :class="{ 'justify-between': product.isAvailable }">
                <div class="flex flex-col items-center mb-2">
                    <!-- Category Name -->
                    <span class="text-gray-500 font-medium text-xs mb-1 truncate">
                      {{ product.category?.name }}
                    </span>

                    <!-- Product Name -->
                    <span
                        class="text-black font-semibold text-sm line-clamp-2 text-center mb-1"
                        :title="product.name"
                    >
                      {{ product.name }}
                    </span>

                    <!-- Pieces -->
                    <span class="text-gray-500 text-xs mb-1">
                      {{ product?.pieceCount }}
                        {{ product?.pieceCount ? product?.pieceCount > 1 ? $t('menu.pcs') : $t('menu.pc') : "" }}
                    </span>
                </div>

                <!-- Price and Cart Controls -->
                <div v-if="product.isAvailable" class="flex justify-between items-center mx-2">
                    <!-- If NOT showing expanded controls -->
                    <template v-if="!showControls">
                        <!-- Price -->
                        <div>
                            <span class="text-black font-semibold text-sm">
                              {{ formatPrice(product.price) }}
                            </span>
                        </div>

                        <!-- Cart Controls -->
                        <div>
                            <!-- Add to Cart Button -->
                            <button v-if="!isInCart" aria-label="Add to Cart" class="flex items-center justify-center w-10 h-10 text-black border border-gray-300 rounded-xl bg-tsb-two focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-50"
                                    type="button"
                                    @click="addToCart">
                                <img alt="Cart Icon" class="w-6 h-6" src="/icons/shopping-bag-icon.svg"/>
                            </button>

                            <!-- Quantity Display -->
                            <!-- Make it clickable so that when user clicks, the expanded controls show -->
                            <div v-else
                                 class="flex items-center justify-center w-10 h-10 text-gray-800 font-semibold border-2 border-red-500 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-50"
                                 @click="showExpandedControls">
                                {{ cardQuantity }}
                            </div>
                        </div>
                    </template>

                    <!-- Expanded Controls -->
                    <div v-else class="w-full flex justify-between items-center">
                        <button class="flex items-center justify-center w-10 h-10 text-gray-700 border border-gray-300 rounded-xl bg-tsb-two focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-50" type="button"
                                @click="decrement">
                            -
                        </button>

                        <span class="text-sm font-semibold text-gray-700">
                {{ cardQuantity }}
              </span>

                        <button class="flex items-center justify-center w-10 h-10 text-gray-700 border border-gray-300 rounded-xl bg-tsb-two focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-50" type="button"
                                @click="increment">
                            +
                        </button>
                    </div>
                </div>

                <div v-else class="flex self-center text-sm text-gray-500">{{ $t('menu.unavailable') }}</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {useCartStore} from "@/stores/cart";
import {formatPrice} from "~/lib/price";
import {computed, onMounted, onUnmounted, ref} from "vue";
import type {Product} from "@/types";
import {useRuntimeConfig} from "#imports";
import {useTracking} from "~/composables/useTracking";
import {eventBus} from "~/eventBus";
import {useI18n} from "vue-i18n";

const cartStore = useCartStore();
const config = useRuntimeConfig();
const { trackEvent } = useTracking();
const { t } = useI18n();

const props = defineProps<{
    index: number;
    product: Product;
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

const isInCart = computed(() => {
    return cartStore.products.some(
        (cartItem) => cartItem.product.id === props.product.id
    );
});

const cardQuantity = computed(() => {
    const cartItem = cartStore.products.find(
        (cartItem) => cartItem.product.id === props.product.id
    );
    return cartItem ? cartItem.quantity : 0;
});

const addToCart = () => {
    cartStore.incrementQuantity(props.product);
    trackEvent('product_added_to_cart', {
        product_id: props.product.id,
        product_name: props.product.name,
        price: props.product.price,
        quantity: 1,
        source: 'card',
    });
    eventBus.emit('notify', {
        message: t('notify.addedToCart', { product: props.product.name }),
        duration: 2000,
        variant: 'success',
    });
    showControls.value = true;
    resetTimeout();
};

const showExpandedControls = () => {
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
    }, 2000);
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
<style>
.transition-opacity {
    transition: opacity 0.8s ease;
}

.opacity-0 {
    opacity: 0;
}

.opacity-100 {
    opacity: 1;
}
</style>
