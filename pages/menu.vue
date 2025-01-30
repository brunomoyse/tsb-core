<template>
  <div class="w-full max-w-full min-h-screen bg-gray-50 relative">
    <main class="w-screen">
      <!-- Search Section -->
      <section class="mt-2 mb-6 px-4">
        <div class="mobile-only relative w-full max-w-md mx-auto">
          <!-- Visually Hidden Label for Accessibility -->
          <label for="search" class="sr-only">Search</label>

          <!-- Search Input -->
          <Input id="search" type="text" placeholder="What do you want to eat?"
            class="w-full py-2 pl-4 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tsb-red transition duration-200 ease-in-out sm:py-3 sm:pl-5 sm:pr-12"
            v-model="searchValue" aria-label="Search" />

          <!-- Search Icon Positioned on the Right -->
          <span class="absolute inset-y-0 right-3 flex items-center pointer-events-none sm:right-4">
            <Search class="h-5 w-5 text-gray-400 sm:h-6 sm:w-6" aria-hidden="true" />
          </span>

          <!-- Clear Button Positioned on the Right -->
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
        <div
          class="flex overflow-x-auto space-x-4 ml-4 no-scrollbar">
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
          <!-- @TODO: Filters-->
          <!--<div class="mx-4 mb-3">The most popular</div>-->
        </div>

        <section class="mx-4 mb-8">
          <div class="grid grid-cols-2 gap-3">
            <template v-for="product in filteredProducts" :key="product.id" v-if="selectedCategory">
              <ProductCard :product="product" :category="selectedCategory" />
            </template>
          </div>
        </section>
      </section>

      <!-- Cart Sidebar with Transition -->
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
import { ref, watch, computed } from 'vue';
import { Input } from "@/components/ui/input";
import { Search, X as XIcon } from 'lucide-vue-next';
import { useDebounce, useMediaQuery } from '@vueuse/core';
import { useRequestHeaders, useAsyncData, useNuxtApp } from '#imports';
import type { Ref } from 'vue';
import type { ProductCategory, ProductInfo } from '@/types';

// 1) CART STORE
const cartStore = useCartStore();

// 2) REFS / REACTIVE STATE
const searchValue = ref('');
const selectedCategory: Ref<ProductCategory | null> = ref(null);

// Debounced search for performance
const debouncedSearchValue = useDebounce(searchValue, 300);

// Initialize placeholders for category/product data
const categories = ref<ProductCategory[]>([]);
const selectedProducts = ref<ProductInfo[]>([]);

// 3) NUXT APP HELPERS
const { $apiBaseUrl } = useNuxtApp();

// 4) HEADERS: Called in setup to ensure correct Nuxt context
const acceptLanguage = process.server
  ? useRequestHeaders(['accept-language'])['accept-language'] || 'en'
  : navigator.language || 'en';

// 5) FETCH CATEGORIES WITH useAsyncData
const {
  data: categoryData,
  error: categoryError,
} = await useAsyncData<ProductCategory[]>('categories', () =>
  $fetch(`${$apiBaseUrl()}/categories`, {
    headers: {
      'Accept-Language': acceptLanguage,
    },
  })
);

// 6) SET CATEGORIES & INITIAL CATEGORY (IF ANY)
if (categoryError.value) {
  console.error('Error fetching categories:', categoryError.value);
  // You could handle an error state here if needed
} else if (categoryData.value && categoryData.value.length > 0) {
  categories.value = categoryData.value;
  selectedCategory.value = categoryData.value[0];
}

// 7) CREATE A PARAM FOR THE CURRENT CATEGORY ID
const selectedCategoryId = computed(() => selectedCategory.value?.id);

// 8) FETCH PRODUCTS BASED ON SELECTED CATEGORY
//    useAsyncData with a function that depends on `selectedCategoryId`
const {
  data: productData,
  error: productError,
  refresh: refreshProducts,
} = await useAsyncData<ProductInfo[]>(
  'products-' + (selectedCategoryId.value || 'none'),
  () => {
    if (!selectedCategoryId.value) {
      // Return an empty array but wrapped in a Promise
      return Promise.resolve([] as ProductInfo[]);
    }
    return $fetch<ProductInfo[]>(`${$apiBaseUrl()}/products-by-category/${selectedCategoryId.value}`, {
      headers: {
        'Accept-Language': acceptLanguage,
      },
    });
  }
);

// 9) WATCH FOR CHANGES IN SELECTED CATEGORY
watch(
  selectedCategoryId,
  async (newValue, oldValue) => {
    // 1. If there's no new category selected, reset products
    if (!newValue) {
      selectedProducts.value = [];
      return;
    }

    // 2. If the new category ID differs from the old one, refresh data
    if (newValue !== oldValue) {
      // Re-fetch products for the new category ID
      await refreshProducts();

      // Assign the newly fetched products (if any) to `selectedProducts`
      if (productData.value) {
        selectedProducts.value = productData.value;
      }
    }
  },
  { immediate: true }
);

// 10) INITIALIZE `selectedProducts` ON MOUNT
//     If we already have productData from the default category, assign it
if (productData.value) {
  selectedProducts.value = productData.value;
}

// 11) SELECT CATEGORY FUNCTION
const selectCategory = (categoryId: string): void => {
  if (!categoryId) {
    console.error('Invalid category UUID provided.');
    return;
  }
  const category = categories.value.find((cat) => cat.id === categoryId);
  if (category) {
    selectedCategory.value = category;
  }
};

// 12) FILTERED PRODUCTS BASED ON SEARCH
const filteredProducts = computed(() => {
  if (!debouncedSearchValue.value.trim()) return selectedProducts.value || [];
  if (!selectedProducts.value) return [];

  const searchTerms = debouncedSearchValue.value.trim().toLowerCase().split(/\s+/);
  return selectedProducts.value.filter((product: ProductInfo) => {
    const combinedName = (selectedCategory.value?.name + " " + product.name).toLowerCase();
    return searchTerms.every((term) => combinedName.includes(term));
  });
});

// 13) CLEAR SEARCH
const clearSearch = () => {
  searchValue.value = '';
};
</script>

<style>
/* Custom styles for the hamburger animation */
/* Hide the default checkbox */
#menu-toggle {
  display: none;
}

/* Hamburger lines */
.hamburger span {
  display: block;
  width: 24px;
  height: 2px;
  background-color: currentColor;
  margin: 5px 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* Transform the hamburger into an X when checked */
#menu-toggle:checked+.hamburger span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

#menu-toggle:checked+.hamburger span:nth-child(2) {
  opacity: 0;
}

#menu-toggle:checked+.hamburger span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* Mobile Menu Styles */
#mobile-menu {
  position: fixed;
  top: 5rem;
  /* Adjust based on navbar height (h-20 = 5rem) */
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(-20px);
  pointer-events: none;
  transition: opacity 0.4s ease, transform 0.4s ease;
  z-index: 40;
  /* Ensure it's below the navbar (z-50) */
}

/* When menu is checked, show the mobile menu */
#menu-toggle:checked~#mobile-menu {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* Optional: Smooth fade-in and fade-out animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }

  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}

#menu-toggle:checked~#mobile-menu {
  animation: fadeIn 0.4s forwards;
}

#menu-toggle:not(:checked)~#mobile-menu {
  animation: fadeOut 0.4s forwards;
}

/* Transition Styles for Slide-Down Animation */
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

/* Optional: Prevent body scrolling when cart is open */
body.cart-open {
  overflow: hidden;
}
</style>