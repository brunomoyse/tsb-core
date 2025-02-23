<template>
  <div>

    <!-- Search Section -->
    <section class="mb-4 px-4 w-screen">
      <SearchBar v-model="searchValue" />
    </section>

    <section v-if="searchValue.trim().length < 1" class="m-4">
      <!-- Categories -->
      <h2 class="text-lg font-medium mb-1">
        {{ $t('menu.pickCategory') }}
      </h2>
      <div class="flex overflow-x-auto space-x-4 no-scrollbar">
        <CategoryCard v-for="category in categories" :key="category.id" :category="category"
          :active="selectedCategory?.id === category.id" @select="selectCategory" :show-icon="false" />
      </div>
    </section>

    <section v-if="searchValue.trim().length < 1" class="m-4">
      <!-- Filtres (Préférences) -->
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
      <div v-if="filteredProducts.length" class="flex flex-wrap justify-left gap-6">
        <ProductCard v-for="(product, index) in filteredProducts" :key="product.id" :index="index" :product="product"
          class="flex-[0_1_48%] sm:flex-[0_1_48%] md:flex-[0_1_30%] lg:flex-[0_1_23%] xl:flex-[0_1_23%]" />
      </div>
      <div v-else class="text-center">{{ $t('menu.noProduct') }}</div>
    </section>

    <!-- Cart Sidebar -->
    <Transition name="slide-down">
      <aside v-if="cartStore.isCartVisible"
        class="fixed top-20 right-0 w-full h-full bg-white shadow-lg p-8 overflow-y-auto z-40">
        <CartSidebar />
      </aside>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useDebounce } from '@vueuse/core'
import { useFetch, useNuxtApp, useCartStore, useI18n, useAsyncData } from '#imports'

import type { CategoryWithProducts, ProductCategory } from '@/types'
const { $apiBaseUrl } = useNuxtApp()
const cartStore = useCartStore()
const { locale: userLocale, t } = useI18n()

const filterOptions = reactive<Record<string, boolean>>({
  isHalal: false,
  isVegan: false
})

const filters = [
  { slug: 'isHalal', name: t('menu.halal') },
  { slug: 'isVegan', name: t('menu.vegan') }
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
const { data: categories } = await useFetch<ProductCategory[]>(`${$apiBaseUrl()}/categories`, {
  headers: { 'accept-language': userLocale }
})
const selectedCategory = ref(categories.value?.[0] || null)

const selectCategory = async (categoryId: string) => {
  selectedCategory.value = categories.value?.find((cat) => cat.id === categoryId) || null
}

// Fetch products by category
const { data: categoriesWithProductsData } = await useAsyncData(
  'categoriesWithProducts',
  () => $fetch<CategoryWithProducts[]>(`${$apiBaseUrl()}/categories-with-products`, {
    headers: { 'accept-language': userLocale.value }
  })
)

// Flatten product list for filtering
const productData = computed(() =>
  categoriesWithProductsData.value?.flatMap((cat) =>
    cat.products.map((product) => ({
      ...product,
      category: {
        id: cat.id,
        name: cat.name,
        order: cat.order
      } as ProductCategory
    }))
  ) || []
)

const filteredProducts = computed(() => {
  const query = debouncedSearchValue.value.trim().toLowerCase()

  return productData.value?.filter((p) => {
    // Match the selected category (if one is selected)
    const matchesCategory =
      !selectedCategory.value ||
      p.category.id === selectedCategory.value.id

    // Check if the product meets all active filter criteria
    const passesFilters = Object.entries(filterOptions).every(
      ([key, isActive]) => !isActive || (p as any)[key]
    )

    if (!matchesCategory || !passesFilters) return false

    // If there's no query, include the product.
    if (!query) return true

    // Search within category name and product name.
    const nameToSearch = `${p.category.name} ${p.name}`.toLowerCase()
    return nameToSearch.includes(query)
  }) || []
})

//onMounted(async () => {
//  await useAuthStore().refreshAccessToken();
//})

</script>

<style>
/* Slide-down transition */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-enter-to {
  transform: translateY(0);
  opacity: 1;
}

.slide-down-leave-from {
  transform: translateY(0);
  opacity: 1;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>