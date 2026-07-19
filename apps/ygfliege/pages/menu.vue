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
            <!-- Restaurant Closed Banner -->
            <div v-if="!isCheckoutAvailable" class="max-w-7xl mx-auto mt-4 px-4">
            <div class="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div class="min-w-0">
                    <p class="text-amber-900 text-sm font-semibold">{{ $t('menu.restaurantClosed') }}</p>
                    <p class="text-amber-800 text-sm mt-0.5">{{ $t('menu.restaurantClosedDetails') }}</p>
                </div>
            </div>
            </div>

            <!-- Sticky search header. The dietary filter chips and the category
                 tab strip that used to live here were removed deliberately: the
                 menu is ~30 products across 6 short sections, so scanning beats
                 filtering, and a tab nav over so little content is chrome. -->
            <section ref="stickyHeader" class="sticky z-10 pt-4 sm:pt-6 bg-ygf-bg top-[80px] sm:top-16">
                <!-- Aligned to the same max-w-7xl container as the product grid
                     so the controls don't stretch full-bleed on wide screens. -->
                <section class="max-w-7xl mx-auto mb-4 px-4 flex items-center gap-3">
                    <!-- Search Bar (labeled) -->
                    <div class="relative flex flex-1 sm:max-w-md items-center rounded-full bg-white border border-ygf-orange-100 h-11 shadow-ygf-sm transition-colors duration-300 focus-within:border-ygf-orange-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ygf-black/40 pointer-events-none" viewBox="0 -960 960 960" fill="currentColor">
                            <path d="M765-144 526-383q-30 22-65.79 34.5-35.79 12.5-76.18 12.5Q284-336 214-406t-70-170q0-100 70-170t170-70q100 0 170 70t70 170.03q0 40.39-12.5 76.18Q599-464 577-434l239 239-51 51ZM384-408q70 0 119-49t49-119q0-70-49-119t-119-49q-70 0-119 49t-49 119q0 70 49 119t119 49Z"/>
                        </svg>
                        <label class="sr-only" for="menuSearch">{{ $t('nav.search') }}</label>
                        <input
                            id="menuSearch"
                            ref="searchInputRef"
                            v-model="searchValue"
                            type="search"
                            :placeholder="$t('nav.search')"
                            class="w-full h-full bg-transparent rounded-full pl-11 pr-10 outline-none text-sm text-ygf-black placeholder:text-ygf-black/40"
                        />
                        <button
                            type="button"
                            v-show="searchValue.length > 0"
                            @click.stop="clearSearch"
                            :aria-label="$t('common.clear')"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-ygf-black/40 hover:text-ygf-black transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange-300"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </section>
            </section>

            <!-- Allergen Notice (compact, dismissible, scrolls away with content) -->
            <div v-if="showAllergenNotice" class="max-w-7xl mx-auto mb-2 px-4">
            <div class="h-7 px-2.5 bg-amber-50 border border-amber-200 rounded-full flex items-center gap-1.5 text-amber-800 text-[11px]">
                <span aria-hidden="true" class="text-[11px]">&#x26A0;&#xFE0F;</span>
                <span class="flex-1 truncate">
                    {{ $t('menu.allergenNoticeShort') }}
                    <a :href="`tel:${brand.phone.replace(/\s/gu, '')}`" class="underline font-medium text-amber-900">{{ $t('menu.allergenNoticeLink') }}</a>
                </span>
                <button type="button" @click="dismissAllergenNotice" class="p-0.5 hover:bg-amber-100 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300" :aria-label="$t('common.close')">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
            </div>

            <!-- Skeleton Loading State -->
            <section v-if="!dataCategories" class="max-w-7xl mx-auto px-4 py-4 space-y-12">
                <div v-for="i in 3" :key="i" class="space-y-4">
                    <div class="h-6 w-32 bg-ygf-orange-100/60 rounded animate-pulse"></div>
                    <div class="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
                        <div v-for="j in 4" :key="j" class="h-[260px] bg-ygf-orange-100/60 rounded-ygf-card animate-pulse"></div>
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
                    class="card card-interactive grid sm:grid-cols-[minmax(0,1fr)_260px] overflow-hidden bg-ygf-orange-50"
                >
                    <div class="p-6 sm:p-8 flex flex-col items-start justify-center gap-3">
                        <span class="section-label">{{ $t('composer.eyebrow') }}</span>
                        <h2 translate="no" class="section-title text-2xl sm:text-3xl">{{ composerProduct.name }}</h2>
                        <p class="text-sm text-ygf-black/70 max-w-prose">{{ $t('composer.heroSubtitle') }}</p>
                        <button
                            type="button"
                            data-testid="composer-hero-cta"
                            class="btn btn-primary mt-2"
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
                        :alt="composerProduct.name"
                        sizes="(min-width: 640px) 260px, 100vw"
                        img-class="w-full h-full object-contain sm:object-cover p-3 sm:p-0 aspect-[4/3] sm:aspect-auto"
                    />
                </article>

                <div
                    v-for="cat in displayedCategories"
                    :key="cat.id"
                    :id="`category-${cat.id}`"
                    class="space-y-4"
                >
                    <!-- Category heading. The 「 」 brackets that used to frame
                         this were Tokyo Sushi's Japanese motif — wrong for a
                         Chinese brand. Replaced with the vitrine site's rule +
                         eyebrow rhythm. -->
                    <div class="flex items-center gap-4">
                        <h2 translate="no" class="section-title font-display text-xl sm:text-2xl whitespace-nowrap">
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
                            :index="idx"
                            :product="prod"
                            :ordering-disabled="!isCartAddAvailable"
                            class="animate-fade-in-up"
                            :style="{ animationDelay: `${idx * 50}ms` }"
                            v-for="(prod, idx) in cat.products"
                            @openProductModal="openModal(prod.id)"
                            :key="prod.id"
                        />
                    </div>

                    <!-- Empty State -->
                    <div v-else class="text-center text-gray-500 italic">
                        {{ $t('menu.noProduct') }}
                    </div>
                </div>

                <!-- Search No Results -->
                <div v-if="searchValue.trim().length && displayedCategories.length === 0" class="text-center py-12 text-ygf-black/60">
                    <p class="text-lg">{{ $t('menu.noResults', { query: searchValue }) }}</p>
                </div>
            </section>
        </div>

        <!-- Desktop Cart Sidebar -->
        <aside
            v-if="hasCartItems"
            class="hidden lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:block lg:w-1/3 lg:pr-4"
        >
            <SideCart :is-ordering-available="isCheckoutAvailable" />
        </aside>


        <ClientOnly>
            <Transition name="modal-backdrop">
                <div v-if="route.query.product"
                     class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center sm:p-4 backdrop-blur-sm"
                     @click.self="closeModal">
                    <Transition name="modal-panel" appear>
                        <!-- Composer products get the full assembly flow; every
                             fixed set stays on the ordinary product modal. -->
                        <BowlComposer
                            v-if="routedProductIsComposer"
                            :key="route.query.product"
                            :product="route.query.product as string"
                            :ordering-disabled="!isCartAddAvailable"
                            @close="closeModal"
                        />
                        <ProductModal
                            v-else
                            :key="route.query.product"
                            :product="route.query.product as string"
                            :ordering-disabled="!isCartAddAvailable"
                            @close="closeModal"
                        />
                    </Transition>
                </div>
            </Transition>
        </ClientOnly>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    sitemap: { priority: 0.9, changefreq: 'weekly' },
})

