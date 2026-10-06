import { type Ref, computed, onScopeDispose, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBodyScrollLock } from '#engine/composables/useBodyScrollLock'
import { useCartStore } from '#engine/stores/cart'
import { useFocusTrap } from '#engine/composables/useFocusTrap'
import { useInertBackground } from '#engine/composables/useInertBackground'
import { useMediaQuery } from '@vueuse/core'

/*
 * Dialog behaviour of the mobile cart sheet (audit A1), shared by both brands' <CartMobile>: focus trap with
 * the close button focused first, Escape closes, the page behind is locked (scroll) and inert, and focus goes
 * back to the control that opened the sheet (the floating cart bar or the navbar cart button).
 *
 * The sheet is `lg:hidden`: on desktop the same store flag drives nothing visible, so none of this applies there.
 */
const TRIGGER_SELECTOR = '[data-cart-trigger]'

const isRendered = (el: Element): boolean => el.getClientRects().length > 0

export function useCartSheet(
  panelRef: Ref<HTMLElement | null>,
  closeButtonRef: Ref<HTMLElement | null>,
) {
  const cartStore = useCartStore()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isSheetOpen = computed(() => cartStore.isCartVisible && !isDesktop.value)

  // The opener is read the moment the sheet opens (sync, before the render makes the page inert and drops focus to <body>).
  let opener: HTMLElement | null = null
  /*
   * The sheet also closes because the visitor followed a link in it (Checkout, a line issue): the opener belongs to the page they
   * left, so focus must not jump to the cart trigger of the new one. The navigation guard fires in the click that closed the sheet,
   * before the leave transition ends and long before the new page has rendered.
   */
  const route = useRoute()
  const router = useRouter()
  let openedPath = ''
  let navigatedAway = false
  watch(
    () => cartStore.isCartVisible,
    (visible) => {
      if (!visible) return
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      opener = focused && focused !== document.body ? focused : null
      openedPath = route.path
      navigatedAway = false
    },
    { flush: 'sync' },
  )
  if (import.meta.client) {
    const removeGuard = router.beforeEach((to) => {
      if (openedPath && to.path !== openedPath) navigatedAway = true
    })
    onScopeDispose(removeGuard)
  }

  const returnTarget = (): HTMLElement | null | false => {
    if (navigatedAway || (openedPath && route.path !== openedPath)) return false
    if (opener !== null && opener.isConnected && isRendered(opener)) return opener
    // Safari does not focus a button on click: fall back to whichever cart trigger is on screen.
    return (
      Array.from(document.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR)).find(isRendered) ?? null
    )
  }

  useBodyScrollLock(isSheetOpen)
  useInertBackground(isSheetOpen)
  // Active from when the panel is in the DOM until its leave transition has finished, so focus returns once the page is reachable again.
  useFocusTrap(
    computed(() => (isDesktop.value ? null : panelRef.value)),
    {
      initialFocus: () => closeButtonRef.value,
      returnFocus: returnTarget,
      onEscape: () => {
        cartStore.setCartVisibility(false)
      },
      companions: () => Array.from(document.querySelectorAll('[data-focus-trap-companion]')),
    },
  )

  return { isSheetOpen }
}
