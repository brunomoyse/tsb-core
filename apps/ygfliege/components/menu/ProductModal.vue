<template>
  <div
    ref="modalRef"
    role="dialog"
    aria-modal="true"
    aria-labelledby="product-modal-title"
    data-testid="product-modal"
    class="bg-white w-full h-full sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-ygf-lg shadow-ygf-lg flex flex-col overflow-hidden"
    @click.stop
  >
    <!-- Header -->
    <header
      class="flex items-start justify-between gap-4 px-5 py-4 sm:px-8 sm:py-6 border-b border-ygf-orange-100 bg-ygf-orange-50/60"
    >
      <div class="min-w-0">
        <span v-if="p?.category?.name" translate="no" class="section-label">{{
          p.category.name
        }}</span>
        <h2
          id="product-modal-title"
          translate="no"
          class="section-title text-xl sm:text-2xl truncate"
        >
          {{ p?.name }}
        </h2>
      </div>
      <button
        type="button"
        :aria-label="$t('common.close')"
        class="shrink-0 w-11 h-11 -mr-2 -mt-1 inline-flex items-center justify-center rounded-full text-neutral-600 hover:text-ygf-black hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        @click="emit('close')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </header>

    <!-- Body -->
    <div v-if="p" class="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 space-y-8">
      <div class="grid sm:grid-cols-[220px_minmax(0,1fr)] gap-5 sm:gap-8 items-start">
        <!-- Product photo (click to enlarge) -->
        <button
          type="button"
          class="relative block w-44 sm:w-full mx-auto sm:mx-0 aspect-square bg-ygf-orange-50/40 rounded-ygf-card overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          :aria-label="$t('common.viewPhoto', { name: p.name })"
          aria-haspopup="dialog"
          @click="openLightbox(p.id, p.name)"
        >
          <!-- Official bowl photography for the malatang sets; other
                         products keep the dashboard-uploaded S3 image. -->
          <MktPicture
            v-if="brandPhoto"
            :src="brandPhoto.base"
            :widths="brandPhoto.widths ?? PRODUCT_PHOTO_WIDTHS"
            :fallback-width="brandPhoto.fallbackWidth ?? 560"
            :fallback-height="brandPhoto.fallbackHeight ?? brandPhoto.fallbackWidth ?? 560"
            :alt="p.name"
            sizes="(min-width: 640px) 220px, 176px"
            :img-class="
              brandPhoto.cover
                ? `w-full h-full object-cover ${!p.isAvailable ? 'grayscale' : ''}`
                : `object-contain w-full h-full p-4 ${!p.isAvailable ? 'grayscale' : ''}`
            "
            :class="brandPhoto.cover ? 'absolute inset-0' : undefined"
          />
          <picture v-else class="w-full h-full flex justify-center items-center p-4">
            <source :srcset="`${productImageBaseSrc}.avif`" type="image/avif" />
            <source :srcset="`${productImageBaseSrc}.webp`" type="image/webp" />
            <img
              ref="imageElement"
              :alt="p.name"
              :src="`${productImageBaseSrc}.png`"
              class="object-contain w-full h-full transition-opacity duration-slow"
              :class="[!p.isAvailable ? 'grayscale' : '']"
              @error="handleProductImageError"
            />
          </picture>
        </button>

        <div class="space-y-4 min-w-0">
          <!-- Price + portion -->
          <div class="flex items-baseline gap-3 flex-wrap">
            <span class="text-2xl font-bold text-ygf-black tabular-nums">{{
              formatCents(displayPriceCents)
            }}</span>
            <span v-if="p.pieceCount" class="text-sm text-neutral-600">
              {{ p.pieceCount }} {{ p.pieceCount > 1 ? $t('menu.pcs') : $t('menu.pc') }}
            </span>
          </div>

          <!-- Dietary badges -->
          <div
            v-if="p.isHalal || p.isVegetarian || p.isSpicy || p.isLunchOnly || p.isDiscountable"
            class="flex gap-2 flex-wrap"
          >
            <span
              v-if="p.isHalal"
              class="chip chip-static !bg-blue-50 !border-blue-200 !text-blue-800"
            >
              <DietIcon kind="halal" class="w-3.5 h-3.5" />
              {{ $t('menu.halal') }}
            </span>
            <span
              v-if="p.isVegetarian"
              class="chip chip-static !bg-emerald-50 !border-emerald-200 !text-emerald-800"
            >
              <DietIcon kind="vegetarian" class="w-3.5 h-3.5" />
              {{ $t('menu.vegetarian') }}
            </span>
            <span
              v-if="p.isSpicy"
              class="chip chip-static !bg-ygf-orange-50 !border-ygf-orange-200 !text-ygf-orange-800"
            >
              <DietIcon kind="spicy" class="w-3.5 h-3.5" />
              {{ $t('menu.spicy') }}
            </span>
            <span
              v-if="p.isLunchOnly"
              class="chip chip-static !bg-ygf-orange-50 !border-ygf-orange-200 !text-ygf-orange-800"
            >
              {{ $t('menu.lunchOnly') }}
            </span>
            <span
              v-if="p.isDiscountable"
              class="chip chip-static !bg-emerald-50 !border-emerald-200 !text-emerald-800"
            >
              {{ $t('menu.pickupDiscountBadge', policyParams) }}
            </span>
          </div>

          <!-- Description -->
          <p v-if="p.description" class="text-sm leading-relaxed text-ygf-black/70">
            {{ p.description }}
          </p>
        </div>
      </div>

      <!-- Choice groups — same picker as the bowl composer, so the fixed
                 sets show the official broth cards and spice chips too. -->
      <section
        v-for="(group, index) in choiceGroups"
        :key="group.id"
        :aria-labelledby="`product-modal-group-${group.id}`"
        class="space-y-4"
      >
        <div class="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <span v-if="choiceGroups.length > 1" class="section-label">{{
              $t('composer.stepOf', { n: index + 1, total: choiceGroups.length })
            }}</span>
            <h3
              :id="`product-modal-group-${group.id}`"
              translate="no"
              class="section-title text-lg"
            >
              {{ group.name }}
            </h3>
          </div>
          <p
            class="text-sm font-semibold"
            :class="isGroupSatisfied(group) ? 'text-ygf-success-dark' : 'text-ygf-orange-text'"
          >
            <template v-if="!isGroupSatisfied(group)">{{ groupHint(group) }}</template>
            <template v-else>{{ $t('composer.chosen') }}</template>
          </p>
        </div>

        <ChoiceGroupPicker :group="group" prefix="product-modal" :api="choicesApi" />
      </section>
    </div>

    <!-- The product could not be loaded (or no longer exists): say so instead of an empty dialog -->
    <div v-else class="flex-1 px-5 py-8 sm:px-8">
      <LoadError
        :message="$t('menu.productLoadFailed')"
        data-testid="product-modal-load-error"
        class="px-4 py-3 bg-ygf-orange-50 border border-ygf-orange-200 rounded-lg text-ygf-black"
        @retry="emit('retry')"
      />
    </div>

    <!-- Footer rail -->
    <footer v-if="p" class="border-t border-ygf-orange-100 bg-ygf-cream px-5 py-4 sm:px-8 sm:py-5">
      <p v-if="!p.isAvailable" class="text-sm text-neutral-600 mb-3">
        {{ $t('menu.unavailable') }}
      </p>
      <!-- Under 360px the stepper sits above a full-width button: beside it the label and price were clipped. -->
      <div class="flex items-center gap-3 sm:gap-4 max-[359px]:flex-col max-[359px]:items-stretch">
        <div class="stepper shrink-0 max-[359px]:self-center">
          <button
            type="button"
            class="stepper-btn"
            :aria-label="$t('cart.decreaseQtyOf', { name: p.name })"
            :disabled="quantity <= 1"
            @click="quantity--"
          >
            &minus;
          </button>
          <span class="stepper-value">{{ quantity }}</span>
          <button
            type="button"
            class="stepper-btn"
            :aria-label="$t('cart.increaseQtyOf', { name: p.name })"
            :disabled="quantity >= maxQuantity"
            @click="quantity++"
          >
            +
          </button>
        </div>

        <button
          type="button"
          data-testid="product-modal-add-to-cart"
          class="btn btn-primary flex-1 justify-center max-[359px]:flex-none max-[400px]:px-4"
          :disabled="!canAddToCart"
          @click="addToCart"
        >
          <span>{{ $t('menu.addToCart') }}</span>
          <span class="tabular-nums">{{ formatCents(lineTotalCents) }}</span>
        </button>
      </div>
    </footer>

    <ImageLightbox ref="lightboxRef" :src="lightboxSrc" :alt="lightboxAlt" />
  </div>
