import { type MaybeRefOrGetter, onBeforeUnmount, toValue, watch } from 'vue'

/*
 * Makes the page behind a modal sheet inert while it is open, so keyboard focus, taps and screen-reader
 * browsing cannot reach it (aria-modal alone is ignored by some assistive technologies). The layouts mark the
 * page wrapper with `data-app-root`; the sheet itself and the toasts live outside that wrapper.
 */
export function useInertBackground(active: MaybeRefOrGetter<boolean>, selector = '[data-app-root]'): void {
    if (!import.meta.client) return
    const apply = (on: boolean): void => {
        document.querySelectorAll(selector).forEach((el) => {
            if (on) el.setAttribute('inert', '')
            else el.removeAttribute('inert')
        })
    }
    const stop = watch(() => toValue(active), apply, { immediate: true, flush: 'post' })
    onBeforeUnmount(() => {
        stop()
        apply(false)
    })
}
