<template>
    <div
        :role="liveRole"
        :aria-live="livePoliteness"
        aria-atomic="true"
        class="notification-bar fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] w-[500px] max-w-[calc(100vw-2rem)] px-4"
        v-if="visible"
    >
        <transition name="slide-up">
            <div :class="['rounded-2xl shadow-xl px-6 py-3 flex flex-col border', variantClasses, variant === 'success' ? 'animate-glow-pulse' : '']" :style="variantStyle" v-if="visible">
                <div class="flex items-start justify-between gap-4">
                    <span class="flex-1 text-base break-words">
                      {{ message }}
                    </span>
                    <!-- Custom action button (e.g. Undo) takes precedence -->
                    <button
                        v-if="action"
                        type="button"
                        class="flex-shrink-0 btn btn-secondary px-4 py-1.5 text-sm font-semibold"
                        @click="invokeAction"
                    >
                        {{ action.label }}
                    </button>
                    <!-- Default action button for persistent notifications or cookie consent -->
                    <slot v-else-if="persistent || cookieConsent" name="action">
                        <button
                            type="button"
                            class="flex-shrink-0 btn btn-secondary px-4 py-2 text-sm"
                            @click="close"
                            :aria-label="cookieConsent ? 'Accept cookies' : $t('common.close')"
                        >
                            {{ cookieConsent ? 'Accept' : 'Close' }}
                        </button>
                    </slot>
                </div>
                <!-- Progress Bar: Only visible when not persistent and not cookie consent -->
                <div v-if="!persistent && !cookieConsent" class="w-full mt-2 h-1 rounded overflow-hidden" :style="{ 'background-color': 'rgba(242, 123, 32, 0.12)' }">
                    <div class="h-full progress-bar" :class="progressBarClass" :style="{ width: progress + '%' }"></div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useHaptics } from '#engine/composables/useHaptics'

const { notification: hapticNotification } = useHaptics()

const { message, persistent = false, duration = 10000, cookieConsent = false, variant = 'neutral', action } = defineProps<{
    message: string
    persistent?: boolean
    duration?: number
    cookieConsent?: boolean
    variant?: string
    action?: { label: string; handler: () => void }
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
            return 'text-ygf-success'
        case 'error':
            return 'text-ygf-error'
        default:
            return 'text-ygf-black'
    }
})

const variantStyle = computed(() => {
    switch (variant) {
        case 'success':
            return {
                'background-color': 'rgba(76, 175, 80, 0.08)',
                'border-color': 'rgba(76, 175, 80, 0.3)',
            }
        case 'error':
            return {
                'background-color': 'rgba(242, 123, 32, 0.08)',
                'border-color': 'rgba(242, 123, 32, 0.3)',
            }
        default:
            return {
                'background-color': 'var(--ygf-white)',
                'border-color': 'rgba(242, 123, 32, 0.12)',
            }
    }
})

const progressBarClass = computed(() => {
    switch (variant) {
        case 'success':
            return 'bg-ygf-success'
        case 'error':
            return 'bg-ygf-orange-on-white'
        default:
            return 'bg-ygf-gray-600'
    }
})

const liveRole = computed(() => (variant === 'error' ? 'alert' : 'status'))
const livePoliteness = computed(() => (variant === 'error' ? 'assertive' : 'polite'))

const close = () => {
    visible.value = false
    if (cookieConsent) {
        localStorage.setItem('cookiesAccepted', 'true')
    }
    emit('close')
    if (progressInterval) clearInterval(progressInterval)
}

const invokeAction = () => {
    action?.handler()
    close()
}

onMounted(() => {
    // For cookie consent, only show if not already accepted.
    if (cookieConsent && !localStorage.getItem('cookiesAccepted')) {
        visible.value = true
    }
    if (!cookieConsent) {
        visible.value = true
        if (variant === 'error') hapticNotification('Error')
        else if (variant === 'success') hapticNotification('Success')
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
