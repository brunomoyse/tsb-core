<template>
    <div class="flex">
        <!-- Main Content -->
        <div
            ref="contentContainer"
            class="sm:w-[calc(100vw-142px)]"
            :class="cartStore.products.length === 0
        ? 'lg:w-[calc(100vw-142px)]'
        : 'lg:w-[calc(67vw-71px)]'"
        >
            <!-- Restaurant Closed Banner -->
            <div v-if="!isOrderingAvailable" class="mx-4 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p class="text-amber-800 text-sm font-medium">{{ $t('menu.restaurantClosed') }}</p>
            </div>

            <!-- Sticky Categories Header -->
            <section class="sticky top-[80px] sm:top-0 z-10 pt-4 sm:pt-8 sm:py-0 bg-tsb-one">
                <!-- Search Section -->
                <section class="mb-4 px-4">
                    <SearchBar v-model="searchValue" />
                </section>

                <!-- Filter Pills -->
                <section class="flex gap-2 px-4 mb-4">
                    <button
                        @click="toggleFilter('halal')"
                        :class="[
                            'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                            activeFilters.has('halal')
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        ]"
                    >
                        {{ $t('menu.halal') }}
                    </button>
                    <button
                        @click="toggleFilter('vegan')"
                        :class="[
                            'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                            activeFilters.has('vegan')
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        ]"
                    >
                        {{ $t('menu.vegan') }}
                    </button>
                </section>

                <!-- Categories Scroll -->
                <section v-if="!searchValue.trim().length" class="relative m-4">
                    <!-- Left Arrow -->
                    <button
                        v-show="canScrollLeft"
                        @click="scrollPrev"
                        :aria-label="$t('menu.previousCategory')"
                        class="absolute left-0 top-[18px] transform -translate-y-1/2 z-20 px-2 py-[6px] bg-white rounded-full shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </button>

                    <!-- Scrollable Category Cards -->
                    <div
                        ref="scrollContainer"
                        @mousedown="startDrag"
                        @mousemove="onDrag"
                        @mouseup="stopDrag"
                        @mouseleave="stopDrag"
                        :class="[
                          'flex overflow-x-auto gap-2 pb-4 no-scrollbar',
                          isDragging ? 'cursor-grabbing' : 'cursor-grab'
                        ]"
                    >
                        <CategoryCard
                            v-for="cat in displayedCategories"
                            :key="cat.id"
                            :id="`category-card-${cat.id}`"
                            :active="activeCategory === cat.id"
                            :category="{ id: cat.id, name: cat.name, order: cat.order } as ProductCategory"
                            class="snap-start"
                            @select="scrollToCategory"
                        />
                    </div>

                    <!-- Right Arrow -->
                    <button
                        v-show="canScrollRight"
                        @click="scrollNext"
                        :aria-label="$t('menu.nextCategory')"
                        class="absolute right-0 top-[18px] transform -translate-y-1/2 z-20 px-2 py-[6px] bg-white rounded-full shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </section>

                <!-- Allergen Notice -->
                <div v-if="showAllergenNotice" class="mx-4 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-amber-800 text-xs">
                    <span aria-hidden="true">&#x26A0;&#xFE0F;</span>
                    <p class="flex-1">
                        {{ $t('menu.allergenNotice') }}
                        <a href="tel:042229888" class="underline font-medium text-amber-900">{{ $t('menu.allergenNoticeLink') }}</a>
                    </p>
                    <button @click="showAllergenNotice = false" class="ml-1 p-0.5 hover:bg-amber-100 rounded" :aria-label="$t('common.close')">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </section>

            <!-- Skeleton Loading State -->
            <section v-if="!dataCategories" class="max-w-7xl mx-auto px-4 py-4 space-y-12">
                <div v-for="i in 3" :key="i" class="space-y-4">
                    <div class="h-6 w-32 bg-gray-200 rounded animate-pulse ml-4"></div>
                    <div class="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
                        <div v-for="j in 4" :key="j" class="h-[260px] bg-gray-200 rounded-xl animate-pulse"></div>
                    </div>
                </div>
            </section>

            <!-- Products Grid -->
            <section v-else class="max-w-7xl mx-auto px-4 py-4 space-y-12">
                <div
                    v-for="cat in displayedCategories"
                    :key="cat.id"
                    :id="`category-${cat.id}`"
                    class="space-y-4"
                >
                    <!-- Category Title -->
                    <h2
                        class="font-channel inline-block mx-auto text-xl font-semibold text-gray-800 border-b-2 border-black pb-2 ml-4 tracking-wide text-center"
                    >
                        {{ cat.name }}
                    </h2>

                    <!-- Product Cards -->
                    <div
                        v-if="cat.products.length"
                        class="grid grid-cols-2 gap-5 justify-center sm:justify-start md:[grid-template-columns:repeat(auto-fit,minmax(auto,185px))]"
                    >
                        <ProductCard
                            :index="idx"
                            :product="prod"
                            :ordering-disabled="!isOrderingAvailable"
                            class="min-width-[200px]"
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
                <div v-if="searchValue.trim().length && displayedCategories.length === 0" class="text-center py-12 text-gray-500">
                    <p class="text-lg">{{ $t('menu.noResults', { query: searchValue }) }}</p>
                </div>

                <!-- Filter No Results -->
                <div v-if="!searchValue.trim().length && activeFilters.size > 0 && displayedCategories.length === 0" class="text-center py-12 text-gray-500">
                    <p class="text-lg">{{ $t('menu.noProduct') }}</p>
                </div>
            </section>
        </div>

        <!-- Desktop Cart Sidebar -->
        <aside
            v-if="cartStore.products.length"
            class="hidden lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:block lg:w-[calc(30vw-71px)]"
        >
            <SideCart />
        </aside>

        <!-- Mobile Cart -->
        <CartMobile />

        <!-- Floating Cart Bar (mobile only) -->
        <FloatingCartBar />

        <ClientOnly>
            <ProductModal
                v-if="route.query.product"
                :product="route.query.product as string"
                @close="closeModal"
            />
        </ClientOnly>
    </div>
