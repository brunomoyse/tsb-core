<template>
    <div :class="{ 'pointer-events-none grayscale': !product.isAvailable }" class="h-full">
        <div v-if="product" :key="product.id"
             ref="cardRef"
             data-testid="product-card"
             :data-product-id="product.id"
             :data-has-choices="hasChoices"
             class="card card-interactive w-full h-full min-h-[260px] flex flex-col">
            <!-- Product Image (flexible: grows/shrinks to fill remaining space) -->
            <div class="flex-1 min-h-0 flex justify-center items-center p-3 bg-ygf-orange-50/40 cursor-pointer relative" @contextmenu.prevent @click="emit('openProductModal')">
                <!-- Dietary badges -->
                <div v-if="product.isHalal || product.isVegetarian || product.isSpicy" class="absolute top-1 right-1 z-10 flex flex-col gap-0.5">
                    <div v-if="product.isHalal" class="w-5 h-5 flex items-center justify-center rounded-full bg-blue-50 text-blue-700" role="img" :aria-label="$t('menu.halal')" :title="$t('menu.halal')">
                        <img
                            src="https://api.iconify.design/hugeicons/halal.svg?color=%231d4ed8"
                            alt=""
                            aria-hidden="true"
                            class="w-3 h-3"
                        />
                    </div>
                    <div v-if="product.isVegetarian" class="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500" role="img" :aria-label="$t('menu.vegetarian')" :title="$t('menu.vegetarian')">
                        <svg aria-hidden="true" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/>
                            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                        </svg>
                    </div>
                    <div v-if="product.isSpicy" class="w-5 h-5 flex items-center justify-center rounded-full bg-ygf-orange-50 text-ygf-orange-500" role="img" :aria-label="$t('menu.spicy')" :title="$t('menu.spicy')">
                        <svg aria-hidden="true" class="w-3 h-3" viewBox="720 640 640 820" fill="currentColor" fill-rule="evenodd">
                            <path d="M1311 1195C1286 1323 1155 1418 1038 1415C927 1413 813 1323 788 1195C748 986 1048 910 934 666C934 666 1097 737 1171 933C1197 943 1208 873 1176 833C1308 942 1327 1112 1311 1195ZM934 1336C945 1393 1003 1435 1055 1434C1105 1433 1156 1393 1167 1336C1185 1243 1051 1209 1102 1099C1102 1099 1029 1131 996 1219C984 1223 979 1192 994 1174C935 1223 926 1299 934 1336Z"/>
                        </svg>
                    </div>
                </div>
                <!-- Lunch-only ribbon (Mon–Fri lunch service) -->
                <div v-if="product.isLunchOnly" class="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded-md bg-ygf-orange-100 text-ygf-orange-700 text-[10px] font-semibold uppercase tracking-wide" :title="$t('menu.lunchOnly')">
                    {{ $t('menu.lunchOnlyShort') }}
                </div>
                <!-- Shimmer placeholder -->
                <div v-if="!loaded && !brandPhoto"
                     class="absolute inset-0 animate-shimmer rounded-lg"
                     style="background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%;"
                />
                <!-- Official bowl photography for the malatang sets; other
                     products keep the dashboard-uploaded S3 image. Cut-outs
                     sit on the tinted surface; full-frame shots fill the card. -->
                <MktPicture
                    v-if="brandPhoto"
                    :src="brandPhoto.base"
                    :widths="brandPhoto.widths ?? PRODUCT_PHOTO_WIDTHS"
                    :fallback-width="brandPhoto.fallbackWidth ?? 560"
                    :alt="product.name"
                    sizes="(min-width: 640px) 300px, 45vw"
                    :img-class="brandPhoto.cover
                        ? `w-full h-full object-cover rounded-lg ${!product.isAvailable ? 'grayscale' : ''}`
                        : `object-contain max-h-full ${!product.isAvailable ? 'grayscale' : ''}`"
                    :class="brandPhoto.cover ? 'absolute inset-3' : undefined"
                />
                <picture v-if="!brandPhoto" class="w-full h-full flex justify-center items-center">
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
            <div class="shrink-0 px-3 pb-3 pt-1">
                <!-- Text block: fixed height so price always aligns across cards.
                     The category name that used to sit above the title is gone —
                     these cards only ever render inside their own category
                     section, so it repeated the heading on every tile. -->
                <div class="min-h-[52px] flex flex-col">
                    <span
                        data-testid="product-name"
                        translate="no"
                        class="text-ygf-black font-semibold text-sm leading-snug line-clamp-2"
                        :title="product.name"
                    >
                      {{ product.name }}
                    </span>
                    <span class="text-ygf-black/55 text-xs mt-0.5">
                      <template v-if="product?.pieceCount">{{ product.pieceCount }} {{ product.pieceCount > 1 ? $t('menu.pcs') : $t('menu.pc') }}</template>
                      <template v-for="(group, idx) in forcedChoiceGroups" :key="group.id">
                        {{ (product?.pieceCount || idx > 0) ? ' + ' : '' }}{{ forcedChoiceGroupLabel(group) }}
                      </template>
                    </span>
                </div>

                <!-- Price and cart controls. The stepper stays visible once the
                     item is in the cart: the inherited control collapsed itself
                     after 4s, which hid the only way to decrement. -->
                <div v-if="product.isAvailable" class="flex justify-between items-center gap-2 mt-2">
                    <span class="text-ygf-black font-bold text-base tabular-nums">
                      {{ formatPrice(product.price) }}
                    </span>

                    <button
                        v-if="!isInCart"
                        :aria-label="$t('cart.addToCart')"
                        data-testid="product-add-to-cart"
                        type="button"
                        class="inline-flex items-center justify-center w-11 h-11 rounded-full border border-ygf-orange-200 bg-white text-ygf-orange-800 hover:bg-ygf-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="orderingDisabled"
                        @click="addToCart"
                    >
                        <img alt="" aria-hidden="true" class="w-5 h-5" src="/icons/shopping-bag-icon.svg"/>
                    </button>

                    <div v-else class="stepper">
                        <button
                            type="button"
                            class="stepper-btn"
                            :aria-label="$t('cart.decreaseQty')"
                            @click="decrement"
                        >&minus;</button>
                        <span class="stepper-value text-sm" :class="{ 'animate-number-bounce': isQuantityBouncing }">{{ cardQuantity }}</span>
                        <button
                            type="button"
                            class="stepper-btn"
                            :aria-label="$t('cart.increaseQty')"
                            :disabled="cardQuantity >= MAX_ITEM_QUANTITY"
                            @click="increment"
                        >+</button>
                    </div>
                </div>
                <div v-else class="text-sm text-ygf-black/55 mt-2">{{ $t('menu.unavailable') }}</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { MAX_ITEM_QUANTITY, useCartStore } from '#engine/stores/cart'
