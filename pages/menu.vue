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
            <section class="sticky top-[80px] sm:top-0 z-10 pt-4 sm:py-0 bg-tsb-one">
                <!-- Search Section -->
                <section class="mb-4 md:pt-8 px-4">
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
                        class="inline-block mx-auto text-2xl font-semibold text-gray-800 border-b-2 border-black pb-2 uppercase tracking-wide text-center"
                    >
                        {{ cat.name }}
                    </h2>

                    <!-- Product Cards -->
                    <div
                        v-if="cat.products.length"
                        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
                    >
                        <ProductCard
                            v-for="(prod, idx) in cat.products"
                            :key="prod.id"
                            :index="idx"
                            :product="prod"
                            class="w-full"
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
    </div>
</template>

<script setup lang="ts">
/**
 * Imports
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useDebounce } from '@vueuse/core'
import { useGqlQuery } from '#imports'
import { useCartStore } from '@/stores/cart'
import gql from 'graphql-tag'
import { print } from 'graphql'

import SearchBar from '~/components/menu/SearchBar.vue'
import CategoryCard from '~/components/menu/CategoryCard.vue'
import ProductCard from '~/components/menu/ProductCard.vue'
import SideCart from '~/components/cart/SideCart.vue'
import CartMobile from '~/components/cart/CartMobile.vue'
import type { ProductCategory, Product } from '@/types'

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
    const position = element.getBoundingClientRect().top + window.scrollY - headerHeight - 80
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
