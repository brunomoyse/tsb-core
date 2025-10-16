<template>
    <section v-if="accompagnements.length" class="bg-white rounded-lg shadow p-4 w-full mx-auto">
        <h2 class="text-xl font-semibold mb-4">
            {{ $t('checkout.addExtras', 'Add some extras?') }}
        </h2>
        <p class="text-sm text-gray-600 mb-4">
            {{ $t('checkout.extrasDescription', 'Complete your order with some accompaniments') }}
        </p>

        <!-- Horizontal scroll of accompaniments -->
        <div class="overflow-x-auto pb-2">
            <div class="flex gap-4">
                <div
                    v-for="product in accompagnements"
                    :key="product.id"
                    class="flex-shrink-0 w-40 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    @click="addToCart(product)"
                >
                    <!-- Product Image -->
                    <div class="w-full h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mb-2">
                        <picture v-if="product.slug">
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product.slug}.avif`"
                                type="image/avif"
                            />
                            <source
                                :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product.slug}.webp`"
                                type="image/webp"
                            />
                            <img
                                :src="`${config.public.s3bucketUrl}/images/thumbnails/${product.slug}.png`"
                                :alt="product.name"
                                class="w-full h-full object-cover"
                            />
                        </picture>
                        <div v-else class="text-gray-400 text-xs">
                            {{ $t('common.noImage', 'No image') }}
                        </div>
                    </div>

                    <!-- Product Info -->
                    <div class="text-center">
                        <p class="font-medium text-sm line-clamp-2 mb-1">
                            {{ product.name }}
                        </p>
                        <p class="text-sm font-semibold text-red-600">
                            {{ formatPrice(product.price) }}
                        </p>
                    </div>

                    <!-- Add Button -->
                    <button
                        class="w-full mt-2 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                        @click.stop="addToCart(product)"
                    >
                        {{ $t('common.add', 'Add') }}
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useGqlQuery, useRuntimeConfig } from '#imports'
import { useCartStore } from '@/stores/cart'
import { formatPrice } from '~/lib/price'
import type { ProductCategory, Product } from '@/types'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { eventBus } from '~/eventBus'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const config = useRuntimeConfig()
const cartStore = useCartStore()

// Query to fetch all product categories
const PRODUCT_CATEGORIES = gql`
  query {
    productCategories {
      id
      name
      order
      products {
        id
        name
        price
        code
        slug
        pieceCount
        isVisible
        isAvailable
        isHalal
        isDiscountable
        categoryId
        category { id name }
      }
    }
  }
`

const { data: dataCategories } = await useGqlQuery<{
    productCategories: ProductCategory[]
}>(print(PRODUCT_CATEGORIES), {}, { immediate: true, cache: true })

// Filter products from "accompagnements" category that are visible and available
const accompagnements = computed<Product[]>(() => {
    const categories = dataCategories.value?.productCategories ?? []
    const accompagnementsCategory = categories.find(
        cat => cat.name.toLowerCase() === 'accompagnements'
    )

    if (!accompagnementsCategory) return []

    return accompagnementsCategory.products.filter(
        p => p.isVisible && p.isAvailable
    )
})

// Add product to cart
const addToCart = (product: Product) => {
    cartStore.addToCart(product)

    eventBus.emit('notify', {
        message: t('notify.success.addedToCart', { product: product.name }),
        persistent: false,
        duration: 2000,
        variant: 'success',
    })
}
</script>