</template>

<script setup lang="ts">
/**
 * Imports
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useDebounce } from '@vueuse/core'
import { useGqlQuery, useRoute, useRouter } from '#imports'
import { useCartStore } from '@/stores/cart'
import { useTracking } from '~/composables/useTracking'
import { useRestaurantConfig } from '~/composables/useRestaurantConfig'
import gql from 'graphql-tag'
import { print } from 'graphql'

import SearchBar from '~/components/menu/SearchBar.vue'
import CategoryCard from '~/components/menu/CategoryCard.vue'
import ProductCard from '~/components/menu/ProductCard.vue'
import SideCart from '~/components/cart/SideCart.vue'
import CartMobile from '~/components/cart/CartMobile.vue'
import FloatingCartBar from '~/components/cart/FloatingCartBar.vue'
import type { ProductCategory, Product } from '@/types'
import ProductModal from "~/components/menu/ProductModal.vue";

const route = useRoute()
const router = useRouter()
const { trackEvent } = useTracking()
const showAllergenNotice = ref(true)

// Restaurant config
const { config: restaurantConfig } = await useRestaurantConfig()
const isOrderingAvailable = computed(() => restaurantConfig.value?.restaurantConfig?.isCurrentlyOpen ?? false)

const openModal = (id: string) => {
    // Add productId to URL query
    router.push({ query: { product: id } })
}

const closeModal = () => {
    // Remove query parameter
    router.push({ query: {} })
}

/**
 * GraphQL Query
 */
const PRODUCT_CATEGORIES = gql`
  query {
    productCategories {
      id
      name
      order
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
        isVegan
        isDiscountable
        category { id name }
        choices { id }
      }
    }
  }
`

/**
 * Stores & Data Fetch
 */
const cartStore = useCartStore()
const { data: dataCategories } = await useGqlQuery<{
    productCategories: ProductCategory[]
}>(print(PRODUCT_CATEGORIES), {}, { immediate: true, cache: true })

