<template>
        <div ref="modalRef" @click.stop role="dialog" aria-modal="true" aria-labelledby="product-modal-title" data-testid="product-modal" class="bg-white rounded-xl max-w-3xl w-full p-8 relative space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
                @click="emit('close')"
                :aria-label="$t('common.close')"
                type="button"
                class="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <DietBadge v-if="p.isHalal" kind="halal" variant="pill" />
                        <DietBadge v-if="p.isVegetarian" kind="vegetarian" variant="pill" />
                        <DietBadge v-if="p.isSpicy" kind="spicy" variant="pill" />
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
                                :ref="(el) => setGroupRef(group.id, el)"
                                data-testid="product-modal-group"
                                :data-invalid="isGroupFlagged(group)"
                                class="rounded-xl border p-3 transition-colors"
                                :class="[
                                    isGroupFlagged(group) ? 'border-red-300 bg-red-50/30' : 'border-gray-200',
                                    shakingGroupId === group.id ? 'animate-shake' : '',
                                ]"
                            >
                                <div class="flex items-center justify-between mb-2 gap-3">
                                    <div class="min-w-0">
                                        <span class="text-sm font-medium text-gray-900">{{ choiceGroupDisplayName(group) }}</span>
                                        <p
                                            v-if="isGroupFlagged(group)"
                                            class="text-xs text-red-600 mt-0.5"
                                        >
                                            {{ groupHint(group) }}
                                        </p>
                                    </div>
                                    <span
                                        class="rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums"
                                        :class="groupTagClass(group)"
                                    >
                                        <template v-if="group.minSelections > 0">{{ $t('menu.required') }} · </template>{{ selectedQuantitiesByGroup[group.id] ?? 0 }}/{{ groupTargetMax(group) }}
                                    </span>
                                </div>
                                <div class="space-y-2">
                                    <div
                                        v-for="choice in group.choices.toSorted((a, b) => a.sortOrder - b.sortOrder)"
                                        :key="choice.id"
                                        :data-testid="'product-modal-choice-' + choice.id"
                                        class="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200"
                                    >
                                        <span class="flex-1 text-sm text-gray-900">{{ choice.name }}</span>
                                        <span v-if="Number(choice.priceModifier) !== 0" class="text-xs text-gray-500">
                                            {{ Number(choice.priceModifier) > 0 ? '+' : '' }}{{ formatPrice(choice.priceModifier) }}
                                        </span>
                                        <QuantityStepper
                                            size="sm"
                                            :value="selectedChoiceQuantities[choice.id] ?? 0"
                                            :dec-disabled="!(selectedChoiceQuantities[choice.id] > 0)"
                                            :inc-disabled="(selectedQuantitiesByGroup[group.id] ?? 0) >= groupTargetMax(group)"
                                            :dec-testid="`product-modal-choice-dec-${choice.id}`"
                                            :inc-testid="`product-modal-choice-inc-${choice.id}`"
                                            @decrement="decrementChoice(choice)"
                                            @increment="incrementChoice(choice)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Cart Controls -->
                    <div class="border-t pt-4">
                        <div class="flex items-center justify-between gap-4">
                            <QuantityStepper
                                :value="quantity"
                                :dec-disabled="quantity === 1"
                                :inc-disabled="quantity === maxQuantity"
                                @decrement="quantity > 1 ? quantity-- : null"
                                @increment="quantity < maxQuantity ? quantity++ : null"
                            />

                            <UiButton
                                size="lg"
                                class="flex-1"
                                data-testid="product-modal-add-to-cart"
                                :disabled="!canOrder"
                                @click="addToCart"
                            >
                                {{ $t(editItem ? 'menu.updateWithPrice' : 'menu.addWithPrice', { price: formatPrice(lineTotal) }) }}
                            </UiButton>
                        </div>
                    </div>
                </div>
            </div>

            <ImageLightbox ref="lightboxRef" :src="lightboxSrc" :alt="lightboxAlt" />
        </div>
</template>

