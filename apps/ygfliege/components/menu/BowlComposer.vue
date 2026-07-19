<template>
    <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bowl-composer-title"
        data-testid="bowl-composer"
        class="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-ygf-lg shadow-ygf-lg flex flex-col overflow-hidden"
        @click.stop
    >
        <!-- Header -->
        <header class="flex items-start justify-between gap-4 px-5 py-4 sm:px-8 sm:py-6 border-b border-ygf-orange-100 bg-ygf-orange-50/60">
            <div class="min-w-0">
                <span class="section-label">{{ $t('composer.eyebrow') }}</span>
                <h2 id="bowl-composer-title" translate="no" class="section-title text-xl sm:text-2xl truncate">
                    {{ p?.name ?? $t('composer.title') }}
                </h2>
            </div>
            <button
                type="button"
                data-testid="bowl-composer-close"
                :aria-label="$t('common.close')"
                class="shrink-0 w-11 h-11 -mr-2 -mt-1 inline-flex items-center justify-center rounded-full text-ygf-black/60 hover:text-ygf-black hover:bg-white transition-colors"
                @click="emit('close')"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </header>

        <!-- Steps -->
        <div class="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 space-y-10">
            <section
                v-for="(group, index) in choiceGroups"
                :key="group.id"
                :aria-labelledby="`bowl-composer-group-${group.id}`"
                class="space-y-4"
            >
                <div class="flex items-baseline justify-between gap-4 flex-wrap">
                    <div>
                        <span class="section-label">{{ $t('composer.step', { n: index + 1 }) }}</span>
                        <h3 :id="`bowl-composer-group-${group.id}`" class="section-title text-lg sm:text-xl">
                            {{ group.name }}
                        </h3>
                    </div>
                    <!-- Live count so the 5/20 rule is legible before the CTA is reached. -->
                    <p
                        class="text-sm font-semibold tabular-nums"
                        :class="isGroupSatisfied(group) ? 'text-ygf-success' : 'text-ygf-orange-600'"
                    >
                        <template v-if="isMultiSelectGroup(group)">
                            {{ $t('composer.selectedCount', {
                                count: selectedCountIn(group),
                                max: groupTargetMax(group),
                            }) }}
                        </template>
                        <template v-else-if="!isGroupSatisfied(group)">{{ groupHint(group) }}</template>
                        <template v-else>{{ $t('composer.chosen') }}</template>
                    </p>
                </div>

                <ChoiceGroupPicker :group="group" prefix="bowl-composer" :api="choicesApi" />
            </section>
        </div>

        <!-- Summary rail -->
        <footer class="border-t border-ygf-orange-100 bg-ygf-cream px-5 py-4 sm:px-8 sm:py-5 space-y-3">
            <!-- polite, not assertive: the total updates on every tap and would -->
            <!-- otherwise interrupt a screen reader mid-sentence. -->
            <p aria-live="polite" class="text-sm text-ygf-black/70 min-h-5">
                <template v-if="allGroupsSatisfied">{{ summaryLabel }}</template>
                <template v-else-if="blockingGroup">
                    <span translate="no" class="font-medium text-ygf-black">{{ blockingGroup.name }}</span>
                    &nbsp;&middot;&nbsp;{{ groupHint(blockingGroup) }}
                </template>
            </p>

            <div class="flex items-center gap-3 sm:gap-4">
                <div class="stepper shrink-0">
                    <button
                        type="button"
                        class="stepper-btn"
                        :aria-label="$t('cart.decreaseQty')"
                        :disabled="quantity <= 1"
                        @click="quantity--"
                    >&minus;</button>
                    <span class="stepper-value">{{ quantity }}</span>
                    <button
                        type="button"
                        class="stepper-btn"
                        :aria-label="$t('cart.increaseQty')"
                        :disabled="quantity >= MAX_QUANTITY"
                        @click="quantity++"
                    >+</button>
                </div>

                <button
                    type="button"
                    data-testid="bowl-composer-add-to-cart"
                    class="btn btn-primary flex-1 justify-center"
                    :disabled="!canAddToCart"
                    @click="addToCart"
                >
                    <span>{{ $t('menu.addToCart') }}</span>
                    <span class="tabular-nums">{{ formatPrice(lineTotal) }}</span>
                </button>
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import type { Product } from '#engine/types'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ChoiceGroupPicker from '~/components/menu/ChoiceGroupPicker.vue'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { formatPrice } from '#engine/lib/price'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useCartStore } from '#engine/stores/cart'
import { useEventBus } from '@vueuse/core'
import { useFocusTrap } from '#engine/composables/useFocusTrap'
import { useGqlQuery } from '#imports'
import { useI18n } from 'vue-i18n'
import { useProductChoices } from '~/composables/useProductChoices'
import { useTracking } from '#engine/composables/useTracking'