/**
 * Refs & Reactive State
 */
const searchValue = ref('')
const debouncedSearchValue = useDebounce(searchValue, 300)
const activeCategory = ref<string>('')
const scrollContainer = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragStartX = ref(0)
const scrollStartX = ref(0)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// Filter state
const activeFilters = ref<Set<string>>(new Set())
const toggleFilter = (filter: string) => {
    const next = new Set(activeFilters.value)
    if (next.has(filter)) {
        next.delete(filter)
    } else {
        next.add(filter)
    }
    activeFilters.value = next
}

/**
 * Computed: Categories & Products
 */
// Base categories with only visible products, sorted
const baseCategories = computed(() =>
    (dataCategories.value?.productCategories ?? [])
        .map(cat => ({
            ...cat,
            products: cat.products.filter(p => p.isVisible)
        }))
        .filter(cat => cat.products.length)
        .sort((a, b) => a.order - b.order)
)

// All products flattened for search
const allProducts = computed<Product[]>(() => baseCategories.value.flatMap(cat =>
        cat.products.map(p => ({ ...p, category: cat }))
    )
)

// Filtered list based on search query (all words must match)
const filteredProducts = computed(() => {
    const q = debouncedSearchValue.value.trim().toLowerCase()
    if (!q) return allProducts.value
    const words = q.split(/\s+/)
    return allProducts.value.filter(p => {
        const haystack = [p.name, p.code, p.category.name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
        return words.every(w => haystack.includes(w))
    })
})

// Apply dietary filters (AND logic: product must match ALL active filters)
const dietaryFiltered = computed(() => {
    const filters = activeFilters.value
    if (filters.size === 0) return filteredProducts.value
    return filteredProducts.value.filter(p => {
        if (filters.has('halal') && !p.isHalal) return false
        if (filters.has('vegan') && !p.isVegan) return false
        return true
    })
})

// Categories displayed, grouping filtered products
const displayedCategories = computed<ProductCategory[]>(() => {
    const q = debouncedSearchValue.value.trim().toLowerCase()
    if (!q && activeFilters.value.size === 0) return baseCategories.value
    const map = new Map<string, ProductCategory & { products: Product[] }>()
    dietaryFiltered.value.forEach(prod => {
        const cat = prod.category
        if (!map.has(cat.id)) map.set(cat.id, { ...cat, products: [] })
        map.get(cat.id)!.products.push(prod)
    })
    return Array.from(map.values()).sort((a, b) => a.order - b.order)
})

/**
 * Utility: Update Arrow Visibility
 */
const updateScrollButtons = () => {
    const el = scrollContainer.value!
    canScrollLeft.value = el.scrollLeft > 0
    canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth
}

/**
 * Drag-to-scroll Handlers
 */
const startDrag = (e: MouseEvent) => {
    isDragging.value = true
    dragStartX.value = e.pageX
    scrollStartX.value = scrollContainer.value!.scrollLeft
}
const onDrag = (e: MouseEvent) => {
    if (!isDragging.value) return
    const dx = e.pageX - dragStartX.value
    scrollContainer.value!.scrollLeft = scrollStartX.value - dx
    updateScrollButtons()
}
const stopDrag = () => {
    isDragging.value = false
    updateScrollButtons()
}

/**
 * Arrow Click Handlers
 */
const scrollPrev = () => {
    scrollContainer.value!.scrollBy({ left: -150, behavior: 'smooth' })
    setTimeout(updateScrollButtons, 300)
}
const scrollNext = () => {
    scrollContainer.value!.scrollBy({ left: 150, behavior: 'smooth' })
    setTimeout(updateScrollButtons, 300)
}

/**
 * Scroll-to-Category Method
 */
const scrollToCategory = (categoryId: string) => {
    const header = document.querySelector('.sticky.top-\\[80px\\]') as HTMLElement
    const element = document.getElementById(`category-${categoryId}`)
    if (!element || !header) return

    const headerHeight = header.offsetHeight
    const navbarHeight = window.innerWidth < 640 ? 80 : 0 // h-20 on mobile only
    const gap = 16
    const position = element.getBoundingClientRect().top + window.scrollY - headerHeight - navbarHeight - gap
    window.scrollTo({ top: Math.max(0, position), behavior: 'smooth' })
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

// Initialize active category when list changes
watch(displayedCategories, cats => {
    if (!activeCategory.value && cats.length) activeCategory.value = cats[0]!.id
}, { immediate: true })

// Center active card on change
watch(activeCategory, newVal => {
    nextTick(() => {
        if (!scrollContainer.value || !newVal) return
        const card = document.getElementById(`category-card-${newVal}`)
        if (!card) return

        const container = scrollContainer.value
        const scrollPosition = card.offsetLeft - container.offsetLeft - 36
        container.scrollTo({ left: scrollPosition, behavior: 'smooth' })
    })
})

/**
 * Schema.org Structured Data
 */
const config = useRuntimeConfig()
const { t } = useI18n()

// Generate MenuItem schemas for all products
const menuItemSchemas = computed(() => {
    return allProducts.value.map(product => ({
        '@type': 'MenuItem',
        '@id': `${config.public.baseUrl}/menu#${product.id}`,
        name: product.name,
        description: product.name,
        image: product.slug ? {
            '@type': 'ImageObject',
            url: `${config.public.s3bucketUrl}/images/thumbnails/${product.slug}.png`,
            contentUrl: `${config.public.s3bucketUrl}/images/thumbnails/${product.slug}.webp`,
            thumbnail: `${config.public.s3bucketUrl}/images/thumbnails/${product.slug}.png`
        } : undefined,
        offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'EUR',
            availability: product.isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
        },
        menuAddOn: product.category ? {
            '@type': 'MenuSection',
            name: product.category.name
        } : undefined,
        suitableForDiet: product.isHalal ? ['https://schema.org/HalalDiet'] : undefined
    }))
})

// Generate ItemList schema for the menu
const itemListSchema = computed(() => ({
    '@type': 'ItemList',
    '@id': `${config.public.baseUrl}/menu#itemlist`,
    name: t('schema.menu.name'),
    numberOfItems: allProducts.value.length,
    itemListElement: allProducts.value.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
            '@type': 'MenuItem',
            '@id': `${config.public.baseUrl}/menu#${product.id}`,
            name: product.name
        }
    }))
}))

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