<script setup lang="ts">
import * as productImage from '#engine/utils/productImage'
import type { Product, ProductChoice, ProductChoiceGroup, ProductChoiceSelection } from '#engine/types'
import { type ComponentPublicInstance, computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGqlQuery, useRuntimeConfig } from '#imports'
import ImageLightbox from '~/components/ImageLightbox.vue' // eslint-disable-line typescript-eslint/consistent-type-imports
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatPrice } from '#engine/lib/price'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useCartItemEdit } from '#engine/composables/useCartItemEdit'
import { useCartStore } from '#engine/stores/cart'
import { useEventBus } from '@vueuse/core'
import { useFocusTrap } from '#engine/composables/useFocusTrap'
import { useI18n } from 'vue-i18n'
import { useTracking } from '#engine/composables/useTracking'

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

// Set when the modal was opened from a customized cart line ("Edit"): prefill
// from that line and replace it on confirm instead of adding a second one.
const cartItemEdit = useCartItemEdit()
const editItem = cartItemEdit.value?.product.id === product ? cartItemEdit.value : null

const quantity = ref(editItem?.quantity ?? 1)
const maxQuantity = 99
const selectedChoiceQuantities = ref<Record<string, number>>(
    Object.fromEntries((editItem?.selectedChoices ?? []).map((selection) => [selection.choiceId, selection.quantity])),
)

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
            name: t('menu.choice'),
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

const choiceGroupDisplayName = (group: ProductChoiceGroup) => {
    if (p?.category?.slug === 'menu-plateau') return t('menu.soup')
    return group.name
}

// Same line total the cart shows: unit price (with modifiers) times quantity.
const lineTotal = computed(() => Number(displayPrice.value) * quantity.value)

// The button stays clickable while choices are missing so a click can point at
// the group that still needs a selection; it is only disabled when ordering is.
const canOrder = computed(() => !orderingDisabled && Boolean(p?.isAvailable))

const isGroupSatisfied = (group: ProductChoiceGroup) => {
    const selected = selectedQuantitiesByGroup.value[group.id] ?? 0
    return selected >= groupTargetMin(group) && selected <= groupTargetMax(group)
}

// Groups open neutral; the error treatment only appears after an add attempt.
const showGroupErrors = ref(false)
const shakingGroupId = ref<string | null>(null)
let shakeTimeout: ReturnType<typeof setTimeout> | null = null
const groupElements = new Map<string, HTMLElement>()

const setGroupRef = (groupId: string, el: Element | ComponentPublicInstance | null) => {
    if (el instanceof HTMLElement) groupElements.set(groupId, el)
    else groupElements.delete(groupId)
}

const isGroupFlagged = (group: ProductChoiceGroup) => showGroupErrors.value && !isGroupSatisfied(group)

const groupTagClass = (group: ProductChoiceGroup) => {
    if (isGroupFlagged(group)) return 'bg-red-100 text-red-700'
    if (group.minSelections > 0 && isGroupSatisfied(group)) return 'bg-emerald-50 text-emerald-700'
    return 'bg-gray-100 text-gray-600'
}

const flagFirstIncompleteGroup = (group: ProductChoiceGroup) => {
    showGroupErrors.value = true
    groupElements.get(group.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    shakingGroupId.value = group.id
    if (shakeTimeout) clearTimeout(shakeTimeout)
    shakeTimeout = setTimeout(() => { shakingGroupId.value = null }, 400)
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
    onUnmounted(() => {
        document.removeEventListener('keydown', handleEscape)
        if (shakeTimeout) clearTimeout(shakeTimeout)
        cartItemEdit.value = null
    })

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
    if (!p || !canOrder.value) return

    const incompleteGroup = choiceGroups.value.find((group) => !isGroupSatisfied(group))
    if (incompleteGroup) {
        flagFirstIncompleteGroup(incompleteGroup)
        return
    }

    if (editItem) {
        cartStore.removeFromCart(editItem.product, {
            choice: editItem.selectedChoice,
            selections: editItem.selectedChoices,
        })
    }
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
