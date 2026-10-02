import { type Ref, onBeforeUnmount, watch } from 'vue'

/*
 * Fixed bars along the bottom of the screen (checkout pay bar, floating cart bar, the /cart bar, the
 * open cart drawer) publish their height as the CSS variable `--bottom-bar-h` on <html>, so what else
 * floats at the bottom (the toasts, the scroll-to-top button) can sit above them instead of covering
 * their buttons (audit finding M19/M26). The bars' own height includes their safe-area spacer.
 *
 * Several bars can exist at once: the variable holds the tallest. With no bar the variable is not
 * set at all, so `var(--bottom-bar-h, env(safe-area-inset-bottom, 0px))` falls back to the safe area.
 * Client only, nothing is stored in the Pinia state.
 */

const VARIABLE = '--bottom-bar-h'
const heights = new Map<symbol, number>()

const publish = (): void => {
    const tallest = Math.max(0, ...heights.values())
    const root = document.documentElement
    if (tallest > 0) root.style.setProperty(VARIABLE, `${tallest}px`)
    else root.style.removeProperty(VARIABLE)
}

export function useBottomBarOffset(target: Ref<HTMLElement | null | undefined>): void {
    if (!import.meta.client) return

    const id = Symbol('bottom-bar')
    let observer: ResizeObserver | null = null

    const measure = (el: HTMLElement): void => {
        // A bar hidden at this breakpoint (display: none) measures 0 and does not count.
        const height = el.offsetHeight
        if (height > 0) heights.set(id, height)
        else heights.delete(id)
        publish()
    }

    const stop = watch(target, (el) => {
        observer?.disconnect()
        observer = null
        heights.delete(id)
        publish()
        if (!el) return
        measure(el)
        observer = new ResizeObserver(() => measure(el))
        observer.observe(el)
    }, { immediate: true, flush: 'post' })

    onBeforeUnmount(() => {
        stop()
        observer?.disconnect()
        heights.delete(id)
        publish()
    })
}
