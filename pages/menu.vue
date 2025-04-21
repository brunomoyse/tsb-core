<template>
    <div class="flex">
        <!-- Main Central Content -->
        <div class="sm:w-[calc(100vw-142px)]"
             :class="cartStore.products.length === 0 ? 'lg:w-[calc(100vw-142px)]' : 'lg:w-[calc(67vw-71px)]'">
            <!-- Search Section -->
            <section class="mb-4 px-4">
                <SearchBar v-model="searchValue"/>
            </section>

            <!-- Categories -->
            <section v-if="searchValue.trim().length < 1" class="m-4">
                <div class="flex items-center justify-between mb-3">
                    <h2 class="text-lg font-medium">{{ $t('menu.pickCategory') }}</h2>
                    <button
                        v-if="categories && categories.length > initialVisibleCount"
                        @click="showAllCategories = !showAllCategories"
                        class="hidden sm:inline-block text-sm text-primary-600 hover:text-primary-700"
                    >
                        {{ showAllCategories ? $t('menu.showLess') : $t('menu.showMore') }}
                    </button>
                </div>

                <!-- Mobile Horizontal Scroll -->
                <div class="flex overflow-x-auto gap-2 pb-2 sm:hidden no-scrollbar">
                    <CategoryCard
                        v-for="category in categories"
                        :key="category.id"
                        :active="selectedCategory?.id === category.id"
                        :category="category"
                        class="min-w-[150px]"
                        @select="selectCategory"
                    />
                </div>

                <!-- Desktop Grid -->
                <div class="hidden sm:grid grid-cols-3 lg:grid-cols-4 gap-2">
                    <template v-for="category in visibleCategories" :key="category.id">
                        <CategoryCard
                            :active="selectedCategory?.id === category.id"
                            :category="category"
                            @select="selectCategory"
                        />
                    </template>
                </div>
            </section>

            <!-- Filters Section -->
            <section v-if="searchValue.trim().length < 1" class="m-4">
                <h2 class="text-lg font-medium mb-3">{{ $t('menu.pickFilters') }}</h2>
                <div class="flex flex-wrap gap-3">
                    <template v-for="tag in filters" :key="tag.slug">
                        <label class="cursor-pointer w-full sm:w-auto">
                            <div
                                class="px-4 py-2.5 rounded-xl border transition-all duration-200"
                                :class="[
                        filterOptions[tag.slug]
                            ? 'bg-tsb-four border-tsb-two shadow-sm dark:bg-gray-700 dark:border-gray-600'
                            : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700'
                    ]"
                            >
                                <Checkbox
                                    v-model="filterOptions[tag.slug]"
                                    class="!mt-0 w-full"
                                >
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ tag.name }}
                        </span>
                                </Checkbox>
                            </div>
                        </label>
                    </template>
                </div>
            </section>

            <!-- Products -->
            <section class="mx-auto px-4 mb-8">
                <div
                    v-if="filteredProducts.length"
                    class="grid grid-cols-2 gap-5 justify-center sm:justify-start md:[grid-template-columns:repeat(auto-fit,minmax(auto,185px))]"
                >
                    <ProductCard
                        v-for="(product, index) in filteredProducts"
                        :key="product.id"
                        :index="index"
                        :product="product"
                        class="w-full"
                    />
                </div>
                <div v-else class="text-center">{{ $t('menu.noProduct') }}</div>
            </section>
        </div>

        <!-- Cart Sidebar -->
        <aside v-if="cartStore.products.length"
               class="hidden lg:w-[calc(30vw-71px)] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]"
               :class="cartStore.products.length === 0 ? 'hidden' : 'lg:block'">
            <SideCart/>
        </aside>

        <!-- Mobile Cart -->
        <div class="lg:hidden">
            <CartMobile/>
        </div>
    </div>
</template>

<script lang="ts" setup>
import CartMobile from '~/components/cart/CartMobile.vue'
import SideCart from '~/components/cart/SideCart.vue'
import ProductCard from '~/components/menu/ProductCard.vue'
import SearchBar from '~/components/menu/SearchBar.vue'
import CategoryCard from '~/components/menu/CategoryCard.vue'
import {computed, reactive, ref, watch} from 'vue'
import {useDebounce} from '@vueuse/core'
import {useI18n, useGqlQuery} from '#imports'
import {useCartStore} from '@/stores/cart';
import type {Product, ProductCategory} from '@/types'
import gql from 'graphql-tag'
import { print } from 'graphql'

const PRODUCTS = gql`
    query {
        products {
             id
             name
             price
             code
             slug
             pieceCount
             isAvailable
             isHalal
             category {
                id
                name
             }
        }
    }
`

const PRODUCT_CATEGORIES = gql`
    query {
        productCategories {
             id
             name
             order
        }
    }
`
const {t} = useI18n()
const cartStore = useCartStore();

const initialVisibleCount = 8; // Show 8 categories initially on desktop
const showAllCategories = ref(false);

const visibleCategories = computed(() => {
    return showAllCategories.value
        ? categories.value
        : categories.value?.slice(0, initialVisibleCount) || [];
});

const filterOptions = reactive<Record<string, boolean>>({
    isHalal: false,
    isVegan: false
})

const filters = [
    {slug: 'isHalal', name: t('menu.halal')},
    {slug: 'isVegan', name: t('menu.vegan')}
]

const searchValue = ref('')
// Debounce the user input to reduce frequent filtering
const debouncedSearchValue = useDebounce(searchValue, 300)

// Watch search input: If search is typed, unselect category
watch(debouncedSearchValue, (newValue) => {
    if (newValue.trim() !== '') {
        selectedCategory.value = null
    } else {
        selectedCategory.value = categories.value?.[0] || null
    }
})

// Fetch categories
const { data: dataCategories } = await useGqlQuery<
    { productCategories: ProductCategory[] }
>(
    print(PRODUCT_CATEGORIES),
    {},
    { immediate: true, cache: true }
)
const categories = computed(() => dataCategories.value?.productCategories ?? [])

const selectedCategory = ref<ProductCategory | null>(
    categories.value?.[0] || null
);

const selectCategory = async (categoryId: string) => {
    selectedCategory.value = categories.value?.find((cat) => cat.id === categoryId) || null
}

// Fetch products
const {data: dataProducts} = await useGqlQuery<{ products: Product[] }>(print(PRODUCTS))
const products = computed(() =>
    (dataProducts.value?.products ?? []).filter(p => p.isVisible)
)

const filteredProducts = computed(() => {
    const query = debouncedSearchValue.value.trim().toLowerCase();

    return products.value?.filter((p) => {
        // Check for exact code match first
        const exactCodeMatch = query && p.code?.toLowerCase() === query;

        // Apply category filter
        const matchesCategory = !selectedCategory.value ||
            p.category?.id === selectedCategory.value.id;

        // Apply active filters
        const passesFilters = Object.entries(filterOptions).every(
            ([key, isActive]) => !isActive || (p as any)[key]
        );

        // If exact code match found, bypass other checks
        if (exactCodeMatch) return true;

        // Apply regular filters
        if (!matchesCategory || !passesFilters) return false;

        // No search query - include item
        if (!query) return true;

        // Extended search: code, category name, and product name
        const searchString = `${p.category?.name} ${p.name}`.toLowerCase();
        return searchString.includes(query);
    }) || [];
});

</script>
