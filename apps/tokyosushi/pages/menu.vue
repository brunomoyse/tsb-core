<template>
  <div class="flex">
    <!-- Main Content -->
    <div ref="contentContainer" class="w-full min-w-0 flex-1">
      <!-- The page's heading for screen readers (the visible headings are the categories, h2): the menu had no h1. -->
      <h1 class="sr-only">{{ $t('nav.menu') }}</h1>
      <!-- Ordering banner: closed (loaded config only), closed but pre-orderable, or the config could not be loaded -->
      <div
        v-if="isClosed"
        data-testid="menu-restaurant-closed"
        class="mx-0 sm:mx-4 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-amber-700 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <div class="min-w-0">
          <p class="text-amber-900 text-sm font-semibold">{{ $t('menu.restaurantClosed') }}</p>
          <p class="text-amber-800 text-sm mt-0.5">{{ $t('menu.restaurantClosedDetails') }}</p>
        </div>
      </div>
      <div
        v-else-if="isPreorderOnly && preorderTime"
        role="status"
        data-testid="menu-preorder-banner"
        class="mx-0 sm:mx-4 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-amber-700 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-amber-900 text-sm font-semibold">
          {{ $t('ordering.closedPreorder', { time: preorderTime }) }}
        </p>
      </div>
      <LoadError
        v-else-if="configLoadFailed"
        :message="$t('ordering.loadFailed')"
        :busy="configPending"
        class="mx-0 sm:mx-4 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900"
        @retry="retryConfig()"
      />

      <!-- Search, filters and categories. From 640px up they form one sticky block. On a phone the block dissolves (`contents`)
           and only the category strip below sticks: stuck under the navbar, search + filters + strip took over half of a
           568px screen, so the search and the filters scroll away with the page. -->
      <section
        ref="stickyBlock"
        class="contents sm:block sm:sticky sm:z-20 sm:pt-8 sm:bg-tsb-one sm:top-0"
      >
        <!-- Search + Filter Section -->
        <section class="pt-4 sm:pt-0 mb-4 px-0 sm:px-4 space-y-1.5">
          <!-- Search Bar (full-width, labeled) -->
          <div
            class="relative flex items-center rounded-2xl bg-tsb-two h-[44px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-tsb-one"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500 pointer-events-none"
              viewBox="0 -960 960 960"
              fill="currentColor"
            >
              <path
                d="M765-144 526-383q-30 22-65.79 34.5-35.79 12.5-76.18 12.5Q284-336 214-406t-70-170q0-100 70-170t170-70q100 0 170 70t70 170.03q0 40.39-12.5 76.18Q599-464 577-434l239 239-51 51ZM384-408q70 0 119-49t49-119q0-70-49-119t-119-49q-70 0-119 49t-49 119q0 70 49 119t119 49Z"
              />
            </svg>
            <label class="sr-only" for="menuSearch">{{ $t('nav.searchLabel') }}</label>
            <input
              id="menuSearch"
              ref="searchInputRef"
              v-model="searchValue"
              type="search"
              :placeholder="$t('nav.search')"
              class="w-full h-full bg-transparent rounded-2xl pl-11 pr-10 outline-none text-base sm:text-sm placeholder-gray-600"
            />
            <button
              type="button"
              v-show="searchValue.length > 0"
              @click.stop="clearSearch"
              :aria-label="$t('nav.clearSearch')"
              class="absolute right-0 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-neutral-600 hover:text-neutral-700 transition-colors rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Filter Row (compact chips): one horizontally scrolling row on a phone (padding + negative margin keep the focus rings inside the scroller), wrapping from 640px up -->
          <div
            class="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar -mx-1.5 -my-1.5 px-1.5 py-1.5 sm:flex-wrap sm:overflow-visible sm:m-0 sm:p-0 [&>button]:shrink-0"
          >
            <!-- Halal toggle -->
            <button
              type="button"
              @click="toggleFilter('halal')"
              :aria-pressed="activeFilters.has('halal')"
              class="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              :class="
                activeFilters.has('halal')
                  ? 'bg-blue-700 text-white shadow-sm shadow-blue-200'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
              "
            >
              <DietIcon
                kind="halal"
                class="w-3.5 h-3.5 transition-transform duration-200"
                :class="activeFilters.has('halal') ? 'scale-110' : ''"
              />
              {{ $t('menu.halal') }}
            </button>

            <!-- Vegan toggle -->
            <button
              type="button"
              @click="toggleFilter('vegetarian')"
              :aria-pressed="activeFilters.has('vegetarian')"
              class="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              :class="
                activeFilters.has('vegetarian')
                  ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-200'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
              "
            >
              <DietIcon
                kind="vegetarian"
                class="w-3.5 h-3.5 transition-transform duration-200"
                :class="activeFilters.has('vegetarian') ? 'scale-110' : ''"
              />
              {{ $t('menu.vegetarian') }}
            </button>

            <!-- Spicy toggle -->
            <button
              type="button"
              @click="toggleFilter('spicy')"
              :aria-pressed="activeFilters.has('spicy')"
              class="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              :class="
                activeFilters.has('spicy')
                  ? 'bg-primary-600 text-white shadow-sm shadow-red-200'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-red-50 hover:text-red-800 hover:border-red-200'
              "
            >
              <DietIcon
                kind="spicy"
                class="w-3.5 h-3.5 transition-transform duration-200"
                :class="activeFilters.has('spicy') ? 'scale-110' : ''"
              />
              {{ $t('menu.spicy') }}
            </button>

            <!-- Delivery zone chip on desktop -->
            <div class="hidden sm:block sm:ml-auto">
              <DeliveryZoneChip />
            </div>
          </div>
        </section>

        <!-- Categories Scroll -->
        <section
          v-if="!searchValue.trim().length"
          ref="categoryBar"
          class="sticky top-[var(--nav-h)] z-20 bg-tsb-one pt-1 pb-2 sm:relative sm:z-auto sm:bg-transparent sm:top-auto sm:pt-0 sm:pb-0 mx-0 sm:mx-4 sm:mb-2"
        >
          <!-- Left gradient fade -->
          <div
            class="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-tsb-one to-transparent z-10 pointer-events-none transition-opacity duration-300 flex items-center justify-start pl-1"
            :class="canScrollLeft ? 'opacity-100' : 'opacity-0'"
          >
            <svg
              class="w-4 h-4 text-primary-700/60"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>

          <!-- Scrollable Category Tabs -->
          <div
            ref="scrollContainer"
            @mousedown="startDrag"
            @mousemove="onDrag"
            @mouseup="stopDrag"
            @mouseleave="stopDrag"
            :class="[
              'flex overflow-x-auto gap-2 py-1 no-scrollbar scroll-smooth motion-reduce:scroll-auto snap-x snap-mandatory',
              isDragging ? 'cursor-grabbing' : 'cursor-grab',
            ]"
          >
            <CategoryCard
              v-for="cat in displayedCategories"
              :key="cat.id"
              :id="`category-card-${cat.id}`"
              :active="activeCategoryId === cat.id"
              :category="{ id: cat.id, name: cat.name, order: cat.order } as ProductCategory"
              class="snap-center"
              @select="scrollToCategory"
            />
          </div>

          <!-- Right gradient fade -->
          <div
            class="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-tsb-one to-transparent z-10 pointer-events-none transition-opacity duration-300 flex items-center justify-end pr-1"
            :class="canScrollRight ? 'opacity-100' : 'opacity-0'"
          >
            <svg
              class="w-4 h-4 text-primary-700/60"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </section>
      </section>

      <!-- Allergen Notice (compact, dismissible, scrolls away with content) -->
      <MenuAllergenNotice
        :show="showAllergenNotice"
        :phone-href="phoneHref"
        :phone-label="phoneLabel"
        @dismiss="dismissAllergenNotice"
      />

      <!-- The menu could not be loaded: say so and offer Retry, instead of a skeleton that never ends -->
      <section
        v-if="!dataCategories && categoriesError"
        class="max-w-7xl mx-auto px-0 sm:px-4 py-4"
      >
        <LoadError
          :message="$t('menu.loadFailed')"
          :busy="categoriesPending"
          data-testid="menu-load-error"
          class="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-800"
          @retry="refetchCategories()"
        />
      </section>

      <!-- Skeleton Loading State -->
      <section v-else-if="!dataCategories" class="max-w-7xl mx-auto px-0 sm:px-4 py-4 space-y-12">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <div class="h-6 w-32 bg-neutral-200 rounded animate-pulse ml-0 sm:ml-4"></div>
          <div class="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 md:grid-cols-4">
            <div
              v-for="j in 4"
              :key="j"
              class="h-[260px] bg-neutral-200 rounded-xl animate-pulse"
            ></div>
          </div>
        </div>
      </section>

      <!-- Products Grid -->
      <section v-else class="max-w-7xl mx-auto px-0 sm:px-4 py-4 space-y-12">
        <div
          v-for="(cat, catIdx) in displayedCategories"
          :key="cat.id"
          :id="`category-${cat.id}`"
          class="space-y-4"
        >
          <!-- Category Title with Japanese bracket decoration -->
          <div class="flex items-center gap-3 ml-0 sm:ml-4">
            <span class="text-primary-300/40 text-2xl leading-none font-light" aria-hidden="true"
              >「</span
            >
            <h2
              translate="no"
              class="font-channel inline-block text-xl font-semibold text-neutral-800 tracking-wide"
            >
              {{ cat.name }}
            </h2>
            <span class="text-primary-300/40 text-2xl leading-none font-light" aria-hidden="true"
              >」</span
            >
          </div>

          <!-- Product Cards -->
          <div
            v-if="cat.products.length"
            class="grid grid-cols-2 gap-3 sm:gap-5 justify-center sm:grid-cols-3 sm:justify-start md:[grid-template-columns:repeat(auto-fit,minmax(auto,185px))]"
          >
            <ProductCard
              :index="(cardOffsets[catIdx] ?? 0) + idx"
              :product="prod"
              :ordering-disabled="!isCartAddAvailable"
              v-for="(prod, idx) in cat.products"
              @openProductModal="openModal(prod.id)"
              :key="prod.id"
            />
          </div>

          <!-- Empty State -->
          <div v-else class="text-center text-neutral-600 italic">
            {{ $t('menu.noProduct') }}
          </div>
        </div>

        <!-- The menu loaded and is truly empty -->
        <div v-if="!baseCategories.length" class="text-center py-12 text-gray-500">
          <p class="text-lg">{{ $t('menu.noProduct') }}</p>
        </div>

        <!-- Search No Results -->
        <div
          v-if="searchValue.trim().length && displayedCategories.length === 0"
          class="text-center py-12 text-neutral-600"
        >
          <p class="text-lg">{{ $t('menu.noResults', { query: searchValue }) }}</p>
        </div>

        <!-- Filter No Results -->
        <div
          v-if="
            !searchValue.trim().length && activeFilters.size > 0 && displayedCategories.length === 0
          "
          class="text-center py-12 text-neutral-600"
        >
          <p class="text-lg">{{ $t('menu.noProduct') }}</p>
        </div>
      </section>
    </div>

    <!-- Desktop Cart Sidebar -->
    <aside
      v-if="hasCartItems"
      class="hidden lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:block lg:w-[28%] lg:min-w-[18.5rem] lg:shrink-0"
    >
      <SideCart :is-ordering-available="!isClosed" :preorder-time="preorderTime" />
    </aside>

    <ClientOnly>
      <Transition name="modal-backdrop">
        <div
          v-if="routedProductId"
          class="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <Transition name="modal-panel" appear>
            <ProductModal
              :key="`${routedProductId}-${modalAttempt}`"
              :product="routedProductId"
              :ordering-disabled="!isCartAddAvailable"
              @close="closeModal"
              @retry="modalAttempt++"
            />
          </Transition>
        </div>
      </Transition>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { breadcrumbList, useJsonLd } from '#engine/composables/useJsonLd'