/**
 * "Malatang sur mesure" — the signature build-your-own-bowl flow.
 *
 * Split out of ProductModal because the composer is a different task: the modal
 * presents a dish you accept or reject, whereas this is a multi-step assembly
 * where the running count and price are the point. ProductModal still handles
 * every fixed set (broth + spice, all groups min=max=1).
 *
 * Selection state, gating and pricing come from useProductChoices, shared with
 * ProductModal, so the cart receives an identical payload from either surface.
 */

const { product, orderingDisabled = false } = defineProps<{
    /** Product id; the full record with choice names/prices is fetched here. */
    product: string
    orderingDisabled?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const MAX_QUANTITY = 99

const { t } = useI18n()
const { trackEvent } = useTracking()
const cartStore = useCartStore()
const cartItemAdded = useEventBus(cartItemAddedKey)

const panelRef = ref<HTMLElement | null>(null)
useFocusTrap(panelRef)

const quantity = ref(1)

const PRODUCT_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) {
      id
      name
      description
      price
      slug
      isAvailable
      category { name slug }
      choices { id productId choiceGroupId priceModifier sortOrder name }
      choiceGroups {
        id
        productId
        minSelections
        maxSelections
        sortOrder
        name
        choices { id productId choiceGroupId priceModifier sortOrder name }
      }
    }
  }
`

const { data: dataProduct } = await useGqlQuery<{ product: Product }>(
    print(PRODUCT_QUERY),
    { id: product },
    { immediate: true, cache: true },
)

const p = dataProduct.value?.product

// Kept as one object so ChoiceGroupPicker receives the whole selection API;
// destructured alongside for local template use.
const choicesApi = useProductChoices(p, quantity)
const {
    choiceGroups,
    isMultiSelectGroup,
    groupTargetMax,
    selectedCountIn,
    quantityOf,
    selectionList,
    selectedChoice,
    displayPrice,
    isGroupSatisfied,
    allGroupsSatisfied,
    groupHint,
    blockingGroup,
} = choicesApi

const lineTotal = computed(() => String(Number(displayPrice.value) * quantity.value))

const canAddToCart = computed(() => {
    if (orderingDisabled) return false
    if (!p?.isAvailable) return false
    return allGroupsSatisfied.value
})

/** "Bouillon tomate mijoté · 5 ingrédients · Moyen" */
const summaryLabel = computed(() => {
    if (!p?.choices) return ''
    return choiceGroups.value
        .map((group) => {
            if (isMultiSelectGroup(group)) {
                const count = selectedCountIn(group)
                return t('composer.ingredientsSummary', { count }, count)
            }
            const picked = group.choices.find((choice) => quantityOf(choice) > 0)
            return picked?.name ?? ''
        })
        .filter(Boolean)
        .join(' · ')
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
        source: 'composer',
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

onMounted(() => {
    if (p) {
        trackEvent('product_viewed', {
            product_id: p.id,
            product_name: p.name,
            category_name: p.category?.name,
            price: p.price,
        })
    }

    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') emit('close')
    }
    document.addEventListener('keydown', handleEscape)
    onUnmounted(() => document.removeEventListener('keydown', handleEscape))
})
</script>
