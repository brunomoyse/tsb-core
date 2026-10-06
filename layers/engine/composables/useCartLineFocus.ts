import { nextTick } from 'vue'

/*
 * Keeps keyboard focus somewhere sensible when the cart line it was on goes away (audit PR 3.6): removing a line
 * (or taking its last unit off) destroys the focused button, and the browser drops focus on <body>, so a keyboard
 * or screen-reader user loses their place in the cart.
 *
 *  - focus was inside a cart line (`[data-cart-line]`, within the surface's own container) when the action ran, and
 *    it is gone afterwards: it moves to the "Remove" button (`[data-cart-remove]`) of the line that took the
 *    removed one's place (the next one, or the last one when the last line went);
 *  - the cart became empty: it moves to the surface's fallback (the sheet's close button, the page's empty-state link, the cart heading);
 *  - focus was anywhere else, or still sits on a live element (the "−" of a line with several units): left alone.
 */
export interface CartLineFocusOptions {
  /** The surface that lists the lines (sheet, side cart, page). */
  container: () => HTMLElement | null | undefined
  /** Where focus goes when no line is left. */
  fallback: () => HTMLElement | null | undefined
}

const LINE = '[data-cart-line]'
const REMOVE = '[data-cart-remove]'

export function useCartLineFocus(options: CartLineFocusOptions) {
  /** Runs `action` (which removes or decrements a line) and repairs focus afterwards. */
  const keepFocus = async (action: () => void): Promise<void> => {
    const root = options.container()
    const active = document.activeElement
    const lines = root ? Array.from(root.querySelectorAll(LINE)) : []
    const index =
      root && active && root.contains(active)
        ? lines.findIndex((line) => line.contains(active))
        : -1
    action()
    if (index < 0) return
    await nextTick()
    const now = document.activeElement
    if (now && now !== document.body && now.isConnected) return
    // The surface itself may be gone (the menu drops the side cart with the last line): its detached lines are not candidates.
    const remaining =
      root?.isConnected === true ? Array.from(root.querySelectorAll<HTMLElement>(LINE)) : []
    const target = remaining.length
      ? remaining[Math.min(index, remaining.length - 1)]?.querySelector<HTMLElement>(REMOVE)
      : options.fallback()
    target?.focus()
  }
  return { keepFocus }
}