import { useLocalizedUrl } from '#engine/composables/useLocalizedUrl'
definePageMeta({
  sitemap: { priority: 0.9, changefreq: 'weekly' },
  // The layout leaves the restaurant config to this page on the server (see layouts/default.vue).
  loadsRestaurantConfig: true,
})

import type { Product, ProductCategory } from '#engine/types'
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGqlQuery, useGqlSubscription, useRoute, useRouter } from '#imports'
import CategoryCard from '~/components/menu/CategoryCard.vue'
import DeliveryZoneChip from '#engine/components/delivery/DeliveryZoneChip.vue'
import ProductCard from '~/components/menu/ProductCard.vue'
import { useBodyScrollLock } from '#engine/composables/useBodyScrollLock'
import { useHaptics } from '#engine/composables/useHaptics'
import MenuAllergenNotice from '#engine/components/menu/MenuAllergenNotice.vue'
import { whenIdle } from '#engine/utils/whenIdle'
import { useMenuCategoryScrollspy } from '#engine/composables/useMenuCategoryScrollspy'
import { useStickyTopOffset } from '#engine/composables/useStickyTopOffset'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { useCartStore } from '#engine/stores/cart'
import { useDebounce, useEventBus, useMediaQuery, useMounted } from '@vueuse/core'
import { useBrandPhone } from '#engine/composables/useBrandPhone'
import LoadError from '#engine/components/LoadError.vue'
import { useOrderingAvailability } from '#engine/composables/useOrderingAvailability'
import { useTracking } from '#engine/composables/useTracking'
import { buildMenuSchema } from '#engine/utils/menuSchema'
import { inLanguageTag } from '#engine/utils/seoDefaults'
import { searchFromQuery } from '#engine/utils/menuSearch'
import {
  baseCategories as baseCategoriesOf,
  displayedCategories as displayedCategoriesOf,
  flattenProducts,
  searchProducts,
} from '#engine/utils/menuCatalog'
import { categoryCardOffsets } from '#engine/utils/menuImagePriority'

