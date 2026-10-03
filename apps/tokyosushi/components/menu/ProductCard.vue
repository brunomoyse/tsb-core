<template>
  <!-- An unavailable product stays openable (details, allergens): only the add control is gone, see below. -->
  <div :class="{ grayscale: !product.isAvailable }" class="h-full">
    <div
      v-if="product"
      :key="product.id"
      ref="cardRef"
      data-testid="product-card"
      :data-product-id="product.id"
      :data-has-choices="hasChoices"
      class="isolate min-w-0 md:max-w-[185px] w-full h-full min-h-[260px] bg-white border border-neutral-100 rounded-xl shadow-sm flex flex-col p-2 transition-all duration-300 hover:shadow-md"
    >
      <!-- Product Image (flexible: grows/shrinks to fill remaining space) -->
      <div
        class="flex-1 min-h-0 flex justify-center items-center p-2 cursor-pointer relative"
        @contextmenu.prevent
        @click="emit('openProductModal')"
      >
        <!-- Dietary badges -->
        <div
          v-if="product.isHalal || product.isVegetarian || product.isSpicy"
          class="absolute top-1 right-1 z-10 flex flex-col gap-0.5"
        >
          <DietBadge v-if="product.isHalal" kind="halal" />
          <DietBadge v-if="product.isVegetarian" kind="vegetarian" />
          <DietBadge v-if="product.isSpicy" kind="spicy" />
        </div>
        <!-- Lunch-only ribbon (Mon–Fri lunch service) -->
        <div
          v-if="product.isLunchOnly"
          class="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded-md bg-tsb-four text-primary-700 text-[10px] font-semibold uppercase tracking-wide"
          :title="$t('menu.lunchOnly')"
        >
          {{ $t('menu.lunchOnlyShort') }}
        </div>
        <!-- Placeholder behind the image: a flat tint from the server render on (so without JavaScript, or before hydration, a transparent cut-out never sits on a moving gradient); it only starts shimmering once mounted, and is removed when the image has loaded. -->
        <div
          v-if="!loaded"
          class="absolute inset-0 rounded-lg bg-gray-100"
          :class="{ 'animate-shimmer': isMounted }"
          :style="
            isMounted
              ? 'background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%;'
              : undefined
          "
        />
        <!-- Visible from the first paint, with or without JavaScript (it used to be opacity-0 until onMounted saw it loaded, which kept it out of the LCP): the shimmer is only a background behind it, hence "relative" so the image paints over it. -->
        <picture class="relative w-full h-full flex justify-center items-center">
          <source :srcset="`${productImageBaseSrc}.avif`" type="image/avif" />
          <source :srcset="`${productImageBaseSrc}.webp`" type="image/webp" />
          <img
            ref="imageElement"
            :alt="product.name"
            width="185"
            height="130"
            :class="!product.isAvailable ? 'grayscale' : ''"
            :draggable="false"
            :fetchpriority="imagePriority.fetchpriority"
            :loading="imagePriority.loading"
            :src="`${productImageBaseSrc}.png`"
            class="object-contain max-h-full"
            @error="handleImageError"
          />
        </picture>
      </div>

      <!-- Product Details (fixed size: does not grow) -->
      <div class="shrink-0 px-1 sm:px-2 pb-1">
        <!-- Text block: fixed height so price always aligns across cards -->
        <div class="min-h-[76px] flex flex-col items-center">
          <span
            translate="no"
            class="text-neutral-600 font-medium text-xs mb-0.5 max-w-full truncate"
          >
            {{ product.category?.name }}
          </span>
          <!-- The name is the keyboard-reachable way into the details modal. -->
          <button
            type="button"
            aria-haspopup="dialog"
            data-testid="product-name"
            translate="no"
            class="relative max-w-full -my-2 py-2 text-black font-semibold text-sm text-center mb-0.5 rounded-md hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-300"
            :title="product.name"
            :aria-label="$t('menu.viewDetails', { name: product.name })"
            @click="emit('openProductModal')"
          >
            <!-- The clamp sits on an inner box: line-clamp on the padded button clipped half of a third line. -->
            <span class="line-clamp-2 break-words hyphens-auto">{{ product.name }}</span>
          </button>
          <span class="text-neutral-600 text-xs text-center">
            <template v-if="product?.pieceCount"
              >{{ product.pieceCount }}
              {{ product.pieceCount > 1 ? $t('menu.pcs') : $t('menu.pc') }}</template
            >
            <template v-for="(group, idx) in forcedChoiceGroups" :key="group.id">
              {{ product?.pieceCount || idx > 0 ? ' + ' : '' }}{{ forcedChoiceGroupLabel(group) }}
            </template>
          </span>
        </div>

        <!-- Price and Cart Controls -->
        <div
          v-if="product.isAvailable"
          ref="controlsRef"
          class="flex flex-wrap justify-between items-center gap-x-1 gap-y-1 mt-1"
        >
          <template v-if="!stepperOpen">
            <span class="whitespace-nowrap text-black font-semibold text-base tabular-nums">
              {{ formatPrice(product.price) }}
            </span>
            <div class="ml-auto">
              <button
                v-if="!isInCart"
                ref="addButtonRef"
                :aria-label="$t('cart.addNamed', { name: product.name })"
                data-testid="product-add-to-cart"
                class="flex items-center justify-center w-11 h-11 rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-tsb-four hover:text-primary-400 hover:border-primary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                :disabled="orderingDisabled"
                @click="addToCart"
              >
                <img alt="" aria-hidden="true" class="w-6 h-6" src="/icons/shopping-bag-icon.svg" />
              </button>
              <button
                v-else
                ref="countButtonRef"
                class="flex items-center justify-center w-11 h-11 rounded-xl bg-tsb-four text-primary-700 font-semibold border border-primary-200 hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-300 cursor-pointer"
                type="button"
                :aria-label="$t('cart.inCartNamed', { name: product.name, count: cardQuantity })"
                :class="{ 'animate-number-bounce': isQuantityBouncing }"
                @click="showExpandedControls"
              >
                {{ cardQuantity }}
              </button>
            </div>
          </template>
          <QuantityStepper
            v-else
            ref="stepperRef"
            class="w-full"
            :name="product.name"
            :value="cardQuantity"
            :bounce="isQuantityBouncing"
            :inc-disabled="cardQuantity >= MAX_ITEM_QUANTITY"
            @decrement="decrement"
            @increment="increment"
          />
        </div>
        <div v-else class="flex justify-center text-sm text-neutral-600 mt-1">
          {{ $t('menu.unavailable') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { MAX_ITEM_QUANTITY, useCartStore } from '#engine/stores/cart'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useEventBus, useIntersectionObserver, useMounted } from '@vueuse/core'
import type { Product } from '#engine/types'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatPrice } from '#engine/lib/price'
import { menuImagePriority } from '#engine/utils/menuImagePriority'
import { useCartRemoval } from '#engine/composables/useCartRemoval'
import { useHaptics } from '#engine/composables/useHaptics'
import { brand } from '#brand/brand'
import { choiceGroupCountLabel, choiceGroupLabelKey } from '#engine/utils/choiceGroupLabel'
import { useI18n } from 'vue-i18n'
import { useRuntimeConfig } from '#imports'
import { useTracking } from '#engine/composables/useTracking'

