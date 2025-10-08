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
            <!-- Sticky Categories Header -->
            <section class="sticky top-[80px] sm:top-0 z-10 pt-4 sm:pt-8 sm:py-0 bg-tsb-one">
                <!-- Search Section -->
                <section class="mb-4 px-4">
                    <SearchBar v-model="searchValue" />
                </section>

                <!-- Categories Scroll -->
                <section v-if="!searchValue.trim().length" class="relative m-4">
                    <!-- Left Arrow -->
                    <button
                        v-show="canScrollLeft"
                        @click="scrollPrev"
                        class="absolute left-0 top-[18px] transform -translate-y-1/2 z-20 px-2 py-[6px] bg-white rounded-full"
                    >
                        ‹
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
                        class="absolute right-0 top-[18px] transform -translate-y-1/2 z-20 px-2 py-[6px] bg-white rounded-full"
                    >
                        ›
                    </button>
                </section>
            </section>

            <!-- Products Grid -->
            <section class="max-w-7xl mx-auto px-4 py-4 space-y-12">
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
        <CartMobile class="lg:hidden" />

        <ClientOnly>
            <ProductModal
                v-if="route.query.product"
                :product="route.query.product"
                @close="closeModal"
            />
        </ClientOnly>
    </div>
</template>

<script setup lang="ts">
/**
 * Imports
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useDebounce } from '@vueuse/core'
import { useGqlQuery, useRoute, useRouter } from '#imports'
import { useCartStore } from '@/stores/cart'
import gql from 'graphql-tag'
import { print } from 'graphql'

import SearchBar from '~/components/menu/SearchBar.vue'
import CategoryCard from '~/components/menu/CategoryCard.vue'
import ProductCard from '~/components/menu/ProductCard.vue'
import SideCart from '~/components/cart/SideCart.vue'
import CartMobile from '~/components/cart/CartMobile.vue'
import type { ProductCategory, Product } from '@/types'
import ProductModal from "~/components/menu/ProductModal.vue";

const route = useRoute()
const router = useRouter()

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
        isDiscountable
        category { id name }
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

// Filtered list based on search query
const filteredProducts = computed(() => {
    const q = debouncedSearchValue.value.trim().toLowerCase()
    if (!q) return allProducts.value
    return allProducts.value.filter(p =>
        p.code?.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q)
    )
})

// Categories displayed, grouping filtered products
const displayedCategories = computed<ProductCategory[]>(() => {
    const q = debouncedSearchValue.value.trim().toLowerCase()
    if (!q) return baseCategories.value
    const map = new Map<string, ProductCategory & { products: Product[] }>()
    filteredProducts.value.forEach(prod => {
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
    let position = element.getBoundingClientRect().top + window.scrollY - headerHeight - 90
    // if >= sm, add 60px for the sticky header
    if (window.innerWidth >= 640) {
        position += 60
    }
    window.scrollTo({ top: position, behavior: 'smooth' })
}

/**
 * Watchers
 */
// Initialize active category when list changes
watch(displayedCategories, cats => {
    if (!activeCategory.value && cats.length) activeCategory.value = cats[0].id
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
})

/**
 * IntersectionObserver: Scroll Spy
 */
onMounted(() => {
    const observer = new IntersectionObserver(entries => {
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
        observer.disconnect()
        nextTick(() => {
            displayedCategories.value.forEach(cat => {
                const el = document.getElementById(`category-${cat.id}`)
                if (el) observer.observe(el)
            })
        })
    }

    observeSections()
    watch(displayedCategories, observeSections, { deep: true })
    updateScrollButtons()
    scrollContainer.value?.addEventListener('scroll', updateScrollButtons)
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
