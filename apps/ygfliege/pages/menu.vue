<template>
  <div class="flex">
    <!-- Main Content -->
    <!-- Widths are plain fractions now: the old calc()s subtracted the
             142px side rail that the sticky TopNavbar replaced. -->
    <div
      ref="contentContainer"
      class="w-full min-w-0"
      :class="hasCartItems ? 'lg:w-2/3' : 'lg:w-full'"
    >
      <!-- The page's heading for screen readers (the visible headings are the categories, h2): the menu had no h1. -->
      <h1 class="sr-only">{{ $t('nav.menu') }}</h1>
      <!-- Ordering banner: closed (loaded config only), closed but pre-orderable, or the config could not be loaded -->
      <div v-if="isClosed" data-testid="menu-restaurant-closed" class="max-w-7xl mx-auto mt-4 px-4">
        <div
          class="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3"
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
      </div>
      <div
        v-else-if="isPreorderOnly && preorderTime"
        role="status"
        data-testid="menu-preorder-banner"
        class="max-w-7xl mx-auto mt-4 px-4"
      >
        <div
          class="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3"
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
      </div>
      <div v-else-if="configLoadFailed" class="max-w-7xl mx-auto mt-4 px-4">
        <LoadError
          :message="$t('ordering.loadFailed')"
          :busy="configPending"
          class="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900"
          @retry="retryConfig()"
        />
      </div>

      <!-- Sticky search header. The dietary filter chips and the category
                 tab strip that used to live here were removed deliberately: the
                 menu is ~30 products across 6 short sections, so scanning beats
                 filtering, and a tab nav over so little content is chrome. -->
      <!-- From 640px up this block (the search) sticks. On a phone it dissolves (`contents`) and only the category strip below
           sticks: search + zone chip + strip took two rows more than the strip is worth, so the search scrolls away. -->
      <section
        ref="stickyBlock"
        class="contents sm:block sm:sticky sm:z-20 sm:pt-6 sm:bg-ygf-bg sm:top-16"
      >
        <!-- Aligned to the same max-w-7xl container as the product grid
                     so the controls don't stretch full-bleed on wide screens. -->
        <!-- Under ~360px the chip drops under the search instead of squeezing the input. -->
        <section
          class="max-w-7xl mx-auto mb-4 px-4 pt-4 sm:pt-0 flex items-center gap-3 max-[359px]:flex-wrap"
        >
          <!-- Search Bar (labeled) -->
          <div
            class="relative flex flex-1 max-[359px]:basis-full sm:max-w-md items-center rounded-full bg-white border border-ygf-orange-100 h-11 shadow-ygf-sm transition-colors duration-300 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-ygf-bg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-600 pointer-events-none"
              viewBox="0 -960 960 960"
              fill="currentColor"
            >
              <path
                d="M765-144 526-383q-30 22-65.79 34.5-35.79 12.5-76.18 12.5Q284-336 214-406t-70-170q0-100 70-170t170-70q100 0 170 70t70 170.03q0 40.39-12.5 76.18Q599-464 577-434l239 239-51 51ZM384-408q70 0 119-49t49-119q0-70-49-119t-119-49q-70 0-119 49t-49 119q0 70 49 119t119 49Z"
              />
            </svg>
            <label class="sr-only" for="menuSearch">{{ $t('nav.search') }}</label>
            <input
              id="menuSearch"
              ref="searchInputRef"
              v-model="searchValue"
              type="search"
              :placeholder="$t('nav.search')"
              class="w-full h-full bg-transparent rounded-full pl-11 pr-10 outline-none text-base sm:text-sm text-ygf-black placeholder:text-neutral-600"
            />
            <button
              type="button"
              v-show="searchValue.length > 0"
              @click.stop="clearSearch"
              :aria-label="$t('common.clear')"
              class="absolute right-0 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-neutral-600 hover:text-ygf-black transition-colors rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <!-- Delivery zone on a phone: the header carries the logo with its name, so the chip sits beside the search (the desktop header, from xl up, shows it). -->
          <ClientOnly>
            <DeliveryZoneChip compact class="xl:hidden shrink-0 max-w-[9.5rem]" />
          </ClientOnly>
        </section>

        <!-- Mobile-only category jump-nav. On desktop 3–4 sections fit
                     per screen and scanning beats chrome; at 375px the page is
                     ~10k px tall and needs a way to jump. -->
        <nav
          v-if="displayedCategories.length > 1"
          ref="categoryBar"
          :aria-label="$t('mkt.menu.categoriesNav')"
          class="sm:hidden sticky top-[80px] z-20 bg-ygf-bg max-w-7xl mx-auto px-4 pt-1 pb-3"
        >
          <div ref="chipRowRef" class="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              v-for="cat in displayedCategories"
              :key="cat.id"
              type="button"
              translate="no"
              class="chip shrink-0 max-w-[calc(100%-1rem)]"
              :class="{ 'chip-selected': activeCategoryId === cat.id }"
              :title="cat.name"
              :aria-current="activeCategoryId === cat.id ? 'true' : undefined"
              :data-chip-category="cat.id"
              @click="scrollToCategory(cat.id)"
            >
              <span class="truncate">{{ cat.name }}</span>
            </button>
          </div>
        </nav>
      </section>

      <!-- Allergen Notice (compact, dismissible, scrolls away with content) -->
      <MenuAllergenNotice
        contained
        :show="showAllergenNotice"
        :phone-href="telHref(brand.phone)"
        :phone-label="brand.phone"
        @dismiss="dismissAllergenNotice"
      />

      <!-- The menu could not be loaded: say so and offer Retry, instead of a skeleton that never ends -->
      <section v-if="!dataCategories && categoriesError" class="max-w-7xl mx-auto px-4 py-4">
        <LoadError
          :message="$t('menu.loadFailed')"
          :busy="categoriesPending"
          data-testid="menu-load-error"
          class="px-4 py-3 bg-ygf-orange-50 border border-ygf-orange-200 rounded-lg text-ygf-black"
          @retry="refetchCategories()"
        />
      </section>

      <!-- Skeleton Loading State -->
      <section v-else-if="!dataCategories" class="max-w-7xl mx-auto px-4 py-4 space-y-12">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <div class="h-6 w-32 bg-ygf-orange-100/60 rounded animate-pulse"></div>
          <div class="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
            <div
              v-for="j in 4"
              :key="j"
              class="h-[260px] bg-ygf-orange-100/60 rounded-ygf-card animate-pulse"
            ></div>
          </div>
        </div>
      </section>

      <!-- Products Grid -->
      <section v-else class="max-w-7xl mx-auto px-4 py-4 space-y-12">
        <!-- Build-your-own-bowl is the signature experience, so it gets a
                     full-width entry rather than an equal-weight grid tile. Hidden
                     while searching or filtering, where the grid is the answer. -->
        <article
          v-if="composerProduct && !searchValue.trim().length"
          data-testid="composer-hero"
          class="card card-interactive grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_260px] overflow-hidden bg-ygf-orange-50"
        >
          <div class="min-w-0 p-6 sm:p-8 flex flex-col items-start justify-center gap-3">
            <span class="section-label">{{ $t('composer.eyebrow') }}</span>
            <h2 translate="no" class="section-title text-2xl sm:text-3xl">
              {{ composerProduct.name }}
            </h2>
            <p class="text-sm text-ygf-black/70 max-w-prose">{{ $t('composer.heroSubtitle') }}</p>
            <button
              type="button"
              data-testid="composer-hero-cta"
              class="btn btn-primary mt-2 max-w-full whitespace-normal text-center"
              :disabled="!isCartAddAvailable || !composerProduct.isAvailable"
              @click="openModal(composerProduct.id)"
            >
              {{ $t('composer.open') }}
            </button>
          </div>
          <MktPicture
            src="/images/bowls/beef-bone-top"
            :widths="[320, 560, 800]"
            :fallback-width="560"
            :fallback-height="560"
            :alt="composerProduct.name"
            sizes="(min-width: 640px) 260px, 100vw"
            eager
            img-class="w-full h-full object-contain sm:object-cover p-3 sm:p-0 aspect-[4/3] sm:aspect-auto"
          />
        </article>

        <div
          v-for="(cat, catIdx) in displayedCategories"
          :key="cat.id"
          :id="`category-${cat.id}`"
          class="space-y-4"
        >
          <!-- Category heading. The 「 」 brackets that used to frame
                         this were Tokyo Sushi's Japanese motif — wrong for a
                         Chinese brand. Replaced with the vitrine site's rule +
                         eyebrow rhythm. -->
          <div class="flex items-center gap-4">
            <h2
              translate="no"
              class="section-title font-display text-xl sm:text-2xl whitespace-nowrap"
            >
              {{ cat.name }}
            </h2>
            <span aria-hidden="true" class="h-px flex-1 bg-ygf-orange-200" />
          </div>

          <!-- Product Cards -->
          <div
            v-if="cat.products.length"
            class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
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
        <div v-if="!baseCategories.length" class="text-center py-12 text-neutral-600">
          <p class="text-lg">{{ $t('menu.noProduct') }}</p>
        </div>

        <!-- Search No Results -->
        <div
          v-if="searchValue.trim().length && displayedCategories.length === 0"
          class="text-center py-12 text-neutral-600"
        >
          <p class="text-lg">{{ $t('menu.noResults', { query: searchValue }) }}</p>
        </div>
      </section>
    </div>

    <!-- Desktop Cart Sidebar -->
    <aside
      v-if="hasCartItems"
      class="hidden lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:block lg:w-1/3 lg:pr-4"
    >
      <SideCart :is-ordering-available="!isClosed" :preorder-time="preorderTime" />
    </aside>

    <ClientOnly>
      <Transition name="modal-backdrop">
        <div
          v-if="routedProductId"
          class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center sm:p-4 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <Transition name="modal-panel" appear>
            <!-- Composer products get the full assembly flow; every
                             fixed set stays on the ordinary product modal. -->
            <BowlComposer
              v-if="routedProductIsComposer"
              :key="`${routedProductId}-${modalAttempt}`"
              :product="routedProductId"
              :ordering-disabled="!isCartAddAvailable"
              @close="closeModal"
              @retry="modalAttempt++"
            />
            <ProductModal
              v-else
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
import { computed, onMounted, ref, watch } from 'vue'
import { useGqlQuery, useGqlSubscription, useRoute, useRouter } from '#imports'
import ProductCard from '~/components/menu/ProductCard.vue'
import DeliveryZoneChip from '#engine/components/delivery/DeliveryZoneChip.vue'
import BowlComposer from '~/components/menu/BowlComposer.vue'
import MktPicture from '~/components/mkt/MktPicture.vue'
import ProductModal from '~/components/menu/ProductModal.vue'
import SideCart from '#engine/components/cart/SideCart.vue'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { useCartStore } from '#engine/stores/cart'
import { useDebounce, useEventBus, useMediaQuery, useMounted } from '@vueuse/core'
import LoadError from '#engine/components/LoadError.vue'
import { useBodyScrollLock } from '#engine/composables/useBodyScrollLock'
import { useOrderingAvailability } from '#engine/composables/useOrderingAvailability'
import { useTracking } from '#engine/composables/useTracking'
import { buildMenuSchema } from '#engine/utils/menuSchema'
import { inLanguageTag } from '#engine/utils/seoDefaults'
import { searchFromQuery } from '#engine/utils/menuSearch'
import {
  baseCategories as baseCategoriesOf,
  displayedCategories as displayedCategoriesOf,
  flattenProducts,
  isComposerProduct,
  searchProducts,
} from '#engine/utils/menuCatalog'
import { productPhotoUrls } from '~/data/productPhotos'
import { categoryCardOffsets } from '#engine/utils/menuImagePriority'
import { telHref } from '#engine/utils/phone'
import MenuAllergenNotice from '#engine/components/menu/MenuAllergenNotice.vue'
import { useMenuCategoryScrollspy } from '#engine/composables/useMenuCategoryScrollspy'
import { useStickyTopOffset } from '#engine/composables/useStickyTopOffset'