import type { Product, ProductCategory } from '#engine/types'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGqlQuery, useGqlSubscription, useRoute, useRouter } from '#imports'
import ProductCard from '~/components/menu/ProductCard.vue'
import BowlComposer from '~/components/menu/BowlComposer.vue'
import MktPicture from '~/components/mkt/MktPicture.vue'
import ProductModal from '~/components/menu/ProductModal.vue'
import SideCart from '~/components/cart/SideCart.vue'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useCartStore } from '#engine/stores/cart'
import { useDebounce, useEventBus, useMounted } from '@vueuse/core'
import { useRestaurantConfig } from '#engine/composables/useRestaurantConfig'
import { useTracking } from '#engine/composables/useTracking'
import { PRODUCT_IMAGE_FALLBACK, productImageUrl } from '#engine/utils/productImage'

const { brand } = useAppConfig()
const route = useRoute()
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

// Restaurant config
const { config: restaurantConfig } = await useRestaurantConfig()
const isOrderingEnabled = computed(() => restaurantConfig.value?.restaurantConfig?.orderingEnabled ?? false)
const isOrderingCurrentlyOpen = computed(() => restaurantConfig.value?.restaurantConfig?.isOrderingCurrentlyOpen ?? false)
const isCheckoutAvailable = computed(() => isOrderingEnabled.value && isOrderingCurrentlyOpen.value)
const isCartAddAvailable = computed(() => isOrderingEnabled.value)

