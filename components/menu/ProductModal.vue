<template>
    <div class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 backdrop-blur-sm"
         @click.self="emit('close')">
        <div ref="modalRef" class="bg-white rounded-xl max-w-3xl w-full p-8 relative space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
                @click="emit('close')"
                class="absolute top-6 right-6 text-gray-500 hover:text-gray-700 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div v-if="p" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Image Section -->
                <div class="relative h-44 lg:h-96 bg-gray-50 rounded-xl overflow-hidden">
                    <picture class="w-full h-full flex justify-center items-center p-4">
                        <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${p.slug}.avif`" type="image/avif"/>
                        <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${p.slug}.webp`" type="image/webp"/>
                        <img
                            :alt="p.name"
                            :src="`${config.public.s3bucketUrl}/images/thumbnails/${p.slug}.png`"
                            class="object-contain w-full h-full transition-opacity duration-500 rounded-lg shadow-sm"
                            :class="[!p.isAvailable ? 'grayscale' : '']"
                        />
                    </picture>
                </div>

                <!-- Details Section -->
                <div class="space-y-6">
                    <div class="flex items-center flex-col">
                        <p class="text-lg text-gray-500 mb-2">{{ p.category.name }}</p>
                        <h2 class="text-xl font-bold text-gray-900">{{ p.name }}</h2>
                    </div>

                    <!-- Price & Badges -->
                    <div class="flex items-baseline gap-3 flex-wrap">
                        <span class="text-2xl font-bold text-gray-900">{{ formatPrice(displayPrice) }}</span>
                        <span v-if="p.pieceCount" class="text-sm text-gray-500">
                            {{ p.pieceCount }} {{ p.pieceCount > 1 ? $t('menu.pcs') : $t('menu.pc') }}
                        </span>
                    </div>

                    <div class="flex gap-2 flex-wrap">
                        <span v-if="p.isHalal" class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                            {{ $t('menu.halal') }}
                        </span>
                        <span v-if="p.isVegan" class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                            {{ $t('menu.vegan') }}
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
                        <div class="space-y-2">
                            <label
                                v-for="choice in sortedChoices"
                                :key="choice.id"
                                class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                                :class="selectedChoiceId === choice.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'"
                            >
                                <input
                                    type="radio"
                                    name="product-choice"
                                    :value="choice.id"
                                    v-model="selectedChoiceId"
                                    class="w-4 h-4 text-red-500 focus:ring-red-500"
                                />
                                <span class="flex-1 text-sm text-gray-900">{{ choice.name }}</span>
                                <span v-if="Number(choice.priceModifier) !== 0" class="text-sm text-gray-500">
                                    {{ Number(choice.priceModifier) > 0 ? '+' : '' }}{{ formatPrice(choice.priceModifier) }}
                                </span>
                            </label>
                        </div>
                    </div>

                    <!-- Cart Controls -->
                    <div class="space-y-4 border-t pt-4">
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-2">
                                <div class="flex items-center gap-2 border rounded-lg p-1">
                                    <button
                                        @click="quantity > 1 ? quantity-- : null"
                                        class="w-8 h-8 rounded-md hover:bg-gray-50 text-gray-600"
                                        :disabled="quantity === 1"
                                    >−</button>
                                    <span
                                        class="w-12 text-center border-0 focus:ring-0"
                                    >{{quantity}}</span>
                                    <button
                                        @click="quantity++"
                                        class="w-8 h-8 rounded-md hover:bg-gray-50 text-gray-600"
                                    >+</button>
                                </div>
                            </div>

                            <button
                                @click="addToCart"
                                class="flex-1 bg-red-500 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-small md:font-medium transition-colors"
                                :class="{ 'opacity-50 cursor-not-allowed': !canAddToCart }"
                                :disabled="!canAddToCart"
                            >
                                {{ $t('menu.addToCart') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch, useRuntimeConfig, useGqlQuery } from '#imports'
import { useFocusTrap } from '~/composables/useFocusTrap'
import { useTracking } from '~/composables/useTracking'
import gql from 'graphql-tag'
import { print } from 'graphql'
import {formatPrice} from "~/lib/price";
import {useCartStore} from "~/stores/cart";
import {eventBus} from "~/eventBus";
import type { Product, ProductChoice } from "@/types"
import { useI18n } from 'vue-i18n'


const cartStore = useCartStore();
const { t } = useI18n()
const config = useRuntimeConfig()
const { trackEvent } = useTracking()
const props = defineProps<{
    product: string
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const modalRef = ref<HTMLElement | null>(null)
useFocusTrap(modalRef)

const quantity = ref(1)
const selectedChoiceId = ref<string | null>(null)

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
      isVegan
      isDiscountable
      pieceCount
      code
      category {
        name
      }
      choices {
        id
        productId
        priceModifier
        sortOrder
        name
      }
    }
  }
`

const { data: dataProduct } = await useGqlQuery<{
    product: Product
}>(print(PRODUCT_QUERY), { id: props.product }, { immediate: true, cache: true })

const p = dataProduct.value?.product

const hasChoices = computed(() => p?.choices && p.choices.length > 0)

const sortedChoices = computed(() => {
    if (!p?.choices) return []
    return [...p.choices].sort((a, b) => a.sortOrder - b.sortOrder)
})

const selectedChoice = computed((): ProductChoice | null => {
    if (!selectedChoiceId.value || !p?.choices) return null
    return p.choices.find(c => c.id === selectedChoiceId.value) ?? null
})

const displayPrice = computed(() => {
    if (!p) return '0'
    const base = Number(p.price)
    const modifier = selectedChoice.value ? Number(selectedChoice.value.priceModifier) : 0
    return String(base + modifier)
})

const canAddToCart = computed(() => {
    if (!p?.isAvailable) return false
    if (hasChoices.value && !selectedChoiceId.value) return false
    return true
})

// Close modal on escape key
onMounted(() => {
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

    // Prevent background from scrolling
    document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
    // Restore scrolling
    document.body.style.overflow = ''
})

const addToCart = () => {
    if (!p || !canAddToCart.value) return

    cartStore.addProduct(p, quantity.value, selectedChoice.value)
    trackEvent('product_added_to_cart', {
        product_id: p.id,
        product_name: p.name,
        price: p.price,
        quantity: quantity.value,
        choice_id: selectedChoice.value?.id,
        source: 'modal',
    })
    eventBus.emit('cart-item-added', {
        productName: p.name,
        productId: p.id,
        choiceId: selectedChoice.value?.id,
    })
    eventBus.emit('notify', {
        message: t('notify.addedToCart', { product: p.name }),
        variant: 'success',
        duration: 2000,
    })

    emit('close')
}

// Reset quantity when product changes
watch(() => p, () => {
    quantity.value = 1
    selectedChoiceId.value = null
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