const cartItemAdded = useEventBus(cartItemAddedKey)
const cartStore = useCartStore()
const { decrementProduct } = useCartRemoval()
const { t } = useI18n()
const config = useRuntimeConfig()
const { trackEvent } = useTracking()
const { impact } = useHaptics()

const { index, product, orderingDisabled } = defineProps<{
  index: number
  product: Product
  orderingDisabled?: boolean
}>()

const emit = defineEmits<{
  openProductModal: []
}>()

// Image loading follows the card's place on the whole page (see utils/menuImagePriority.ts), not in its category.
const imagePriority = computed(() => menuImagePriority(index))

const hasChoices = computed(() => product.choices?.length > 0)

const forcedChoiceGroups = computed(() =>
  (product.choiceGroups ?? [])
    .filter((g) => g.minSelections > 0)
    .toSorted((a, b) => a.sortOrder - b.sortOrder),
)

// A brand label for the category ("2 soupes") wins; else the catalog's group name, with its option count for a pick-one group.
const forcedChoiceGroupLabel = (group: {
  name: string
  maxSelections: number
  choices?: { id: string }[]
}) => {
  const key = choiceGroupLabelKey(
    brand.choiceGroupLabels,
    product.category?.slug,
    group.maxSelections,
  )
  return key
    ? `${group.maxSelections} ${t(key).toLowerCase()}`
    : choiceGroupCountLabel(group.name, group.maxSelections, group.choices?.length ?? 0)
}
const { handleProductImageError } = productImage
const productImageBaseSrc = computed(() =>
  productImage.productImageBase(config.public.s3bucketUrl, product?.id),
)