const openModal = (id: string) => {
    // Add productId to URL query
    router.push({ query: { product: id } })
}

const closeModal = () => {
    // Remove query parameter
    router.push({ query: {} })
}

// Lock body scroll when modal is open
watch(() => route.query.product, (val) => {
    document.body.style.overflow = val ? 'hidden' : ''
})
onBeforeUnmount(() => {
    document.body.style.overflow = ''
})

/**
 * GraphQL Query
 */
const PRODUCT_CATEGORIES = gql`
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
        category { id name slug }
        choices { id }
        choiceGroups {
          id
          name
          minSelections
          maxSelections
          sortOrder
          choices { id }
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
const { data: dataCategories } = await useGqlQuery<{
    productCategories: ProductCategory[]
}>(print(PRODUCT_CATEGORIES), {}, { immediate: true, cache: true })

/**
 * Live product updates via WebSocket subscription
 */
const SUB_PRODUCT_UPDATED = gql`
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
    print(SUB_PRODUCT_UPDATED)
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
const searchValue = ref('')
const debouncedSearchValue = useDebounce(searchValue, 300)
const stickyHeader = ref<HTMLElement | null>(null)

const searchInputRef = ref<HTMLInputElement | null>(null)

const clearSearch = () => {
    searchValue.value = ''
    searchInputRef.value?.focus()
}

/**
 * Computed: Categories & Products
 */
// Base categories with live updates merged and only visible products, sorted
const baseCategories = computed(() =>
    (dataCategories.value?.productCategories ?? [])
        .map(cat => ({
            ...cat,
            products: cat.products
                .map(p => {
                    const live = liveProductData.value[p.id]
                    return live ? { ...p, ...live } as Product : p
                })
                .filter(p => p.isVisible)
        }))
        .filter(cat => cat.products.length)
        .toSorted((a, b) => a.order - b.order)
)

// All products flattened for search
const allProducts = computed<Product[]>(() => baseCategories.value.flatMap(cat =>
        cat.products.map(p => ({ ...p, category: cat }))
    )
)

/**
 * The build-your-own-bowl product, detected by shape rather than by id: any
 * product with a choice group allowing more than one pick is a composer. The
 * category query already returns minSelections/maxSelections, so this needs no
 * extra round trip, and adding a second composer to the menu needs no code
 * change here.
 */
const isComposerProduct = (p: Product) => p.choiceGroups?.some(group => group.maxSelections > 1) ?? false

const composerProduct = computed(() => allProducts.value.find(isComposerProduct) ?? null)

/** Whether the product currently open in the route query is a composer. */
const routedProductIsComposer = computed(() => {
    const id = route.query.product
    if (typeof id !== 'string') return false
    const p = allProducts.value.find(product => product.id === id)
    return p ? isComposerProduct(p) : false
})

