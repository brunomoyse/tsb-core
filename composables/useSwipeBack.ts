import { onMounted, onUnmounted, ref } from 'vue'
import { useHaptics } from '~/composables/useHaptics'
import { useRouter } from 'vue-router'

const EDGE_THRESHOLD = 20 // Px from left edge to start tracking
const SWIPE_THRESHOLD = 0.35 // Fraction of viewport width to trigger back

export function useSwipeBack(contentSelector: string) {
    const router = useRouter()
    const { impact } = useHaptics()
    const swiping = ref(false)

    let startX = 0
    let startY = 0
    let currentX = 0
    let tracking = false
    let directionDecided = false
    let isHorizontal = false
    let hadHaptic = false
    let contentEl: HTMLElement | null = null
    let overlayEl: HTMLElement | null = null

    const hasHorizontalScroll = (el: HTMLElement | null): boolean => {
        while (el) {
            const style = getComputedStyle(el)
            if (
                (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
                el.scrollWidth > el.clientWidth
            ) {
                return true
            }
            el = el.parentElement
        }
        return false
    }

    const onTouchStart = (e: TouchEvent) => {
        const [touch] = e.touches
        if (touch.clientX > EDGE_THRESHOLD) return
        if (hasHorizontalScroll(e.target as HTMLElement)) return
        if (window.history.length <= 1) return

        startX = touch.clientX
        startY = touch.clientY
        tracking = true
        directionDecided = false
        isHorizontal = false
        hadHaptic = false
    }

    const onTouchMove = (e: TouchEvent) => {
        if (!tracking) return
        const [touch] = e.touches
        currentX = touch.clientX - startX
        const deltaY = Math.abs(touch.clientY - startY)

        // Decide direction once we have enough movement
        if (!directionDecided && (Math.abs(currentX) > 10 || deltaY > 10)) {
            directionDecided = true
            isHorizontal = Math.abs(currentX) > deltaY
            if (!isHorizontal) {
                tracking = false
                return
            }
        }

        if (!isHorizontal) return
        if (currentX < 0) {
            currentX = 0
            return
        }

        swiping.value = true

        if (contentEl) {
            contentEl.style.transition = 'none'
            contentEl.style.transform = `translateX(${currentX}px)`
        }

        if (!overlayEl) {
            overlayEl = document.createElement('div')
            overlayEl.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.1);pointer-events:none;transition:none;'
            document.body.appendChild(overlayEl)
        }
        overlayEl.style.opacity = String(Math.max(0, 1 - currentX / window.innerWidth))

        const fraction = currentX / window.innerWidth
        if (fraction >= SWIPE_THRESHOLD && !hadHaptic) {
            hadHaptic = true
            impact('Light')
        }
    }

    const onTouchEnd = () => {
        if (!tracking || !isHorizontal) {
            tracking = false
            return
        }
        tracking = false

        const fraction = currentX / window.innerWidth
        const shouldGoBack = fraction >= SWIPE_THRESHOLD

        if (contentEl) {
            contentEl.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
            if (shouldGoBack) {
                contentEl.style.transform = `translateX(${window.innerWidth}px)`
                setTimeout(() => {
                    router.back()
                    resetState()
                }, 250)
            } else {
                contentEl.style.transform = 'translateX(0)'
                setTimeout(() => resetState(), 300)
            }
        } else if (shouldGoBack) {
            router.back()
            resetState()
        } else {
            resetState()
        }
    }

    const resetState = () => {
        swiping.value = false
        if (contentEl) {
            contentEl.style.transition = ''
            contentEl.style.transform = ''
        }
        if (overlayEl) {
            overlayEl.remove()
            overlayEl = null
        }
    }

    onMounted(() => {
        contentEl = document.querySelector(contentSelector)
        window.addEventListener('touchstart', onTouchStart, { passive: true })
        window.addEventListener('touchmove', onTouchMove, { passive: true })
        window.addEventListener('touchend', onTouchEnd)
    })

    onUnmounted(() => {
        window.removeEventListener('touchstart', onTouchStart)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        resetState()
    })

    return { swiping }
}
