<template>
        <div ref="modalRef" @click.stop role="dialog" aria-modal="true" aria-labelledby="product-modal-title" data-testid="product-modal" class="bg-white rounded-xl max-w-3xl w-full p-8 relative space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
                @click="emit('close')"
                :aria-label="$t('common.close')"
                class="absolute top-6 right-6 text-gray-500 hover:text-gray-700 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div v-if="p" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Image Section -->
                <div class="relative h-44 lg:h-96 bg-gray-50 rounded-xl overflow-hidden cursor-pointer" @click="openLightbox(p.id, p.name)">
                    <picture class="w-full h-full flex justify-center items-center p-4">
                        <source :srcset="`${productImageBaseSrc}.avif`" type="image/avif"/>
                        <source :srcset="`${productImageBaseSrc}.webp`" type="image/webp"/>
                        <img
                            ref="imageElement"
                            :alt="p.name"
                            :src="`${productImageBaseSrc}.png`"
                            class="object-contain w-full h-full transition-opacity duration-500 rounded-lg shadow-sm"
                            :class="[!p.isAvailable ? 'grayscale' : '']"
                            @error="handleProductImageError"
                        />
                    </picture>
                </div>

                <!-- Details Section -->
                <div class="space-y-6">
                    <div class="flex items-center flex-col">
                        <p translate="no" class="text-lg text-gray-600 mb-2">{{ p.category.name }}</p>
                        <h2 id="product-modal-title" translate="no" class="text-xl font-bold text-gray-900">{{ p.name }}</h2>
                    </div>

                    <!-- Price & Badges -->
                    <div class="flex items-baseline gap-3 flex-wrap">
                        <span class="text-2xl font-bold text-gray-900">{{ formatPrice(displayPrice) }}</span>
                        <span v-if="p.pieceCount" class="text-sm text-gray-600">
                            {{ p.pieceCount }} {{ p.pieceCount > 1 ? $t('menu.pcs') : $t('menu.pc') }}
                        </span>
                    </div>

                    <div class="flex gap-2 flex-wrap">
                        <span v-if="p.isHalal" class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full inline-flex items-center gap-1.5">
                            <img
                                src="https://api.iconify.design/hugeicons/halal.svg?color=%231e40af"
                                alt=""
                                aria-hidden="true"
                                class="w-3.5 h-3.5"
                            />
                            {{ $t('menu.halal') }}
                        </span>
                        <span v-if="p.isVegetarian" class="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm rounded-full inline-flex items-center gap-1.5">
                            <img
                                src="https://api.iconify.design/hugeicons/leaf-01.svg?color=%23065f46"
                                alt=""
                                aria-hidden="true"
                                class="w-3.5 h-3.5"
                            />
                            {{ $t('menu.vegetarian') }}
                        </span>
                        <span v-if="p.isSpicy" class="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full inline-flex items-center gap-1.5">
                            <img
                                src="https://api.iconify.design/hugeicons/fire-02.svg?color=%23991b1b"
                                alt=""
                                aria-hidden="true"
                                class="w-3.5 h-3.5"
                            />
                            {{ $t('menu.spicy') }}
                        </span>
                        <span v-if="p.isLunchOnly" class="px-3 py-1 bg-tsb-four text-red-700 text-sm rounded-full inline-flex items-center gap-1.5">
                            {{ $t('menu.lunchOnly') }}
                        </span>
                        <span v-if="p.isDiscountable" class="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full border border-emerald-200">
                            {{ $t('menu.pickupDiscountBadge') }}
                        </span>
                    </div>

                    <!-- Description -->
                    <div class="prose prose-sm" v-if="p.description">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">
                            {{ $t('menu.description') }}
                        </h3>
                        <p class="text-gray-600 text-sm">{{ p.description }}</p>
                    </div>

                    <!-- Choice Selection -->
                    <div v-if="hasChoices" class="space-y-3 border-t pt-4">
                        <h3 class="text-sm font-semibold text-gray-700">{{ $t('menu.selectChoice') }}</h3>
                        <div class="space-y-3">
                            <div
                                v-for="group in choiceGroups"
                                :key="group.id"
                                class="rounded-lg border p-3 transition-colors"
                                :class="isGroupSatisfied(group) ? 'border-gray-200' : 'border-red-300 bg-red-50/30'"
                            >
                                <div class="flex items-center justify-between mb-2 gap-3">
                                    <div class="min-w-0">
                                        <span class="text-sm font-medium text-gray-900">{{ group.name }}</span>
                                        <p
                                            v-if="!isGroupSatisfied(group)"
                                            class="text-xs text-red-600 mt-0.5"
                                        >
                                            {{ groupHint(group) }}
                                        </p>
                                    </div>
                                    <span
                                        class="text-xs font-semibold whitespace-nowrap"
                                        :class="isGroupSatisfied(group) ? 'text-emerald-600' : 'text-red-600'"
                                    >
                                        {{ selectedQuantitiesByGroup[group.id] ?? 0 }}/{{ groupTargetMax(group) }}
                                    </span>
                                </div>
                                <div class="space-y-2">
                                    <div
                                        v-for="choice in group.choices.toSorted((a, b) => a.sortOrder - b.sortOrder)"
                                        :key="choice.id"
                                        :data-testid="'product-modal-choice-' + choice.id"
                                        class="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200"
                                    >
                                        <span class="flex-1 text-sm text-gray-900">{{ choice.name }}</span>
                                        <span v-if="Number(choice.priceModifier) !== 0" class="text-xs text-gray-500">
                                            {{ Number(choice.priceModifier) > 0 ? '+' : '' }}{{ formatPrice(choice.priceModifier) }}
                                        </span>
                                        <div class="flex items-center gap-1 bg-gray-100 rounded-full">
                                            <button
                                                type="button"
                                                :data-testid="`product-modal-choice-dec-${choice.id}`"
                                                class="w-8 h-8 rounded-full text-gray-700 hover:bg-gray-200 transition-colors"
                                                :aria-label="$t('cart.decreaseQty')"
                                                :disabled="!(selectedChoiceQuantities[choice.id] > 0)"
                                                @click="decrementChoice(choice)"
                                            >−</button>
                                            <span class="w-6 text-center text-xs font-semibold">{{ selectedChoiceQuantities[choice.id] ?? 0 }}</span>
                                            <button
                                                type="button"
                                                :data-testid="`product-modal-choice-inc-${choice.id}`"
                                                class="w-8 h-8 rounded-full text-gray-700 hover:bg-gray-200 transition-colors"
                                                :aria-label="$t('cart.increaseQty')"
                                                :disabled="(selectedQuantitiesByGroup[group.id] ?? 0) >= groupTargetMax(group)"
                                                @click="incrementChoice(choice)"
                                            >+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Cart Controls -->
                    <div class="space-y-4 border-t pt-4">
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-2">
                                <div class="flex items-center gap-2 border rounded-lg p-1">
                                    <button
                                        @click="quantity > 1 ? quantity-- : null"
                                        :aria-label="$t('cart.decreaseQty')"
                                        class="w-8 h-8 rounded-md hover:bg-gray-50 text-gray-600 transition-all active:scale-[0.97]"
                                        :disabled="quantity === 1"
                                    >−</button>
                                    <span
                                        class="w-12 text-center border-0 focus:ring-0"
                                    >{{quantity}}</span>
                                    <button
                                        @click="quantity < maxQuantity ? quantity++ : null"
                                        :aria-label="$t('cart.increaseQty')"
                                        class="w-8 h-8 rounded-md hover:bg-gray-50 text-gray-600 transition-all active:scale-[0.97]"
                                        :disabled="quantity === maxQuantity"
                                    >+</button>
                                </div>
                            </div>

                            <button
                                @click="addToCart"
                                data-testid="product-modal-add-to-cart"
                                class="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg text-sm md:font-medium transition-all active:scale-[0.97]"
                                :class="{ 'opacity-50 cursor-not-allowed': !canAddToCart }"
                                :disabled="!canAddToCart"
                            >
                                {{ $t('menu.addToCart') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ImageLightbox ref="lightboxRef" :src="lightboxSrc" :alt="lightboxAlt" />
        </div>
</template>

<script setup lang="ts">
import * as productImage from '~/utils/productImage'
import type { Product, ProductChoice, ProductChoiceGroup, ProductChoiceSelection } from '@/types'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGqlQuery, useRuntimeConfig } from '#imports'
import ImageLightbox from '~/components/ImageLightbox.vue' // eslint-disable-line typescript-eslint/consistent-type-imports
import { cartItemAddedKey } from '~/composables/useEventBuses'
import { formatPrice } from '~/lib/price'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useCartStore } from '~/stores/cart'
import { useEventBus } from '@vueuse/core'
import { useFocusTrap } from '~/composables/useFocusTrap'
import { useI18n } from 'vue-i18n'
import { useTracking } from '~/composables/useTracking'

