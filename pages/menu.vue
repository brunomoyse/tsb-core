<template>
  <div class="w-full max-w-full min-h-screen bg-gray-50">
    <header>
      <Navbar />
      <div class="h-20"></div>
    </header>
    <main class="w-screen">
      <section class="mt-2 mb-6 px-4">
        <div v-if="isMobile" class="relative w-full max-w-md mx-auto">
          <!-- Visually Hidden Label for Accessibility -->
          <label for="search" class="sr-only">Search</label>

          <!-- Search Input -->
          <Input id="search" type="text" placeholder="Search a sushi, maki,..."
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
        <div class="mx-4 mb-3">Choose a category</div>
        <div
          class="flex overflow-x-auto space-x-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-8 no-scrollbar ml-4">
          <template v-for="category in categories" :key="category.id">
            <CategoryCard :category="category" @click="selectCategory(category.id)" />
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
            <template v-for="product in filteredProducts" :key="product.id">
              <ProductCard :product="product" />
            </template>
          </div>
        </section>
      </section>

      <!-- Cart Sidebar -->
      <aside v-if="!isCartEmpty">
        <CartSidebar />
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Input } from "@/components/ui/input";
import { Search, X as XIcon } from 'lucide-vue-next'; // Import XIcon
import { useDebounce, useMediaQuery } from '@vueuse/core';
import { useFetch, useRequestHeaders } from '#imports'; // Adjust based on your setup

// Access the Nuxt app instance
const { $apiBaseUrl } = useNuxtApp();

// Reactive references
const isCartEmpty = ref(true);
const searchValue = ref('');
const selectedCategory: Ref<ProductCategory | null> = ref(null);
const selectedProducts: Ref<ProductInfo[]> = ref([]);

const isMobile = useMediaQuery('(max-width: 640px)');

// Create a debounced version of searchValue with a 300ms delay
const debouncedSearchValue = useDebounce(searchValue, 300);

// Define categories ref
const categories = ref<ProductCategory[]>([]);

// Function to fetch products by category
const fetchProductsByCategory = async (categoryUuid: string) => {
  const { data: products, error: fetchError, pending: fetchPending } = await useFetch<ProductInfo[]>(
    `${$apiBaseUrl()}/products-by-category/${categoryUuid}`,
    {
      headers: {
        'Accept-Language': process.server
          ? useRequestHeaders()['accept-language']
          : navigator.language,
      },
    }
  );

  // Handle the fetched data
  if (fetchError.value) {
    console.error('Error fetching products:', fetchError.value);
    // You can set an error state here if needed
    return;
  }

  if (products.value) {
    selectedProducts.value = products.value;
  }

  // Optionally handle the pending state
  // e.g., show a loading spinner
};

const selectCategory = (categoryId: string): void => {
  if (!categoryId) {
    console.error('Invalid category UUID provided.');
    return;
  }

  const category = categories.value.find((category: ProductCategory) => category.id === categoryId);

  if (category) {
    selectedCategory.value = category;
  }
};

// Function to fetch categories and then fetch products based on the first category
const fetchCategoriesAndProducts = async () => {
  // Fetch categories
  const { data: fetchedCategories, error: categoryError, pending: categoryPending } = await useFetch<ProductCategory[]>(
    `${$apiBaseUrl()}/categories`,
    {
      headers: {
        'Accept-Language': process.server
          ? useRequestHeaders()['accept-language']
          : navigator.language,
      },
    }
  );

  if (categoryError.value) {
    console.error('Error fetching categories:', categoryError.value);
    // Handle error state as needed
    return;
  }

  if (fetchedCategories.value && fetchedCategories.value.length > 0) {
    categories.value = fetchedCategories.value;
    selectedCategory.value = fetchedCategories.value[0];
    await fetchProductsByCategory(fetchedCategories.value[0].id);
  }
};

// Initial fetch of categories and products
await fetchCategoriesAndProducts();

// Watch for changes in selectedCategoryUuid to fetch products
watch(
  selectedCategory,
  (newCategory, oldCategory) => {
    if (newCategory && newCategory !== oldCategory) {
      fetchProductsByCategory(newCategory.id);
    }
  }
);

// Compute filtered products based on debounced search value
const filteredProducts = computed(() => {
  if (!debouncedSearchValue.value.trim()) return selectedProducts.value || [];
  if (!selectedProducts.value) return [];

  const searchTerms = debouncedSearchValue.value.trim().toLowerCase().split(/\s+/);

  return selectedProducts.value.filter((product: ProductInfo) => {
    const combinedName = (selectedCategory.value?.name + " " + product.name).toLowerCase();
    return searchTerms.every((term: string) => combinedName.includes(term));
  });
});

// Function to clear the search input
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
</style>