</template>

<script setup lang="ts">
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'
import * as productImage from '#engine/utils/productImage'
import type { Product } from '#engine/types'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGqlQuery, useRuntimeConfig } from '#imports'
import { PRODUCT_PHOTO_WIDTHS, productPhoto } from '~/data/productPhotos'
import ChoiceGroupPicker from '~/components/menu/ChoiceGroupPicker.vue'
import ImageLightbox from '#engine/components/ImageLightbox.vue' // eslint-disable-line typescript-eslint/consistent-type-imports
import LoadError from '#engine/components/LoadError.vue'
import MktPicture from '~/components/mkt/MktPicture.vue'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatCents } from '#engine/lib/price'
import gql from 'graphql-tag'
import { lineSignature } from '#engine/utils/cartLines'
import { print } from 'graphql'
import { useCartStore } from '#engine/stores/cart'
import { useEventBus } from '@vueuse/core'
import { useFocusTrap } from '#engine/composables/useFocusTrap'
import { useProductChoices } from '#engine/composables/useProductChoices'
import { useTracking } from '#engine/composables/useTracking'

/**
 * Fixed-set product dialog (broth + spice sets, plain dishes, drinks).
 * Composer products (any group with maxSelections > 1) open BowlComposer
 * instead — pages/menu.vue routes between the two. Both share
 * useProductChoices and ChoiceGroupPicker, so a "Menu Découverte" shows the
 * same official broth cards and spice chips as the bowl composer, echoing the
 * "BASE DE SOUPE" spread of the official YGF France menu.
 */