/*
 * The product modal and the desktop cart are not part of the first paint (the modal opens on a tap, the cart only has
 * something to show once the cart store has hydrated): their code is its own chunk, fetched when the browser is idle
 * (audit PR 6.2, P12) so the first tap does not wait for it.
 */
const loadProductModal = () => import('~/components/menu/ProductModal.vue')
const ProductModal = defineAsyncComponent(loadProductModal)
const SideCart = defineAsyncComponent(() => import('#engine/components/cart/SideCart.vue'))
onMounted(() => {
  whenIdle(() => {
    void loadProductModal()
  })
})

const { selection: hapticSelection } = useHaptics()
const route = useRoute()
// The product open in the modal: only a plain `?product=<id>` (a repeated or empty parameter opens nothing).
const routedProductId = computed(() =>
  typeof route.query.product === 'string' && route.query.product ? route.query.product : null,
)
const router = useRouter()
const { trackEvent } = useTracking()
const { phoneHref, phoneLabel } = useBrandPhone()
const showAllergenNotice = ref(true)
onMounted(() => {
  if (localStorage.getItem('allergenNoticeDismissed') === 'true') {
    showAllergenNotice.value = false
  }
})
const dismissAllergenNotice = () => {
  showAllergenNotice.value = false
  localStorage.setItem('allergenNoticeDismissed', 'true')
}