const cartItemAdded = useEventBus(cartItemAddedKey)



const { trackEvent } = useTracking()
const { t } = useI18n()
const cartStore = useCartStore()
const config = useRuntimeConfig()

const {
    product,
    orderingDisabled = false,
} = defineProps<{
    product: string
    orderingDisabled?: boolean
}>()

const emit = defineEmits<{
    close: []
}>()

const modalRef = ref<HTMLElement | null>(null)
useFocusTrap(modalRef)

const lightboxRef = ref<InstanceType<typeof ImageLightbox> | null>(null)
const lightboxSrc = ref('')
const lightboxAlt = ref('')
const imageElement = ref<HTMLImageElement | null>(null)
const { handleProductImageError } = productImage
const productImageBaseSrc = computed(() => productImage.productImageBase(config.public.s3bucketUrl, p?.id))

const openLightbox = (id: string, name: string) => {
    lightboxSrc.value = productImage.productImageBase(config.public.s3bucketUrl, id, 'classic')
    lightboxAlt.value = name
    lightboxRef.value?.open()
}

const quantity = ref(1)
const maxQuantity = 99
const selectedChoiceQuantities = ref<Record<string, number>>({})

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

const hasChoices = computed(() => p?.choices && p.choices.length > 0)

const choiceGroups = computed(() => {
    if (!p?.choiceGroups || p.choiceGroups.length === 0) {
        if (!p?.choices || p.choices.length === 0) return []
        return [{
            id: 'legacy-single',
            productId: p.id,
            minSelections: 1,
            maxSelections: 1,
            sortOrder: 0,
            name: 'Choice',
            choices: p.choices.toSorted((a, b) => a.sortOrder - b.sortOrder),
        }]
    }
    return p.choiceGroups.toSorted((a, b) => a.sortOrder - b.sortOrder)
})