// Update schema whenever products change
watch(allProducts, () => {
    useSchemaOrg([
        defineWebPage({
            '@type': 'WebPage',
            name: t('schema.menu.title'),
            description: t('schema.menu.description')
        }),
        breadcrumbSchema.value,
        itemListSchema.value,
        ...menuItemSchemas.value
    ])
}, { immediate: true })

useSeoMeta({
    title: t('schema.menu.title'),
    ogTitle: t('schema.menu.title'),
    description: t('schema.menu.description'),
    ogDescription: t('schema.menu.description'),
    ogImage: config.public.baseUrl + '/images/about-hero.png',
    twitterCard: 'summary_large_image',
})

/**
 * IntersectionObserver: Scroll Spy
 */
let observer: IntersectionObserver | null = null

onMounted(() => {
    observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                activeCategory.value = entry.target.id.replace('category-', '')
            }
        })
    }, {
        threshold: 0.1,
        rootMargin: '-80px 0px -40% 0px'
    })

    // Observe each category section
    const observeSections = () => {
        observer!.disconnect()
        nextTick(() => {
            displayedCategories.value.forEach(cat => {
                const el = document.getElementById(`category-${cat.id}`)
                if (el) observer!.observe(el)
            })
        })
    }

    observeSections()
    watch(displayedCategories, observeSections, { deep: true })
    updateScrollButtons()
    scrollContainer.value?.addEventListener('scroll', updateScrollButtons)
})

onUnmounted(() => {
    observer?.disconnect()
    scrollContainer.value?.removeEventListener('scroll', updateScrollButtons)
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