const { brand } = useAppConfig()
const route = useRoute()
// The product open in the modal: only a plain `?product=<id>` (a repeated or empty parameter opens nothing).
const routedProductId = computed(() =>
  typeof route.query.product === 'string' && route.query.product ? route.query.product : null,
)
const router = useRouter()
const { trackEvent } = useTracking()
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

// Bumped by a modal's Retry: remounting it runs its product query again.
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
// The sticky element at the current breakpoint: the search block from 640px up, the category strip alone on a phone (it is absent with fewer than two categories).
const stickyBlock = ref<HTMLElement | null>(null)
const categoryBar = ref<HTMLElement | null>(null)
const isPhone = useMediaQuery('(max-width: 639.98px)')
const stickyHeader = computed(() => (isPhone.value ? categoryBar.value : stickyBlock.value))

const searchInputRef = ref<HTMLInputElement | null>(null)

const clearSearch = () => {
  searchValue.value = ''
  searchInputRef.value?.focus()
}

/**
 * Computed: Categories & Products
 */
// The menu's catalogue rules are pure (engine, utils/menuCatalog.ts): live updates merged, only visible products, the search.
const baseCategories = computed(() =>
  baseCategoriesOf(dataCategories.value?.productCategories ?? [], liveProductData.value),
)

// All products flattened for search
const allProducts = computed<Product[]>(() => flattenProducts(baseCategories.value))