// Bumped by the modal's Retry: remounting it runs its product query again.
const modalAttempt = ref(0)

const openModal = (id: string) => {
  // Add productId to URL query
  router.push({ query: { product: id } })
}

const closeModal = () => {
  // Remove query parameter
  router.push({ query: {} })
}

// Lock body scroll when modal is open (shared, nesting-safe lock: a lightbox over the modal keeps it locked)
useBodyScrollLock(() => Boolean(routedProductId.value))

/**
 * GraphQL Query
 */
const PRODUCT_CATEGORIES = /* GraphQL */ `
  query {
    productCategories {
      id
      name
      order
      slug
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
        isLunchOnly
        isSpicy
        isVegetarian
        isDiscountable
        category {
          id
          name
          slug
        }
        choices {
          id
        }
        choiceGroups {
          id
          name
          minSelections
          maxSelections
          sortOrder
          choices {
            id
          }
        }
      }
    }
  }
`

/**
 * Stores & Data Fetch
 */
const cartStore = useCartStore()
// SSR renders the empty-cart state; cart store rehydrates from localStorage after mount.
const isMounted = useMounted()
const hasCartItems = computed(() => isMounted.value && cartStore.products.length > 0)

/*
 * The restaurant config (ordering banners, add-to-cart gate) and the categories do not depend on each other, so they
 * are asked together: one API round-trip on the server instead of two in a row (audit PR 6.1, P10). A config that
 * failed to load says nothing about opening hours: only a loaded config that says "closed" shows the closed banner and
 * only a loaded "ordering off" disables adding to the cart.
 */
const [
  {
    isClosed,
    isPreorderOnly,
    isOrderingDisabled,
    preorderTime,
    loadFailed: configLoadFailed,
    pending: configPending,
    retry: retryConfig,
  },
  {
    data: dataCategories,
    error: categoriesError,
    pending: categoriesPending,
    refresh: refetchCategories,
  },
] = await Promise.all([
  useOrderingAvailability(),
  useGqlQuery<{
    productCategories: ProductCategory[]
  }>(PRODUCT_CATEGORIES, {}, { immediate: true, cache: true }),
])
const isCartAddAvailable = computed(() => !isOrderingDisabled.value)

/**
 * Live product updates via WebSocket subscription
 */
