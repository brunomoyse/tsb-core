import { type Ref, onUnmounted, watch } from 'vue'

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ')

export interface FocusTrapOptions {
    /** Element to focus when the trap activates. Defaults to the first focusable element. */
    initialFocus?: () => HTMLElement | null | undefined
    /** Where focus goes when the trap deactivates. Defaults to the element that was focused when it activated; `false` leaves focus alone. */
    returnFocus?: () => HTMLElement | null | undefined | false
    /**
     * When given, the topmost trap swallows Escape (capture phase, stopImmediatePropagation) and calls this,
     * so a lightbox over a modal closes alone and the modal's own Escape handler never sees the key.
     */
    onEscape?: () => void
    /** Elements outside the container that Tab may still reach as part of the cycle (e.g. the toast's Undo button). */
    companions?: () => Element[]
}

// Active traps, innermost last: only the topmost one handles keys, so a lightbox over a modal does not fight it.
const activeTraps: symbol[] = []

const isTabbable = (el: HTMLElement): boolean => {
    if (el.tabIndex < 0 || el.closest('[inert]')) return false
    return typeof el.checkVisibility === 'function'
        ? el.checkVisibility({ visibilityProperty: true })
        : el.getClientRects().length > 0
}

export function useFocusTrap(containerRef: Readonly<Ref<HTMLElement | null>>, options: FocusTrapOptions = {}) {
    const id = Symbol('focus-trap')
    let previouslyFocused: HTMLElement | null = null
    let active = false

    const isTopmost = (): boolean => activeTraps[activeTraps.length - 1] === id

    const regions = (): Element[] => (containerRef.value ? [containerRef.value, ...(options.companions?.() ?? [])] : [])

    const getFocusableElements = (): HTMLElement[] =>
        regions()
            .flatMap((region) => Array.from(region.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)))
            .filter(isTabbable)

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !isTopmost()) return

        const focusable = getFocusableElements()
        if (focusable.length === 0) return

        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        const current = document.activeElement

        // Focus outside the dialog (a click on the backdrop leaves it on <body>): pull it back in.
        if (!current || !regions().some((region) => region.contains(current))) {
            e.preventDefault()
            ;(e.shiftKey ? last : first).focus()
            return
        }

        if (e.shiftKey) {
            if (current === first || current === containerRef.value) {
                e.preventDefault()
                last.focus()
            }
        } else if (current === last) {
            e.preventDefault()
            first.focus()
        }
    }

    const handleEscape = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' || !isTopmost()) return
        // Escape inside a companion (the toast) belongs to that companion.
        const target = e.target as Node | null
        if (target && (options.companions?.() ?? []).some((el) => el.contains(target))) return
        e.preventDefault()
        e.stopImmediatePropagation()
        options.onEscape?.()
    }

    const activate = () => {
        if (active) return
        active = true
        previouslyFocused = document.activeElement as HTMLElement | null
        activeTraps.push(id)
        document.addEventListener('keydown', handleKeydown)
        if (options.onEscape) window.addEventListener('keydown', handleEscape, true)

        const target = options.initialFocus?.() ?? getFocusableElements()[0]
        target?.focus({ preventScroll: true })
    }

    const deactivate = () => {
        if (!active) return
        active = false
        const index = activeTraps.indexOf(id)
        if (index !== -1) activeTraps.splice(index, 1)
        document.removeEventListener('keydown', handleKeydown)
        window.removeEventListener('keydown', handleEscape, true)

        const requested = options.returnFocus?.()
        const target = requested === undefined || requested === null ? previouslyFocused : requested
        previouslyFocused = null
        if (target && target.isConnected) target.focus()
    }

    // Post flush: the container (or the attributes that make it reachable, such as `inert`) is in the DOM by the time we look for something to focus.
    watch(containerRef, (el, oldEl) => {
        if (oldEl && !el) deactivate()
        if (el) activate()
    }, { flush: 'post' })

    onUnmounted(() => {
        deactivate()
    })
}
