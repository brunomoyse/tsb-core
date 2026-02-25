import { type Ref, onUnmounted, watch } from 'vue'

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(containerRef: Ref<HTMLElement | null>) {
    let previouslyFocused: HTMLElement | null = null

    const getFocusableElements = (): HTMLElement[] => {
        if (!containerRef.value) return []
        return Array.from(containerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    }

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return

        const focusable = getFocusableElements()
        if (focusable.length === 0) return

        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault()
                last.focus()
            }
        } else if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
        }
    }

    const activate = () => {
        previouslyFocused = document.activeElement as HTMLElement | null
        document.addEventListener('keydown', handleKeydown)

        // Focus first focusable element
        const focusable = getFocusableElements()
        if (focusable.length > 0) {
            focusable[0]!.focus()
        }
    }

    const deactivate = () => {
        document.removeEventListener('keydown', handleKeydown)
        previouslyFocused?.focus()
        previouslyFocused = null
    }

    watch(containerRef, (el, oldEl) => {
        if (oldEl && !el) deactivate()
        if (el) activate()
    })

    onUnmounted(() => {
        deactivate()
    })
}
