<template>
    <div
        class="flex justify-center overflow-hidden transition-[height] duration-200"
        :style="{ height: indicatorHeight + 'px' }"
        :class="{ 'duration-0': pulling }"
    >
        <div class="flex items-center justify-center py-2">
            <!-- Spinner when refreshing -->
            <svg
                v-if="refreshing"
                class="w-5 h-5 text-gray-400 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
            >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <!-- Arrow when pulling -->
            <svg
                v-else-if="indicatorHeight > 0"
                class="w-5 h-5 text-gray-400 transition-transform duration-200"
                :class="{ 'rotate-180': thresholdReached }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useHaptics } from '~/composables/useHaptics'

const THRESHOLD = 60
const MAX_PULL = 100

const emit = defineEmits<{
    refresh: []
}>()

const { impact } = useHaptics()

const pulling = ref(false)
const refreshing = ref(false)
const thresholdReached = ref(false)
const indicatorHeight = ref(0)

let startY = 0
let hadThresholdHaptic = false

const onTouchStart = (e: TouchEvent) => {
    if (refreshing.value) return
    if (window.scrollY > 0) return
    startY = e.touches[0].clientY
    pulling.value = true
    hadThresholdHaptic = false
}

const onTouchMove = (e: TouchEvent) => {
    if (!pulling.value || refreshing.value) return
    if (window.scrollY > 0) {
        pulling.value = false
        indicatorHeight.value = 0
        return
    }

    const deltaY = e.touches[0].clientY - startY
    if (deltaY < 0) {
        indicatorHeight.value = 0
        return
    }

    const dampened = Math.min(deltaY * 0.4, MAX_PULL)
    indicatorHeight.value = dampened

    const reached = dampened >= THRESHOLD * 0.4
    if (reached && !hadThresholdHaptic) {
        hadThresholdHaptic = true
        impact('Medium')
    }
    thresholdReached.value = reached
}

const onTouchEnd = () => {
    if (!pulling.value) return
    pulling.value = false

    if (thresholdReached.value && !refreshing.value) {
        refreshing.value = true
        indicatorHeight.value = 40
        emit('refresh')
        setTimeout(() => finishRefresh(), 3000)
    } else {
        indicatorHeight.value = 0
    }
    thresholdReached.value = false
}

const finishRefresh = () => {
    refreshing.value = false
    indicatorHeight.value = 0
}

onMounted(() => {
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
})

onUnmounted(() => {
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
})

defineExpose({ finishRefresh })
</script>
