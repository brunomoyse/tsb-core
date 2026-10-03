import { type Ref, onBeforeUnmount, watch } from 'vue'

/*
 * A sticky header that sits under the page's fixed navigation (the menu's search and category strip) publishes the
 * bottom edge it covers as the CSS variable `--sticky-top-h` on <html>. Each brand's `html { scroll-padding-top }`
 * reads it, so a focused card or field, and a jump to a category, scrolls clear of the header instead of landing
 * underneath it (WCAG 2.4.11 Focus Not Obscured, audit A16). It is the mirror of `--bottom-bar-h`
 * (useBottomBarOffset), which `scroll-padding-bottom` reads.
 *
 * The edge is the header's stuck `top` (the navigation above it) plus its own height, measured, so a header that wraps or
 * loses its category strip is followed. With no such header the variable is not set at all and the brand's own navigation
 * height applies (`var(--sticky-top-h, var(--nav-h))`). Client only, nothing is stored in the Pinia state.
 */

const VARIABLE = '--sticky-top-h'

/** The bottom edge of a sticky header measured from the top of the viewport: its stuck `top` plus its height. */
export const stickyBottom = (el: HTMLElement): number =>
  (Number.parseFloat(getComputedStyle(el).top) || 0) + el.offsetHeight

export function useStickyTopOffset(target: Readonly<Ref<HTMLElement | null | undefined>>): void {
  if (!import.meta.client) return

  let observer: ResizeObserver | null = null
  const root = document.documentElement

  const stop = watch(
    target,
    (el) => {
      observer?.disconnect()
      observer = null
      root.style.removeProperty(VARIABLE)
      if (!el) return
      const publish = (): void => {
        // A header hidden at this breakpoint measures 0 and does not count.
        if (el.offsetHeight > 0)
          root.style.setProperty(VARIABLE, `${Math.round(stickyBottom(el))}px`)
        else root.style.removeProperty(VARIABLE)
      }
      publish()
      observer = new ResizeObserver(publish)
      observer.observe(el)
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => {
    stop()
    observer?.disconnect()
    root.style.removeProperty(VARIABLE)
  })
}
