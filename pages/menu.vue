<template>
  <div class="w-full max-w-full min-h-screen bg-gray-50 relative">
    <main class="w-screen">
      <!-- Search Section -->
      <section class="mt-2 mb-6 px-4">
        <div class="mobile-only relative w-full max-w-md mx-auto">
          <label for="search" class="sr-only">Search</label>

          <!-- Search Input -->
          <Input id="search" type="text" placeholder="What do you want to eat?"
            class="w-full py-2 pl-4 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tsb-red transition duration-200 ease-in-out sm:py-3 sm:pl-5 sm:pr-12"
            v-model="searchValue" aria-label="Search" />

          <span class="absolute inset-y-0 right-3 flex items-center pointer-events-none sm:right-4">
            <Search class="h-5 w-5 text-gray-400 sm:h-6 sm:w-6" aria-hidden="true" />
          </span>

          <button v-if="debouncedSearchValue" @click="clearSearch"
            class="absolute inset-y-0 right-10 flex items-center justify-center px-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-tsb-red sm:right-12 z-50"
            aria-label="Clear search">
            <XIcon class="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>
        </div>
      </section>

      <!-- Categories -->
      <section>
        <div class="mx-4 mb-3 text-lg font-medium">Choose a category</div>
        <div class="flex overflow-x-auto space-x-4 ml-4 no-scrollbar">
          <template v-for="category in categories" :key="category.id">
            <CategoryCard :category="category" :active="selectedCategory === category" @select="selectCategory"
              :show-icon="false" />
          </template>
        </div>
      </section>

      <!-- Products -->
      <section class="flex-1 my-8">
        <div class="flex justify-between items-center">
          <div class="mx-4 mb-3">{{ selectedProducts.length }} choices</div>
        </div>

        <section v-if="selectedCategory" class="mx-4 mb-8">
          <div class="grid grid-cols-2 gap-3">
            <template v-for="product in filteredProducts" :key="product.id">
              <ProductCard  :product="product" :category="selectedCategory" />
            </template>
          </div>
        </section>
      </section>

      <!-- Cart Sidebar -->
      <Transition name="slide-down">
        <aside v-if="cartStore.isCartVisible"
          class="fixed top-20 right-0 w-full h-full bg-white shadow-lg p-8 overflow-y-auto z-40" role="dialog"
          aria-modal="true" aria-labelledby="cart-heading">
          <CartSidebar />
        </aside>
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Input } from "@/components/ui/input";
import { Search, X as XIcon } from 'lucide-vue-next';
import { useDebounce } from '@vueuse/core';
import { useAsyncData, useNuxtApp } from '#imports';
import type { ProductCategory, ProductInfo } from '@/types';

// 1️⃣ CART STORE
const cartStore = useCartStore();

// 2️⃣ SEARCH & CATEGORY STATE
const searchValue = ref('');
const debouncedSearchValue = useDebounce(searchValue, 300);

// 3️⃣ USE `useState()` TO MAKE VALUES SSR-SAFE
const categories = useState<ProductCategory[]>('categories', () => []);
const selectedCategory = useState<ProductCategory | null>('selectedCategory', () => null);
const selectedProducts = useState<ProductInfo[]>('selectedProducts', () => []);

// 4️⃣ FETCH CATEGORIES (SSR-SAFE)
const { $apiBaseUrl } = useNuxtApp();
const { data: categoryData, error: categoryError } = await useAsyncData<ProductCategory[]>('categories', () =>
  $fetch(`${$apiBaseUrl()}/categories`)
);

// Set categories once fetched
if (categoryData.value) {
  categories.value = categoryData.value;
  selectedCategory.value = categoryData.value[0] || null;
}

// 5️⃣ COMPUTED: GET `selectedCategoryId`
const selectedCategoryId = computed(() => selectedCategory.value?.id || null);

// 6️⃣ FETCH PRODUCTS BASED ON SELECTED CATEGORY
const {
  data: productData,
  error: productError,
  refresh: refreshProducts,
} = await useAsyncData<ProductInfo[]>(
  `products-${selectedCategoryId.value || 'none'}`,
  async () => {
    if (!selectedCategoryId.value) return [];
    return await $fetch(`${$apiBaseUrl()}/products-by-category/${selectedCategoryId.value}`);
  },
  { watch: [selectedCategoryId] }
);

// 7️⃣ WATCH CATEGORY CHANGES & REFRESH PRODUCTS
watch(selectedCategoryId, async (newValue, oldValue) => {
  if (!newValue) return (selectedProducts.value = []);
  if (newValue !== oldValue) {
    await refreshProducts();
    selectedProducts.value = productData.value || [];
  }
}, { immediate: true });

// 8️⃣ FILTER PRODUCTS BASED ON SEARCH INPUT
const filteredProducts = computed(() => {
  if (!debouncedSearchValue.value.trim()) return selectedProducts.value;
  return selectedProducts.value.filter(product =>
    (selectedCategory.value?.name + " " + product.name)
      .toLowerCase()
      .includes(debouncedSearchValue.value.trim().toLowerCase())
  );
});

// 9️⃣ SELECT CATEGORY
const selectCategory = (categoryId: string): void => {
  selectedCategory.value = categories.value.find(cat => cat.id === categoryId) || null;
};

// 🔟 CLEAR SEARCH
const clearSearch = () => {
  searchValue.value = '';
};
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