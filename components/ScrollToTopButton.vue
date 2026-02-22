<!-- components/ScrollToTopButton.vue -->
<template>
    <Transition name="fade-up">
        <button
            v-show="showButton && !isCartVisible"
            type="button"
            @click="scrollToTop"
            :aria-label="t('common.toTop', 'Back to top')"
            class="fixed right-4 z-30 w-10 h-10 bg-gray-800/70 backdrop-blur-sm text-white rounded-full shadow-md flex items-center justify-center transition-all active:scale-95"
            :class="hasCartItems ? 'bottom-16' : 'bottom-4'"
        >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
            </svg>
        </button>
    </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCartStore } from '@/stores/cart'

const cartStore = useCartStore()

const isCartVisible = computed(() => cartStore.isCartVisible)
const hasCartItems = computed(() => cartStore.totalItems > 0)

const { t } = useI18n()
const showButton = ref(false)

function onScroll() {
    showButton.value = window.scrollY > 300
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.fade-up-enter-active,
.fade-up-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-up-enter-from,
.fade-up-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>