import { PRODUCT_PHOTO_WIDTHS, productPhoto } from '~/data/productPhotos'
import { computed, onMounted, ref, watch } from 'vue'
import MktPicture from '~/components/mkt/MktPicture.vue'
import { useEventBus, useIntersectionObserver, useMounted } from '@vueuse/core'
import type { Product } from '#engine/types'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatPrice } from '#engine/lib/price'
import { useHaptics } from '#engine/composables/useHaptics'
import { useRuntimeConfig } from '#imports'
import { useTracking } from '#engine/composables/useTracking'

const cartItemAdded = useEventBus(cartItemAddedKey)
const cartStore = useCartStore();
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

const hasChoices = computed(() => product.choices?.length > 0);

const forcedChoiceGroups = computed(() =>
    (product.choiceGroups ?? [])
        .filter((g) => g.minSelections > 0)
        .toSorted((a, b) => a.sortOrder - b.sortOrder),
);

/**
 * Card-subtitle label for a required choice group. Pick-one groups show how
 * many options there are to choose from — "niveau de piquant (3)" — because
 * "1 niveau de piquant" read as if the set had a single fixed spice level.
 * Multi-select groups keep the pick count ("20 ingrédients"). Group names are
 * DB translations, so option counts are appended rather than pluralised.
 */
const forcedChoiceGroupLabel = (group: { name: string; maxSelections: number; choices?: { id: string }[] }) => {
    const name = group.name.toLowerCase();
    if (group.maxSelections === 1) {
        const options = group.choices?.length ?? 0;
        return options > 1 ? `${name} (${options})` : name;
    }
    return `${group.maxSelections} ${name}`;
};
const { handleProductImageError } = productImage
const productImageBaseSrc = computed(() => productImage.productImageBase(config.public.s3bucketUrl, product?.id));
const brandPhoto = computed(() => productPhoto(product?.slug));

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
};

const decrement = () => {
    cartStore.decrementQuantity(product);
};

const increment = () => {
    cartStore.incrementQuantity(product);
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
