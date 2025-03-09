<template>
    <!-- Outer container always centered -->
    <div class="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-[500px] max-w-full">
        <transition name="slide-up">
            <!-- Inner container animates vertically -->
            <div
                v-if="isMounted && showCookie"
                class="bg-tsb-four border border-gray-300 rounded-2xl shadow-xl px-6 py-3 flex items-center justify-between"
            >
          <span class="flex-1 text-base text-gray-800 whitespace-nowrap overflow-hidden">
            We use cookies to improve your experience.
          </span>
                <button
                    class="ml-4 bg-white text-gray-800 border border-gray-800 px-4 py-2 rounded-full text-sm hover:bg-gray-200 transition"
                    @click="acceptCookies"
                >
                    Accept
                </button>
            </div>
        </transition>
    </div>
</template>

<script lang="ts" setup>
import {onMounted, ref} from 'vue'

const showCookie = ref(false)
const isMounted = ref(false)

const acceptCookies = () => {
    showCookie.value = false
    localStorage.setItem('cookiesAccepted', 'true')
}

onMounted(() => {
    isMounted.value = true
    if (!localStorage.getItem('cookiesAccepted')) {
        showCookie.value = true
    }
})
</script>

<style scoped>
/* Animate only vertical translate and opacity */
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.35s ease, opacity 0.35s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
}

.slide-up-enter-to,
.slide-up-leave-from {
    transform: translateY(0);
    opacity: 1;
}
</style>
