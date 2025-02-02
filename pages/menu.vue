<template>
  <div class="w-full max-w-full min-h-screen bg-gray-50 relative">
    <main class="w-screen">
      <!-- Search Section -->
      <section class="mt-2 mb-6 px-4">
        <div class="mobile-only relative w-full max-w-md mx-auto">
          <label for="search" class="sr-only">Search</label>
          <!--
          <Input id="search" type="text" placeholder="What do you want to eat?"
            class="w-full py-2 pl-4 pr-10 border border-gray-300 rounded-lg focus:ring-tsb-red sm:py-3 sm:pl-5 sm:pr-12"
            v-model="searchValue" />

          <span class="absolute inset-y-0 right-3 flex items-center pointer-events-none sm:right-4">
            <Search class="h-5 w-5 text-gray-400 sm:h-6 sm:w-6" />
          </span>
          -->
          <button v-if="debouncedSearchValue" @click="clearSearch"
            class="absolute inset-y-0 right-10 flex items-center text-gray-500 hover:text-gray-700 sm:right-12">
            <XIcon class="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </section>

      <!-- Categories -->
      <section>
        <div class="mx-4 mb-3 text-lg font-medium">{{ $t('menu.pickCategory') }}</div>
        <div class="flex overflow-x-auto space-x-4 ml-4 no-scrollbar">
          <CategoryCard v-for="category in categories" :key="category.id" :category="category"
            :active="selectedCategory?.id === category.id" @select="selectCategory" :show-icon="false" />
        </div>
      </section>

      <!-- Products -->
      <section class="flex-1 my-8">
        <div class="flex justify-between items-center mx-4 mb-3">
          {{ filteredProducts.length }} {{ $t('menu.choices') }}
        </div>
        <section v-if="selectedCategory" class="mx-4 mb-8">
          <div v-if="productsStatus === 'pending'" class="text-center">Loading products...</div>
          <div v-else-if="filteredProducts.length" class="grid grid-cols-2 gap-3">
            <ProductCard v-for="(product, index) in filteredProducts" :key="product.id" :index="index" :product="product"
              :category="selectedCategory" />
          </div>
          <div v-else class="text-center">{{ $t('menu.noProduct') }}</div>
        </section>
      </section>

      <!-- Cart Sidebar -->
      <Transition name="slide-down">
        <aside v-if="cartStore.isCartVisible"
          class="fixed top-20 right-0 w-full h-full bg-white shadow-lg p-8 overflow-y-auto z-40">
          <CartSidebar />
        </aside>
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, X as XIcon } from 'lucide-vue-next';
import { useDebounce } from '@vueuse/core';
import { useFetch, useNuxtApp } from '#imports';
import type { ProductCategory, ProductInfo } from '@/types';

const { $apiBaseUrl } = useNuxtApp();
const cartStore = useCartStore();
const { locale: userLocale } = useI18n();

const searchValue = ref('');
const debouncedSearchValue = useDebounce(searchValue, 300);

// Fetch categories
const { data: categories } = await useFetch<ProductCategory[]>(`${$apiBaseUrl()}/categories`, {
  headers: {
    "accept-language": userLocale
  }
});
const selectedCategory = ref(categories.value?.[0] || null);

// Fetch products based on selected category
const selectedCategoryId = computed(() => selectedCategory.value?.id || null);
const { data: productData, status: productsStatus, refresh: refreshProducts } = useFetch<ProductInfo[]>(
  () => `${$apiBaseUrl()}/products-by-category/${selectedCategoryId.value}`,
  {
    headers: {
      "accept-language": userLocale
    },
    watch: [selectedCategoryId]
  }
);

const filteredProducts = computed(() => {
  const query = debouncedSearchValue.value.trim().toLowerCase();
  return productData.value?.filter(p => (`${selectedCategory.value?.name} ${p.name}`).toLowerCase().includes(query)) || [];
});

const selectCategory = async (categoryId: string) => {
  selectedCategory.value = categories.value?.find(cat => cat.id === categoryId) || null;
};

const clearSearch = () => searchValue.value = '';
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