const cartItemAdded = useEventBus(cartItemAddedKey)

const { trackEvent } = useTracking()
const { policyParams } = useOrderingPolicy()
const cartStore = useCartStore()
const config = useRuntimeConfig()

const { product, orderingDisabled = false } = defineProps<{
  product: string
  orderingDisabled?: boolean
}>()

const emit = defineEmits<{
  close: []
  retry: []
}>()

const modalRef = ref<HTMLElement | null>(null)
useFocusTrap(modalRef)

const lightboxRef = ref<InstanceType<typeof ImageLightbox> | null>(null)
const lightboxSrc = ref('')
const lightboxAlt = ref('')
const imageElement = ref<HTMLImageElement | null>(null)
const { handleProductImageError } = productImage
const productImageBaseSrc = computed(() =>
  productImage.productImageBase(config.public.s3bucketUrl, p?.id),
)
const brandPhoto = computed(() => productPhoto(p?.slug))

const openLightbox = (id: string, name: string) => {
  // ImageLightbox appends .avif/.webp/.png itself; the largest brand asset
  // May lack .png, but the avif/webp <source>s always win in supporting
  // Browsers.
  lightboxSrc.value = brandPhoto.value
    ? `${brandPhoto.value.base}-${Math.max(...(brandPhoto.value.widths ?? PRODUCT_PHOTO_WIDTHS))}`
    : productImage.productImageBase(config.public.s3bucketUrl, id, 'classic')
  lightboxAlt.value = name
  lightboxRef.value?.open()
}

const quantity = ref(1)
const maxQuantity = 99

const PRODUCT_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) {
      id
      name
      description
      price
      slug
      isAvailable
      isHalal
      isLunchOnly
      isSpicy
      isVegetarian
      isDiscountable
      pieceCount
      code
      category {
        name
        slug
      }
      choices {
        id
        productId
        choiceGroupId
        priceModifier
        sortOrder
        name
      }
      choiceGroups {
        id
        productId
        minSelections
        maxSelections
        sortOrder
        name
        choices {
          id
          productId
          choiceGroupId
          priceModifier
          sortOrder
          name
        }
      }
    }
  }
`

const { data: dataProduct } = await useGqlQuery<{
  product: Product
}>(print(PRODUCT_QUERY), { id: product }, { immediate: true, cache: true })

const p = dataProduct.value?.product

// Selection state, gating and pricing are shared with BowlComposer so both
// Surfaces produce an identical cart payload.
const choicesApi = useProductChoices(p, quantity)
const {
  choiceGroups,
  selectionList,
  selectedChoice,
  displayPriceCents,
  lineTotalCents,
  isGroupSatisfied,
  allGroupsSatisfied,
  groupHint,
} = choicesApi

const canAddToCart = computed(() => {
  if (orderingDisabled) return false
  if (!p?.isAvailable) return false
  return allGroupsSatisfied.value
})

// Close modal on escape key
onMounted(() => {
  productImage.ensureProductImageFallback(imageElement.value)

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') emit('close')
  }
  document.addEventListener('keydown', handleEscape)
  onUnmounted(() => document.removeEventListener('keydown', handleEscape))

  // Track product view
  if (p) {
    trackEvent('product_viewed', {
      product_id: p.id,
      product_name: p.name,
      category_name: p.category?.name,
      price: p.price,
    })
  }
})

const addToCart = () => {
  if (!p || !canAddToCart.value) return

  cartStore.addProduct(p, quantity.value, {
    choice: selectedChoice.value,
    selections: selectionList.value,
  })
  trackEvent('product_added_to_cart', {
    product_id: p.id,
    product_name: p.name,
    price: p.price,
    quantity: quantity.value,
    choice_id: selectedChoice.value?.id,
    selections_count: selectionList.value.reduce((sum, selection) => sum + selection.quantity, 0),
    source: 'modal',
  })
  cartItemAdded.emit({
    productName: p.name,
    productId: p.id,
    choiceId: selectedChoice.value?.id,
    selectionSignature: lineSignature(selectionList.value, quantity.value),
  })

  emit('close')
}
</script>
