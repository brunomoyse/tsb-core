<template>
    <section class="card p-5">
        <h2 class="text-lg font-bold text-ygf-black">
            {{ $t('checkout.addExtras', 'Add some extras?') }}
        </h2>
        <p class="text-sm text-ygf-gray-400 mt-1 mb-4">
            {{ $t('checkout.extrasDescription', 'Complete your order with some accompaniments') }}
        </p>
        <p class="text-xs text-ygf-orange-700 bg-ygf-orange-50 border border-ygf-orange-100 rounded-lg px-3 py-2 mb-4 inline-flex items-center gap-2">
            <span class="font-semibold uppercase tracking-wide">{{ $t('checkout.paidExtra', 'Paid extra') }}</span>
            <span>{{ $t('checkout.paidExtrasNotice', 'These extras are billed as products and added to your cart.') }}</span>
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
                v-for="extra in paidExtras"
                :key="extra.code"
                class="flex items-center justify-between gap-3 p-4 border rounded-xl transition-colors"
                :class="[
                    isSelected(extra.code)
                        ? 'border-ygf-orange bg-ygf-orange-bg'
                        : 'border-subtle bg-ygf-white hover:border-ygf-orange',
                    !isAvailable(extra.code) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ]"
            >
                <span class="flex items-center gap-3 min-w-0">
                    <input
                        type="checkbox"
                        :checked="isSelected(extra.code)"
                        :disabled="!isAvailable(extra.code)"
                        class="h-5 w-5 text-ygf-orange-on-white border-subtle rounded shrink-0 focus-visible:ring-2 focus-visible:ring-ygf-orange-300"
                        @change="toggle(extra.code)"
                    />
                    <span :class="['text-sm font-medium truncate', isSelected(extra.code) ? 'text-ygf-orange-text' : 'text-ygf-black']">
                        {{ extra.label }}
                    </span>
                </span>
                <span :class="['text-sm font-semibold shrink-0 tabular-nums', isSelected(extra.code) ? 'text-ygf-orange-text' : 'text-ygf-black']">
                    +{{ formatPrice(extra.price) }}
                </span>
            </label>
        </div>
    </section>
</template>

<script lang="ts" setup>
import type { Product, ProductCategory } from '#engine/types'
import { computed } from 'vue'
import { formatPrice } from '#engine/lib/price'
import { useCartStore } from '#engine/stores/cart'
import { useGqlQuery } from '#imports'

const cartStore = useCartStore()

const PAID_EXTRA_DEFS = [
    { code: 'K45', label: 'Wasabi', fallbackPrice: 0.8 },
    { code: 'K42', label: 'Sauce soja salée', fallbackPrice: 1 },
    { code: 'K43', label: 'Sauce soja sucrée', fallbackPrice: 1 },
] as const

const EXTRA_PRODUCTS_QUERY = `
    query PaidExtraProducts {
        productCategories {
            id
            name
            products {
                id
                name
                description
                price
                code
                slug
                pieceCount
                isVisible
                isAvailable
                isHalal
                isLunchOnly
                isSpicy
                isVegetarian
                isDiscountable
                category {
                    id
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
    }
`

const { data: productsData } = await useGqlQuery<{ productCategories: ProductCategory[] }>(
    EXTRA_PRODUCTS_QUERY,
    {},
    { immediate: true, cache: true, lazy: true },
)

const productsByCode = computed(() => {
    const map = new Map<string, Product>()
    for (const category of productsData.value?.productCategories ?? []) {
        for (const product of category.products ?? []) {
            if (product.code) map.set(product.code, product)
        }
    }
    return map
})

const paidExtras = computed(() => PAID_EXTRA_DEFS.map((item) => {
    const product = productsByCode.value.get(item.code)
    return {
        code: item.code,
        label: product?.name || item.label,
        price: Number(product?.price ?? item.fallbackPrice),
    }
}))

const getProductByCode = (code: string): Product | undefined => productsByCode.value.get(code)

const isSelected = (code: string): boolean =>
    cartStore.products.some((item) => item.product.code === code && (!item.selectedChoice || (item.selectedChoices?.length ?? 0) === 0))

const isAvailable = (code: string): boolean => Boolean(getProductByCode(code)?.isAvailable)

const toggle = (code: string): void => {
    const product = getProductByCode(code)
    if (!product || !product.isAvailable) return

    if (isSelected(code)) {
        cartStore.removeFromCart(product)
    } else {
        cartStore.addProduct(product, 1)
    }
}
</script>
