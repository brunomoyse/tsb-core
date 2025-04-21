<!-- components/ScrollToTopButton.vue -->
<template>
    <!-- only render when scrolled past top -->
    <div v-show="showButton && !isCartVisible" class="fixed bottom-8 right-8 z-50">
        <button
            type="button"
            @click="scrollToTop"
            class="group relative w-14 h-14 bg-white border border-black rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition"
        >
            <!-- Up arrow icon -->
            <svg class="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                      d="M3.293 11.707a1 1 0 011.414 0L10 6.414l5.293 5.293a1 1 0 011.414-1.414l-6-6a1 1 0 00-1.414 0l-6 6a1 1 0 000 1.414z"
                      clip-rule="evenodd" />
            </svg>

            <!-- Tooltip -->
            <span
                class="absolute left-1/2 top-full mt-2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap"
            >
        {{ t('common.toTop', 'Back to top') }}
      </span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {useCartStore} from '@/stores/cart';

const cartStore = useCartStore();

const isCartVisible = computed(() => cartStore.isCartVisible);

const { t } = useI18n()
const showButton = ref(false)

function onScroll() {
    showButton.value = window.pageYOffset > 0
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
    onScroll() // initialize
    window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
})
</script>