// SSR-safe: cart store hydrates from localStorage post-mount, so render as empty until then.
const isMounted = useMounted()

const isInCart = computed(
  () =>
    isMounted.value && cartStore.products.some((cartItem) => cartItem.product.id === product.id),
)

const cardQuantity = computed(() =>
  isMounted.value
    ? cartStore.products
        .filter((cartItem) => cartItem.product.id === product.id)
        .reduce((sum, item) => sum + item.quantity, 0)
    : 0,
)

// Expanded "- n +" stepper. It stays open while the product is in the cart (no auto-collapse: it used to close after
// 4 s, even under a keyboard user's focus, and hid the only way to decrement).
const showControls = ref(false)
const stepperOpen = computed(() => showControls.value && isInCart.value)
watch(isInCart, (inCart) => {
  if (!inCart) showControls.value = false
})

/* The controls swap (add button -> stepper -> add button) destroys the focused element. When focus was on the control being
   replaced, move it to its successor: the "+" of a new stepper, the add button when the stepper goes away. */
const controlsRef = ref<HTMLElement | null>(null)
const addButtonRef = ref<HTMLElement | null>(null)
const countButtonRef = ref<HTMLElement | null>(null)
const stepperRef = ref<{ focusIncrement: () => void } | null>(null)
const controlState = computed(() =>
  isInCart.value ? (stepperOpen.value ? 'stepper' : 'count') : 'add',
)
watch(controlState, async (state) => {
  // Runs before the DOM is patched, so the old control still has focus here.
  if (!controlsRef.value?.contains(document.activeElement)) return
  await nextTick()
  if (state === 'stepper') stepperRef.value?.focusIncrement()
  else (state === 'add' ? addButtonRef : countButtonRef).value?.focus()
})

const isQuantityBouncing = ref(false)
watch(cardQuantity, () => {
  if (cardQuantity.value > 0) {
    isQuantityBouncing.value = true
    setTimeout(() => {
      isQuantityBouncing.value = false
    }, 200)
  }
})

const addToCart = () => {
  if (hasChoices.value) {
    emit('openProductModal')
    return
  }
  impact('Light')
  cartStore.incrementQuantity(product)
  trackEvent('product_added_to_cart', {
    product_id: product.id,
    product_name: product.name,
    price: product.price,
    quantity: 1,
    source: 'card',
  })
  cartItemAdded.emit({
    productName: product.name,
    productId: product.id,
  })

  showControls.value = true
}

const showExpandedControls = () => {
  if (hasChoices.value) {
    emit('openProductModal')
    return
  }
  // Show the expanded - + UI when the user clicks on the existing quantity
  showControls.value = true
}

const decrement = () => {
  // The last unit is a removal like on every other cart surface: it offers Undo.
  decrementProduct(product)
}

const increment = () => {
  cartStore.incrementQuantity(product)
}

// Define the ref with the correct type (HTMLImageElement)
const imageElement = ref<HTMLImageElement | null>(null)

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
const loaded = ref(false)
const handleImageError = (event: Event) => {
  handleProductImageError(event)
  loaded.value = true
}

onMounted(() => {
  if (imageElement.value) {
    productImage.ensureProductImageFallback(imageElement.value)

    // Check if the image is already loaded (e.g., cached)
    if (imageElement.value.complete) {
      loaded.value = true
    } else {
      // Wait for the image to load
      imageElement.value.addEventListener('load', () => {
        loaded.value = true
      })
    }
  }
})
</script>