// Filtered list based on search query (all words must match)
const filteredProducts = computed(() => {
    const q = debouncedSearchValue.value.trim().toLowerCase()
    if (!q) return allProducts.value
    const words = q.split(/\s+/u)
    return allProducts.value.filter(p => {
        const haystack = [p.name, p.code, p.category.name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
        return words.every(w => haystack.includes(w))
    })
})

// Categories displayed, grouping search-filtered products
const displayedCategories = computed<ProductCategory[]>(() => {
    const q = debouncedSearchValue.value.trim().toLowerCase()
    if (!q) return baseCategories.value
    const grouped = Map.groupBy(filteredProducts.value, prod => prod.category.id)
    return Array.from(grouped.entries()).map(([, products]) => ({
        ...products[0]!.category,
        products,
    })).toSorted((a, b) => a.order - b.order)
})

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
const { t } = useI18n()

// Build the Menu graph: Menu -> hasMenuSection[] -> hasMenuItem[]
const menuSchema = computed(() => {
    const fallbackImage = {
        '@type': 'ImageObject',
        url: `${config.public.baseUrl}${PRODUCT_IMAGE_FALLBACK}`,
        contentUrl: `${config.public.baseUrl}${PRODUCT_IMAGE_FALLBACK}`,
        thumbnail: `${config.public.baseUrl}${PRODUCT_IMAGE_FALLBACK}`,
    }

    const sections = new Map<string, { id: string, name: string, items: Record<string, unknown>[] }>()
    for (const product of allProducts.value) {
        if (!product.category) continue
        if (!sections.has(product.category.id)) {
            sections.set(product.category.id, {
                id: product.category.id,
                name: product.category.name,
                items: [],
            })
        }
        const diets: string[] = []
        if (product.isHalal) diets.push('https://schema.org/HalalDiet')
        if (product.isVegetarian) diets.push('https://schema.org/VegetarianDiet')

        sections.get(product.category.id)!.items.push({
            '@type': 'MenuItem',
            '@id': `${config.public.baseUrl}/menu#${product.id}`,
            name: product.name,
            image: product.slug
                ? {
                    '@type': 'ImageObject',
                    url: productImageUrl(config.public.s3bucketUrl, product.slug, 'png'),
                    contentUrl: productImageUrl(config.public.s3bucketUrl, product.slug, 'webp'),
                    thumbnail: productImageUrl(config.public.s3bucketUrl, product.slug, 'png'),
                }
                : fallbackImage,
            offers: {
                '@type': 'Offer',
                price: product.price,
                priceCurrency: 'EUR',
                availability: product.isAvailable
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
            },
            ...(diets.length ? { suitableForDiet: diets } : {}),
        })
    }

    return {
        '@type': 'Menu',
        '@id': `${config.public.baseUrl}/menu#menu`,
        name: t('schema.menu.name'),
        description: t('schema.menu.description'),
        inLanguage: ['fr-BE', 'en-US', 'zh-CN', 'nl-BE'],
        hasMenuSection: [...sections.values()].map(section => ({
            '@type': 'MenuSection',
            '@id': `${config.public.baseUrl}/menu#section-${section.id}`,
            name: section.name,
            hasMenuItem: section.items,
        })),
    }
})

// Breadcrumb schema
const breadcrumbSchema = computed(() => ({
    '@type': 'BreadcrumbList',
    itemListElement: [
        {
            '@type': 'ListItem',
            position: 1,
            name: t('schema.breadcrumb.home'),
            item: config.public.baseUrl
        },
        {
            '@type': 'ListItem',
            position: 2,
            name: t('schema.breadcrumb.menu'),
            item: `${config.public.baseUrl}/menu`
        }
    ]
}))

watch(allProducts, () => {
    useJsonLd([
        {
            '@type': 'WebPage',
            name: t('schema.menu.title'),
            description: t('schema.menu.description'),
        },
        breadcrumbSchema.value,
        menuSchema.value,
    ], 'page-jsonld')
}, { immediate: true })

useSeoMeta({
    title: t('schema.menu.title'),
    ogType: 'website',
    ogTitle: t('schema.menu.title'),
    description: t('schema.menu.description'),
    ogDescription: t('schema.menu.description'),
    ogImage: `${config.public.baseUrl}/images/about-hero.png`,
    twitterCard: 'summary_large_image',
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

watch(() => cartStore.products.length, (newLen, oldLen) => {
    if (oldLen >= 1 && newLen === 0) preserveScrollFor(findTopVisibleCard())
})

// SSR-safe: VueUse useEventBus auto-cleans via tryOnScopeDispose
useEventBus(cartItemAddedKey).on(handleCartItemAdded)

</script>

<style scoped>
input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; }

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
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
    transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}
.modal-panel-leave-active {
    transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}
.modal-panel-enter-from,
.modal-panel-leave-to {
    opacity: 0;
    transform: scale(0.95);
}
</style>
