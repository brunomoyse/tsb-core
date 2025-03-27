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
                <h2 class="text-lg font-medium mb-1">{{ $t('menu.pickCategory') }}</h2>
                <div class="flex overflow-x-auto space-x-4 no-scrollbar">
                    <CategoryCard
                        v-for="category in categories"
                        :key="category.id"
                        :active="selectedCategory?.id === category.id"
                        :category="category"
                        :show-icon="false"
                        @select="selectCategory"
                    />
                </div>
            </section>

            <!-- Filters -->
            <section v-if="searchValue.trim().length < 1" class="m-4">
                <h2 class="text-lg font-medium mb-1">Filtres</h2>
                <div class="flex space-x-4">
                    <template v-for="tag in filters" :key="tag.slug">
                        <Checkbox v-model="filterOptions[tag.slug]">
                            {{ tag.name }}
                        </Checkbox>
                    </template>
                </div>
            </section>

            <!-- Products -->
            <section class="mx-auto px-4 mb-8">
                <div
                    v-if="filteredProducts.length"
                    class="grid gap-5 justify-center sm:justify-start"
                    style="grid-template-columns: repeat(auto-fit, minmax(175px, auto));"
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
import {useAsyncData, useI18n, useNuxtApp} from '#imports'
import {useCartStore} from '@/stores/cart';

import type {Product, ProductCategory} from '@/types'

const {locale: userLocale, t} = useI18n()
const {$api} = useNuxtApp()
const cartStore = useCartStore();

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
const {data: categories} = await useAsyncData<ProductCategory[]>('categories', () =>
    $api('/categories', {
        headers: {
            'Accept-Language': userLocale.value
        }
    })
);
const selectedCategory = ref(categories.value?.[0] || null)

const selectCategory = async (categoryId: string) => {
    selectedCategory.value = categories.value?.find((cat) => cat.id === categoryId) || null
}

// Fetch products by category
const {data: products} = await useAsyncData<Product[]>('products', () =>
    $api('/products', {
        headers: {
            'Accept-Language': userLocale.value
        }
    })
);

const productData = computed(() =>
    // Add property "category" to each product based on the category ID
    products.value?.flatMap((p) => ({
        ...p,
        category: categories.value?.find((c) => c.id === p.categoryId) || null
    }))
)

const filteredProducts = computed(() => {
    const query = debouncedSearchValue.value.trim().toLowerCase();

    return productData.value?.filter((p) => {
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
