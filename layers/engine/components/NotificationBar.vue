<template>
    <div
        :role="liveRole"
        :aria-live="livePoliteness"
        aria-atomic="true"
        class="notification-bar fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] w-[500px] max-w-[calc(100vw-2rem)] px-4"
        v-if="visible"
    >
        <transition name="slide-up">
            <div :class="['rounded-2xl shadow-xl px-5 py-3 flex flex-col', variantClasses]" v-if="visible">
                <div class="flex items-center justify-between gap-4">
                    <span class="flex-1 text-sm font-medium break-words">
                      {{ message }}
                    </span>
                    <!-- Custom action button (e.g. Undo) takes precedence -->
                    <button
                        v-if="action"
                        type="button"
                        class="flex-shrink-0 min-h-9 bg-white text-neutral-900 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-neutral-100 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        @click="invokeAction"
                    >
                        {{ action.label }}
                    </button>
                    <!-- Default action button for persistent notifications or cookie consent -->
                    <slot v-else-if="persistent || cookieConsent" name="action">
                        <button
                            type="button"
                            class="flex-shrink-0 min-h-9 bg-white text-neutral-900 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-neutral-100 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            @click="close"
                            :aria-label="cookieConsent ? $t('common.acceptCookies') : $t('common.close')"
                        >
                            {{ cookieConsent ? $t('common.accept') : $t('common.close') }}
                        </button>
                    </slot>
                </div>
                <!-- Progress Bar: Only visible when not persistent and not cookie consent -->
                <div v-if="!persistent && !cookieConsent" class="w-full mt-2 h-0.5 bg-white/20 rounded overflow-hidden">
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

const { message, persistent = false, duration = 4500, cookieConsent = false, variant = 'neutral', action } = defineProps<{
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

// Same palette as the mobile app's toast: dark neutral for info and success
// (green stays reserved), red only for errors.
const variantClasses = computed(() =>
    variant === 'error' ? 'bg-red-700 text-white' : 'bg-neutral-900 text-white',
)

const progressBarClass = 'bg-white/70'

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
