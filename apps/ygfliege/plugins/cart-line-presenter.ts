import type { CartItem } from '#engine/types'
import { presentBowlLine } from '~/utils/bowlLine'

// A composed bowl's cart line (its broth photo, one summary line, the detail on demand) on every cart surface of the
// engine: the cart sheet, the desktop cart and the checkout summary read it through useCartItemLabel().itemPresentation.
export default defineNuxtPlugin((nuxtApp) => {
  const { t } = nuxtApp.$i18n
  nuxtApp.provide('cartLinePresenter', (item: CartItem) =>
    presentBowlLine(item, (key, named, plural) => t(key, named, plural)),
  )
})
