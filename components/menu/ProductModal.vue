<template>
    <div class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-white rounded-xl max-w-3xl w-full p-8 relative space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
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

                    <!-- Price & Attributes -->
                    <div class="space-y-4">
                        <div class="flex items-baseline gap-4">
                            <div class="flex gap-2">
                                <span v-if="p.isHalal" class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                    {{ $t('menu.halal') }}
                                </span>
                                <span v-if="p.isVegan" class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                    {{ $t('menu.vegan') }}
                                </span>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="p-4 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-500 mb-1">
                                    {{ $t('menu.price') }}
                                </p>
                                <p class="font-medium text-gray-900">{{ formatPrice(p.price) }}</p>
                            </div>
                            <div v-if="p.pieceCount && p.pieceCount === 1" class="p-4 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-500 mb-1">
                                    {{ $t('menu.piece') }}
                                </p>
                                <p class="font-medium text-gray-900">{{ p.pieceCount }}</p>
                            </div>
                            <div v-else-if="p.pieceCount && p.pieceCount > 1" class="p-4 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-500 mb-1">
                                    {{ $t('menu.pieces') }}
                                </p>
                                <p class="font-medium text-gray-900">{{ p.pieceCount }}</p>
                            </div>
                            <div class="p-4 bg-gray-50 rounded-lg" v-if="p.code">
                                <p class="text-sm text-gray-500 mb-1">
                                    {{ $t('menu.code') }}
                                </p>
                                <p class="font-medium text-gray-900">{{ p.code || 'N/A' }}</p>
                            </div>
                            <div class="p-4 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-500 mb-1">
                                    {{ $t('menu.discountable') }}
                                </p>
                                <p v-if="p.isDiscountable" class="font-medium text-gray-900">{{ $t('menu.yes') }}</p>
                                <p v-else class="font-medium text-gray-900">{{ $t('menu.no') }}</p>
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
                                        class="w-8 h-8 rounded-md hover:bg-gray-50 text-gray-600"
                                        :disabled="quantity === 1"
                                    >−</button>
                                    <input
                                        v-model.number="quantity"
                                        type="number"
                                        min="1"
                                        class="w-12 text-center border-0 focus:ring-0"
                                    >
                                    <button
                                        @click="quantity++"
                                        class="w-8 h-8 rounded-md hover:bg-gray-50 text-gray-600"
                                    >+</button>
                                </div>
                            </div>

                            <button
                                @click="addToCart"
                                class="flex-1 bg-red-500 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-small md:font-medium transition-colors"
                                :class="{ 'opacity-50 cursor-not-allowed': !p.isAvailable }"
                                :disabled="!p.isAvailable"
                            >
                                {{ $t('menu.addToCart') }}
                            </button>
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="prose prose-sm border-t pt-4" v-if="p.description">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">
                            {{ $t('menu.description') }}
                        </h3>
                        <p class="text-gray-600 text-sm">{{ p.description }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, useRuntimeConfig, useGqlQuery } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'
import {formatPrice} from "~/lib/price";
import {useCartStore} from "~/stores/cart";
import type { Product } from "@/types"


const cartStore = useCartStore();
const config = useRuntimeConfig()
const props = defineProps<{
    product: string
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

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
      isHalal
      isVegan
      isDiscountable
      pieceCount
      code
      category {
        name
      }
    }
  }
`

const { data: dataProduct } = await useGqlQuery<{
    product: Product
}>(print(PRODUCT_QUERY), { id: props.product }, { immediate: true, cache: true })

const p = dataProduct.value?.product

// Close modal on escape key
onMounted(() => {
    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') emit('close')
    }
    document.addEventListener('keydown', handleEscape)
    onUnmounted(() => document.removeEventListener('keydown', handleEscape))

    // Prevent background from scrolling
    document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
    // Restore scrolling
    document.body.style.overflow = ''
})

const addToCart = () => {
    if (!p || !p.isAvailable) return

    cartStore.addProduct(p, quantity.value)

    emit('close')
}

// Reset quantity when product changes
watch(() => p, () => {
    quantity.value = 1
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
