<template>
    <div role="status" aria-live="polite" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-[500px] max-w-[calc(100vw-2rem)] px-4" v-if="visible">
        <transition name="slide-up">
            <div :class="['rounded-2xl shadow-xl px-6 py-3 flex flex-col', variantClasses, variant === 'success' ? 'animate-glow-pulse' : '']" v-if="visible">
                <div class="flex items-start justify-between gap-4">
                    <span class="flex-1 text-base break-words">
                      {{ message }}
                    </span>
                    <!-- Default action button for persistent notifications or cookie consent -->
                    <slot name="action" v-if="persistent || cookieConsent">
                        <button
                            class="flex-shrink-0 bg-white text-gray-800 border border-gray-800 px-4 py-2 rounded-full text-sm hover:bg-gray-200 transition"
                            @click="close"
                            :aria-label="cookieConsent ? 'Accept cookies' : $t('common.close')"
                        >
                            {{ cookieConsent ? 'Accept' : 'Close' }}
                        </button>
                    </slot>
                </div>
                <!-- Progress Bar: Only visible when not persistent and not cookie consent -->
                <div v-if="!persistent && !cookieConsent" class="w-full mt-2 h-1 bg-gray-300 rounded overflow-hidden">
                    <div class="h-full progress-bar" :class="progressBarClass" :style="{ width: progress + '%' }"></div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'

const { message, persistent = false, duration = 10000, cookieConsent = false, variant = 'neutral' } = defineProps<{
    message: string
    persistent?: boolean
    duration?: number
    cookieConsent?: boolean
    variant?: string
}>()

const emit = defineEmits<{
    close: []
}>()
const visible = ref(false)
const progress = ref(100)
let progressInterval: ReturnType<typeof setInterval> | undefined

// Compute CSS classes based on the variant prop
const variantClasses = computed(() => {
    switch (variant) {
        case 'success':
            return 'bg-green-100 border border-green-400 text-green-800'
        case 'error':
            return 'bg-red-100 border border-red-400 text-red-800'
        default:
            return 'bg-white border border-gray-300 text-gray-800'
    }
})

const progressBarClass = computed(() => {
    switch (variant) {
        case 'success':
            return 'bg-gradient-to-r from-green-500 via-green-400 to-green-600'
        case 'error':
            return 'bg-gradient-to-r from-red-500 via-red-400 to-red-600'
        default:
            return 'bg-gray-600'
    }
})

const close = () => {
    visible.value = false
    if (cookieConsent) {
        localStorage.setItem('cookiesAccepted', 'true')
    }
    emit('close')
    if (progressInterval) clearInterval(progressInterval)
}

onMounted(() => {
    // For cookie consent, only show if not already accepted.
    if (cookieConsent && !localStorage.getItem('cookiesAccepted')) {
        visible.value = true
    }
    if (!cookieConsent) {
        visible.value = true
        if (!persistent) {
            // Start the progress bar countdown.
            const startTime = Date.now()
            progress.value = 100
            progressInterval = setInterval(() => {
                const elapsed = Date.now() - startTime
                progress.value = Math.max(100 * (1 - elapsed / duration), 0)
                if (elapsed >= duration) {
                    clearInterval(progressInterval)
                    close()
                }
            }, 50)
        }
    }
})
</script>

<style scoped>
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

.progress-bar {
    transition: width 0.1s linear;
}
</style>
