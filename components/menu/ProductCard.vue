<template>
  <div v-if="product" :key="product.id"
    class="relative max-w-[200px] w-full h-[260px] bg-white border-2 rounded-xl shadow-md flex flex-col p-2 overflow-hidden">
    <!-- Product Image -->
    <div class="flex justify-center items-center h-1/2 p-4 cursor-pointer" @contextmenu.prevent>
      <picture class="w-full h-full flex justify-center items-center">
        <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.avif`" type="image/avif" />
        <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.webp`" type="image/webp" />
        <img :src="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.png`" :alt="product.name"
          class="object-contain max-h-full transition-opacity duration-500"
          :class="loaded ? 'opacity-100' : 'opacity-0'" :draggable="false" :loading="index > 5 ? 'lazy' : 'eager'"
          :fetchpriority="index < 6 ? 'high' : 'low'" ref="imageElement" />
      </picture>
    </div>
    <!-- Product Details -->
    <div class="flex-1 flex flex-col justify-between p-2">
      <div class="flex flex-col items-center mb-2">
        <!-- Category Name -->
        <span class="text-gray-500 font-medium text-xs mb-1 truncate">
          {{ product.category?.name }}
        </span>

        <!-- Product Name -->
        <span class="text-black font-semibold text-sm truncate mb-1">
          {{ product.name }}
        </span>

        <!-- Pieces -->
        <span class="text-gray-500 text-xs mb-1">
          {{ product?.pieces }} {{ product?.pieces ? product?.pieces > 1 ? $t('menu.pieces') : $t('menu.piece') : "" }}
        </span>
      </div>

      <!-- Price and Cart Controls -->
      <div class="flex justify-between items-center mx-2">
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
            <button v-if="!isInCart" @click="addToCart" type="button"
              class="flex items-center justify-center w-10 h-10 text-black border border-gray-300 rounded-xl bg-tsb-two focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Add to Cart">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" class="w-5 h-5 fill-current">
                <path fill-rule="evenodd" clip-rule="evenodd"
                  d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z" />
              </svg>
            </button>

            <!-- Quantity Display -->
            <!-- Make it clickable so that when user clicks, the expanded controls show -->
            <div v-else
              class="flex items-center justify-center w-10 h-10 text-black font-semibold border border-gray-300 bg-tsb-four rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-50"
              @click="showExpandedControls">
              {{ cardQuantity }}
            </div>
          </div>
        </template>

        <!-- Expanded Controls -->
        <div v-else class="w-full flex justify-between items-center">
          <button @click="decrement" type="button"
            class="flex items-center justify-center w-10 h-10 text-gray-700 border border-gray-300 rounded-xl bg-tsb-two focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-50">
            -
          </button>

          <span class="text-sm font-semibold text-gray-700">
            {{ cardQuantity }}
          </span>

          <button @click="increment" type="button"
            class="flex items-center justify-center w-10 h-10 text-gray-700 border border-gray-300 rounded-xl bg-tsb-two focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-50">
            +
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "~/lib/price";
import { computed, ref, onUnmounted, onMounted } from "vue";
import type { Product } from "@/types";
import { useRuntimeConfig } from "#imports";

const cartStore = useCartStore();
const config = useRuntimeConfig();

const props = defineProps<{
  index: number;
  product: Product;
}>();

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