const SUB_PRODUCT_UPDATED = /* GraphQL */ `
  subscription {
    productUpdated {
      id
      isAvailable
      isVisible
      price
      code
      pieceCount
      isHalal
      isLunchOnly
      isSpicy
      isVegetarian
      isDiscountable
    }
  }
`
const liveProductData = ref<Record<string, Partial<Product>>>({})

const { data: liveProduct } = useGqlSubscription<{ productUpdated: Partial<Product> }>(
  SUB_PRODUCT_UPDATED,
)

watch(liveProduct, (val) => {
  if (!val?.productUpdated?.id) return
  liveProductData.value = {
    ...liveProductData.value,
    [val.productUpdated.id]: {
      ...liveProductData.value[val.productUpdated.id],
      ...val.productUpdated,
    },
  }
})

/**
 * Refs & Reactive State
 */
// A shared link or the home page's SearchAction opens the menu with ?q=<term> already in the box.
const searchValue = ref(searchFromQuery(route.query.q))
const debouncedSearchValue = useDebounce(searchValue, 300)
const isDragging = ref(false)
const dragStartX = ref(0)
const scrollStartX = ref(0)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
// The sticky element at the current breakpoint: the whole block from 640px up, the category strip alone on a phone (it is absent while a search is active).
const stickyBlock = ref<HTMLElement | null>(null)
const categoryBar = ref<HTMLElement | null>(null)
const isPhone = useMediaQuery('(max-width: 639.98px)')
const stickyHeader = computed(() => (isPhone.value ? categoryBar.value : stickyBlock.value))

const searchInputRef = ref<HTMLInputElement | null>(null)

const clearSearch = () => {
  searchValue.value = ''
  searchInputRef.value?.focus()
}

// Filter state
const activeFilters = ref<Set<string>>(new Set())
const toggleFilter = (filter: string) => {
  hapticSelection()
  const next = new Set(activeFilters.value)
  const willEnable = !next.has(filter)
  if (willEnable) {
    next.add(filter)
  } else {
    next.delete(filter)
  }
  activeFilters.value = next
  trackEvent('dietary_filter_toggled', {
    filter,
    enabled: willEnable,
    active_filters_count: next.size,
  })
}

/**
 * Computed: Categories & Products
 */
// The menu's catalogue rules are pure (engine, utils/menuCatalog.ts): live updates merged, only visible products, the search, the dietary filters.
const baseCategories = computed(() =>
  baseCategoriesOf(dataCategories.value?.productCategories ?? [], liveProductData.value),
)

// All products flattened for search
const allProducts = computed<Product[]>(() => flattenProducts(baseCategories.value))

// Filtered list based on search query (all words must match)
const filteredProducts = computed(() =>
  searchProducts(allProducts.value, debouncedSearchValue.value),
)

// Categories displayed: the whole menu, or the products matching the search and the dietary filters (AND logic) grouped back
const displayedCategories = computed<ProductCategory[]>(() =>
  displayedCategoriesOf(baseCategories.value, allProducts.value, {
    query: debouncedSearchValue.value,
    filters: activeFilters.value,
    excludeComposer: false,
  }),
)

// Where each category starts on the page: a card's image priority follows its place on the page, not in its category (see utils/menuImagePriority.ts).
const cardOffsets = computed(() =>
  categoryCardOffsets(displayedCategories.value.map((cat) => cat.products.length)),
)

// Category scroll-spy and jump (engine composable shared with the other brand): the band starts under the sticky header, a jump lands under it through the page's scroll-padding-top.
const categorySectionIds = computed(() => displayedCategories.value.map((cat) => cat.id))
const { activeCategoryId, chipRowRef, scrollToCategory } = useMenuCategoryScrollspy(
  categorySectionIds,
  { header: stickyHeader, selectFirst: true },
)
const scrollContainer = chipRowRef
// The sticky header publishes the bottom edge it covers, so a focused card or a jump clears it.
useStickyTopOffset(stickyHeader)

/**
 * Utility: Update Arrow Visibility
 */
const updateScrollButtons = () => {
  // The strip is not rendered while a search is active, which includes a menu opened with ?q=.
  const el = scrollContainer.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 0
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth
}

/**
 * Drag-to-scroll Handlers
 */
const startDrag = (e: MouseEvent) => {
  if (!scrollContainer.value) return
  isDragging.value = true
  dragStartX.value = e.pageX
  scrollStartX.value = scrollContainer.value.scrollLeft
}
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !scrollContainer.value) return
  const dx = e.pageX - dragStartX.value
  scrollContainer.value.scrollLeft = scrollStartX.value - dx
  updateScrollButtons()
}
const stopDrag = () => {
  isDragging.value = false
  updateScrollButtons()
}