// The build-your-own-bowl product is detected by shape (`isComposerProduct`), so a second composer on the menu needs no code change here.
const composerProduct = computed(() => allProducts.value.find(isComposerProduct) ?? null)

/** Whether the product currently open in the route query is a composer. */
const routedProductIsComposer = computed(() => {
  const id = routedProductId.value
  if (id === null) return false
  const p = allProducts.value.find((product) => product.id === id)
  return p ? isComposerProduct(p) : false
})

// Filtered list based on search query (all words must match)
const filteredProducts = computed(() =>
  searchProducts(allProducts.value, debouncedSearchValue.value),
)

// Categories displayed. Composer products are excluded from the grid: the hero banner is their single entry point, and
// A card would show the bare base price (2,50 €) as if it were the full price.
const displayedCategories = computed<ProductCategory[]>(() =>
  displayedCategoriesOf(baseCategories.value, allProducts.value, {
    query: debouncedSearchValue.value,
    filters: new Set<string>(),
    excludeComposer: true,
  }),
)

// Where each category starts on the page: a card's image priority follows its place on the page, not in its category (see utils/menuImagePriority.ts).
const cardOffsets = computed(() =>
  categoryCardOffsets(displayedCategories.value.map((cat) => cat.products.length)),
)

// Mobile category chip nav (scrollspy + jump); ids follow search filtering.
const categorySectionIds = computed(() => displayedCategories.value.map((cat) => cat.id))
const { activeCategoryId, chipRowRef, scrollToCategory } = useMenuCategoryScrollspy(
  categorySectionIds,
  { header: stickyHeader },
)
// The sticky header publishes the bottom edge it covers (--sticky-top-h), so a focused card or a chip jump clears it.
useStickyTopOffset(stickyHeader)

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
          photoFor: productPhotoUrls,
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
</script>

<style scoped>
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