const selectedChoice = computed((): ProductChoice | null => {
    const selection = selectionList.value.find((item) => item.quantity === 1)
    if (!selection || !p?.choices) return null
    return p.choices.find((choice) => choice.id === selection.choiceId) ?? null
})

const displayPrice = computed(() => {
    if (!p) return '0'
    const base = Number(p.price)
    const modifier = Object.entries(selectedChoiceQuantities.value).reduce((sum, [choiceId, selectedQty]) => {
        const choice = p.choices?.find((c) => c.id === choiceId)
        if (!choice || selectedQty <= 0) return sum
        return sum + Number(choice.priceModifier) * selectedQty
    }, 0)
    return String(base + modifier)
})

const selectedQuantitiesByGroup = computed(() => {
    const currentProduct = p
    const byGroup: Record<string, number> = {}
    if (!currentProduct?.choices) return byGroup

    for (const [choiceId, selectedQty] of Object.entries(selectedChoiceQuantities.value)) {
        if (selectedQty <= 0) continue
        const choice = currentProduct.choices.find((c) => c.id === choiceId)
        if (!choice) continue
        const groupId = choice.choiceGroupId
        byGroup[groupId] = (byGroup[groupId] ?? 0) + selectedQty
    }

    return byGroup
})

const selectionList = computed((): ProductChoiceSelection[] => {
    const currentProduct = p
    if (!currentProduct?.choices) return []
    return Object.entries(selectedChoiceQuantities.value)
        .filter(([, selectedQty]) => selectedQty > 0)
        .map(([choiceId, selectedQty]) => {
            const choice = currentProduct.choices.find((c) => c.id === choiceId)
            if (!choice) return null
            return {
                groupId: choice.choiceGroupId,
                choiceId,
                quantity: selectedQty,
            }
        })
        .filter((item): item is ProductChoiceSelection => Boolean(item))
})

const groupTargetMin = (group: ProductChoiceGroup) => group.minSelections * quantity.value
const groupTargetMax = (group: ProductChoiceGroup) => group.maxSelections * quantity.value

const canAddToCart = computed(() => {
    if (orderingDisabled) return false
    if (!p?.isAvailable) return false
    if (choiceGroups.value.length === 0) return true

    const counts = selectedQuantitiesByGroup.value
    for (const group of choiceGroups.value) {
        const selected = counts[group.id] ?? 0
        if (selected < groupTargetMin(group) || selected > groupTargetMax(group)) {
            return false
        }
    }
    return true
})

const isGroupSatisfied = (group: ProductChoiceGroup) => {
    const selected = selectedQuantitiesByGroup.value[group.id] ?? 0
    return selected >= groupTargetMin(group) && selected <= groupTargetMax(group)
}

const groupHint = (group: ProductChoiceGroup) => {
    const selected = selectedQuantitiesByGroup.value[group.id] ?? 0
    const targetMin = groupTargetMin(group)
    const targetMax = groupTargetMax(group)
    if (selected > targetMax) {
        const excess = selected - targetMax
        return t('menu.removeExcess', { count: excess }, excess)
    }
    const remaining = Math.max(0, targetMin - selected)
    if (group.minSelections === group.maxSelections) {
        return t('menu.chooseRemaining', { count: remaining }, remaining)
    }
    return t('menu.chooseAtLeast', { count: remaining }, remaining)
}

const incrementChoice = (choice: ProductChoice) => {
    const group = choiceGroups.value.find((g) => g.id === choice.choiceGroupId)
    if (!group) return
    const currentCount = selectedQuantitiesByGroup.value[group.id] ?? 0
    if (currentCount >= groupTargetMax(group)) return
    selectedChoiceQuantities.value = {
        ...selectedChoiceQuantities.value,
        [choice.id]: (selectedChoiceQuantities.value[choice.id] ?? 0) + 1,
    }
}

const decrementChoice = (choice: ProductChoice) => {
    const current = selectedChoiceQuantities.value[choice.id] ?? 0
    if (current <= 0) return
    const next = current - 1
    const copy = { ...selectedChoiceQuantities.value }
    if (next === 0) {
        delete copy[choice.id]
    } else {
        copy[choice.id] = next
    }
    selectedChoiceQuantities.value = copy
}

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
        selectionSignature: selectionList.value
            .map((selection) => `${selection.groupId}:${selection.choiceId}:${selection.quantity}`)
            .join('|'),
    })


    emit('close')
}

// Reset quantity when product changes
watch(() => p, () => {
    quantity.value = 1
    selectedChoiceQuantities.value = {}
})

</script>

<style>
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
input[type='number'] {
    -moz-appearance: textfield;
}
</style>