/**
 * Watchers
 */
// Track search queries
watch(debouncedSearchValue, (newVal, oldVal) => {
  const q = newVal.trim()
  if (q.length > 0) {
    trackEvent('search_query_entered', { query: q, results_count: filteredProducts.value.length })
  } else if (oldVal && oldVal.trim().length > 0) {
    trackEvent('search_cleared')
  }
})

/**
 * Schema.org Structured Data
 */
const config = useRuntimeConfig()
const { t, locale } = useI18n()

const localizedUrl = useLocalizedUrl()

watch(
  allProducts,
  () => {
    // Inside the watcher: the language is the current one when the menu (re)loads after a language switch.
    const menuUrl = localizedUrl('/menu')
    useJsonLd(
      [
        {
          '@type': 'WebPage',
          name: t('schema.menu.title'),
          description: t('schema.menu.description'),
        },
        breadcrumbList([
          { name: t('schema.breadcrumb.home'), item: localizedUrl() },
          { name: t('schema.breadcrumb.menu'), item: menuUrl },
        ]),
        buildMenuSchema({
          products: allProducts.value,
          menuUrl,
          baseUrl: config.public.baseUrl as string,
          s3BaseUrl: config.public.s3bucketUrl as string,
          name: t('schema.menu.name'),
          description: t('schema.menu.description'),
          inLanguage: inLanguageTag(locale.value),
        }),
      ],
      'page-jsonld',
    )
  },
  { immediate: true },
)

useSeoMeta({
  title: t('schema.menu.title'),
  ogType: 'website',
  ogTitle: t('schema.menu.title'),
  description: t('schema.menu.description'),
  ogDescription: t('schema.menu.description'),
  ...useLocaleSeoMeta(),
})

/**
 * Preserve scroll anchor across the cart sidebar appearing/disappearing.
 * The grid reflows between ~100vw and ~67vw, so cards jump vertically.
 * We capture an anchor card's top before the reflow and scroll by the delta.
 */
const preserveScrollFor = (cardEl: HTMLElement | null) => {
  if (!cardEl || window.innerWidth < 1024) return
  const { productId } = cardEl.dataset
  if (!productId) return
  const oldTop = cardEl.getBoundingClientRect().top
  nextTick(() => {
    requestAnimationFrame(() => {
      const newCard = document.querySelector<HTMLElement>(`[data-product-id="${productId}"]`)
      if (!newCard) return
      const delta = newCard.getBoundingClientRect().top - oldTop
      if (Math.abs(delta) > 1) window.scrollBy(0, delta)
    })
  })
}

const findTopVisibleCard = (): HTMLElement | null => {
  const cards = document.querySelectorAll<HTMLElement>('[data-product-id]')
  const stickyHeight = stickyHeader.value?.offsetHeight ?? 0
  for (const card of cards) {
    const rect = card.getBoundingClientRect()
    if (rect.bottom > stickyHeight && rect.top < window.innerHeight) return card
  }
  return null
}

const handleCartItemAdded = ({ productId }: { productId: string }) => {
  if (cartStore.products.length !== 1) return
  preserveScrollFor(document.querySelector<HTMLElement>(`[data-product-id="${productId}"]`))
}

watch(
  () => cartStore.products.length,
  (newLen, oldLen) => {
    if (oldLen >= 1 && newLen === 0) preserveScrollFor(findTopVisibleCard())
  },
)

// Client only: the bus is a module singleton and SSR never disposes scopes.
// A server-side listener would pin every rendered request (heap leak, 2026-10).
if (import.meta.client) useEventBus(cartItemAddedKey).on(handleCartItemAdded)

onMounted(() => {
  updateScrollButtons()
  scrollContainer.value?.addEventListener('scroll', updateScrollButtons)
})

onUnmounted(() => {
  scrollContainer.value?.removeEventListener('scroll', updateScrollButtons)
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
input[type='search']::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-backdrop-enter-active,
.modal-backdrop-leave-active {
  transition: opacity 0.2s ease-out;
}
.modal-backdrop-enter-from,
.modal-backdrop-leave-to {
  opacity: 0;
}
.modal-panel-enter-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
}
.modal-panel-leave-active {
  transition:
    opacity 0.15s ease-in,
    transform 0.15s ease-in;
}
.modal-panel-enter-from,
.modal-panel-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
