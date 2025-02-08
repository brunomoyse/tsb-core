<template>
    <div
        class="relative max-w-[200px] w-full h-[260px] bg-white border-2 rounded-xl shadow-md flex flex-col p-2 overflow-hidden">
        <!-- Product Image -->
        <div class="flex justify-center items-center h-1/2 p-4">
            <picture class="w-full h-full flex justify-center items-center">
                <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.avif`"
                    type="image/avif" />
                <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.webp`"
                    type="image/webp" />
                <img :src="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.png`" :alt="product.name"
                    class="object-contain max-h-full" :draggable="false" :loading="index > 5 ? 'lazy' : 'eager'"
                    :fetchpriority="index < 6 ? 'high' : 'low'" />
            </picture>
        </div>

        <!-- Product Details -->
        <div class="flex-1 flex flex-col justify-between p-2">
            <div class="flex flex-col items-center mb-2">
                <!-- Category Name -->
                <span class="text-gray-500 font-medium text-xs mb-1 truncate">
                    {{ product.category.name }}
                </span>

                <!-- Product Name -->
                <span class="text-black font-semibold text-sm truncate mb-1">
                    {{ product.name }}
                </span>

                <!-- Category Name -->
                <span class="text-gray-500 text-xs mb-1">
                    {{ product?.pieces}} {{  product?.pieces > 1 ? 'pcs' : 'pc' }}
                </span>
            </div>

            <!-- Price and Cart Controls -->
            <div class="flex justify-between items-center mx-2">
                <!-- Price -->
                <div>
                    <span class="text-black font-semibold text-sm">
                        {{ formatPrice(product.price) }}
                    </span>
                </div>

                <!-- Cart Controls -->
                <div>
                    <!-- Add to Cart Button -->
                    <button @click="addToCart" type="button"
                        class="flex items-center justify-center w-10 h-10 text-gray-700 border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Add to Cart">
                        <!-- Enlarged Cart SVG Icon -->
                        <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" class="w-5 h-5 fill-current">
                            <path fill-rule="evenodd" clip-rule="evenodd"
                                d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z">
                            </path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "~/lib/price";
import { computed } from "vue";
import type { ProductInfo } from "@/types";

const config = useRuntimeConfig();
const cartStore = useCartStore();

const props = defineProps<{
    index: number;
    product: ProductInfo;
}>();

// Computed property to check if the product is in the cart
const isInCart = computed(() => {
    return cartStore.products.some(item => item.product.id === props.product.id);
});

// Computed property to get the quantity of the product in the cart
const cardQuantity = computed(() => {
    const cartItem = cartStore.products.find(item => item.product.id === props.product.id);
    return cartItem ? cartItem.quantity : 0;
});

// Function to add the product to the cart
const addToCart = () => {
    cartStore.addToCart(props.product);
};

</script>
