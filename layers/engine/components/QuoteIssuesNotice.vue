<template>
  <div
    v-if="messages.length > 0 || showLineIssues"
    role="alert"
    aria-live="polite"
    data-testid="checkout-quote-issues"
    class="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800"
  >
    <p class="font-semibold mb-1">{{ $t('checkout.quoteIssuesTitle') }}</p>
    <ul class="list-disc pl-5 space-y-0.5">
      <li v-if="showLineIssues">{{ $t('checkout.quoteLineIssues') }}</li>
      <li v-for="message in messages" :key="message">{{ message }}</li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { blockingOrderIssues, hasLineIssues } from '#engine/utils/orderQuote'
import { computed } from 'vue'
import { describeErrorCode } from '#engine/utils/gqlErrors'
import { useI18n } from 'vue-i18n'
import { useQuoteStore } from '#engine/stores/quote'

/*
 * What stops the order according to the server quote of the CURRENT cart (checkout page): the lines
 * with issues are marked on their own line, this lists the problems of the order itself (ordering
 * switched off, a time slot that is gone, a promo code that no longer applies, ...). Everything is
 * translated from the issue codes; the backend's English text never reaches the customer.
 *
 * Not repeated here: the delivery minimum has its own banner on the page.
 */
const { t } = useI18n()
const quoteStore = useQuoteStore()

const ALREADY_SHOWN_ELSEWHERE = new Set(['DELIVERY_MINIMUM_NOT_MET'])

const messages = computed(() => {
  const quote = quoteStore.freshQuote
  if (!quote) return []
  const texts = blockingOrderIssues(quote)
    .filter((issue) => !ALREADY_SHOWN_ELSEWHERE.has(issue.code))
    .map((issue) => {
      const described = describeErrorCode(
        issue.code,
        issue.minimum ? { minimum: issue.minimum } : {},
      )
      return t(described?.key ?? 'notify.errors.requestFailed', described?.params ?? {})
    })
  return [...new Set(texts)]
})

const showLineIssues = computed(() => {
  const quote = quoteStore.freshQuote
  return quote ? hasLineIssues(quote) : false
})
</script>
