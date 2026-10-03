<template>
  <ul
    v-if="views.length > 0"
    v-bind="$attrs"
    data-testid="cart-line-issues"
    aria-live="polite"
    class="space-y-1.5"
  >
    <li
      v-for="view in views"
      :key="view.code"
      :data-testid="`cart-line-issue-${view.code}`"
      class="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900"
    >
      <p class="font-medium leading-snug">{{ message(view) }}</p>
      <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          v-for="(action, index) in view.actions"
          :key="action"
          type="button"
          :data-testid="`cart-line-issue-action-${action}`"
          :class="[
            'min-h-9 rounded-md px-2.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            index === 0
              ? 'bg-amber-700 text-white hover:bg-amber-800'
              : 'text-amber-900 underline underline-offset-2 hover:text-amber-800',
          ]"
          @click="run(action, view)"
        >
          {{ label(action) }}
        </button>
      </div>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import {
  type LineIssueAction,
  type LineIssueView,
  describeLineIssues,
} from '#engine/utils/cartIssues'
import { computed, navigateTo, useLocalePath } from '#imports'
import type { CartItem } from '#engine/types'
import { formatCents } from '#engine/lib/price'
import { lineTotalCents } from '#engine/utils/pricing'
import { quoteLineByKey } from '#engine/utils/orderQuote'
import { toCents } from '#engine/utils/money'
import { useCartRemoval } from '#engine/composables/useCartRemoval'
import { useCartStore } from '#engine/stores/cart'
import { useI18n } from 'vue-i18n'
import { useQuoteStore } from '#engine/stores/quote'
import { useTracking } from '#engine/composables/useTracking'

/*
 * What the server quote says about ONE cart line, on the line itself, with the way out: remove it
 * (gone / sold out / invalid), accept the new price, or pick a lunch slot. Payment stays blocked
 * until every line is resolved (`useOrderQuote` / `isQuoteBlocking`). The wording and the actions
 * come from utils/cartIssues.ts; nothing here is the backend's English text.
 */
defineOptions({ inheritAttrs: false })

const { item, lineKey = '' } = defineProps<{ item: CartItem; lineKey?: string }>()

const { t } = useI18n()
const cartStore = useCartStore()
const quoteStore = useQuoteStore()
const localePath = useLocalePath()
const { trackEvent } = useTracking()

const SLOT_PICKER_ID = 'checkout-preferred-time'

const quoteLine = computed(() =>
  quoteStore.quote ? quoteLineByKey(quoteStore.quote, quoteStore.lineKeys, lineKey) : null,
)

const views = computed<LineIssueView[]>(() =>
  describeLineIssues(
    quoteStore.lineIssues[lineKey] ?? [],
    lineTotalCents(item),
    toCents(quoteLine.value?.lineTotal),
  )
    // Accepted a moment ago: the line already shows the quoted price, the next quote clears the issue.
    .filter(
      (view) => !(view.code === 'PRICE_CHANGED' && view.params.fromCents === view.params.toCents),
    ),
)

const message = (view: LineIssueView): string =>
  t(view.messageKey, {
    from: formatCents(view.params.fromCents ?? 0),
    to: formatCents(view.params.toCents ?? 0),
  })

const label = (action: LineIssueAction): string =>
  t(
    action === 'remove'
      ? 'cart.removeItem'
      : action === 'accept-price'
        ? 'cart.issues.acceptPrice'
        : 'cart.issues.chooseSlot',
  )

// Like every other surface: removed with an Undo toast (restoring it just flags the line again).
const { removeLine: removeCartLine } = useCartRemoval()
const removeLine = () => removeCartLine(item)

const chooseSlot = async () => {
  const picker = import.meta.client ? document.getElementById(SLOT_PICKER_ID) : null
  if (picker) {
    // Already on the checkout page: bring the picker into view.
    picker.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => picker.focus({ preventScroll: true }), 250)
    return
  }
  cartStore.setCartVisibility(false)
  await navigateTo({ path: localePath('/checkout'), hash: `#${SLOT_PICKER_ID}` })
}

const run = (action: LineIssueAction, view: LineIssueView) => {
  trackEvent('cart_line_issue_action', { code: view.code, action, product_id: item.product.id })
  if (action === 'remove') removeLine()
  else if (action === 'accept-price') {
    if (quoteLine.value) cartStore.acceptQuotedPrice(item, quoteLine.value)
  } else void chooseSlot()
}
</script>
