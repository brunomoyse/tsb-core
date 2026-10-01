<template>
    <section data-testid="order-receipt" :aria-labelledby="titleId">
        <h3 :id="titleId" class="text-xs font-semibold uppercase tracking-wider opacity-60 mb-3">
            {{ $t('orderCompleted.receipt.title') }}
        </h3>
        <dl class="space-y-1.5 text-sm">
            <div class="flex justify-between gap-4" data-testid="receipt-subtotal">
                <dt class="opacity-70">{{ $t('cart.subtotal') }}</dt>
                <dd class="tabular-nums">{{ formatCents(receipt.subtotalCents) }}</dd>
            </div>
            <div v-if="receipt.deliveryFeeCents !== null" class="flex justify-between gap-4" data-testid="receipt-delivery">
                <dt class="opacity-70">{{ $t('cart.deliveryFee') }}</dt>
                <dd class="tabular-nums">{{ receipt.deliveryFeeCents === 0 ? $t('checkout.free') : formatCents(receipt.deliveryFeeCents) }}</dd>
            </div>
            <div v-if="receipt.discountCents > 0" class="flex justify-between gap-4" data-testid="receipt-discount">
                <dt class="opacity-70">
                    {{ $t('orderCompleted.receipt.discount') }}<span v-if="receipt.couponCode"> ({{ receipt.couponCode }})</span>
                </dt>
                <dd class="tabular-nums">−{{ formatCents(receipt.discountCents) }}</dd>
            </div>
            <div v-if="receipt.onlineFeeCents > 0" class="flex justify-between gap-4" data-testid="receipt-online-fee">
                <dt class="opacity-70">{{ $t('cart.onlineFee') }}</dt>
                <dd class="tabular-nums">{{ formatCents(receipt.onlineFeeCents) }}</dd>
            </div>
            <div v-if="receipt.roundingCents !== 0" class="flex justify-between gap-4" data-testid="receipt-rounding">
                <dt class="opacity-70">{{ $t('orderCompleted.receipt.rounding') }}</dt>
                <dd class="tabular-nums">{{ receipt.roundingCents < 0 ? '−' : '+' }}{{ formatCents(Math.abs(receipt.roundingCents)) }}</dd>
            </div>
            <div class="flex justify-between gap-4 border-t border-current/10 pt-2 text-base font-bold" data-testid="receipt-total">
                <dt>{{ $t('cart.total') }}</dt>
                <dd class="tabular-nums">{{ formatCents(receipt.totalCents) }}</dd>
            </div>
        </dl>

        <dl class="mt-4 space-y-3 text-sm">
            <div data-testid="receipt-payment">
                <dt class="text-xs uppercase tracking-wider opacity-60">{{ $t('checkout.paymentMethod') }}</dt>
                <dd class="mt-0.5">
                    <template v-if="receipt.paymentMethod === 'ONLINE'">{{ $t('orderCompleted.receipt.paidOnline') }}</template>
                    <template v-else>
                        {{ order.type === 'DELIVERY' ? $t('orderCompleted.receipt.cashDelivery') : $t('orderCompleted.receipt.cashPickup') }}
                        <span v-if="receipt.cashPaymentCents !== null" class="block opacity-70">
                            {{ $t('orderCompleted.receipt.cashWith', { amount: formatCents(receipt.cashPaymentCents) }) }}
                            <template v-if="receipt.changeDueCents !== null"> · {{ $t('orderCompleted.receipt.changeDue', { amount: formatCents(receipt.changeDueCents) }) }}</template>
                        </span>
                    </template>
                </dd>
            </div>
            <div data-testid="receipt-destination">
                <dt class="text-xs uppercase tracking-wider opacity-60">
                    {{ order.type === 'DELIVERY' ? $t('orderCompleted.receipt.deliveryTo') : $t('orderCompleted.receipt.pickupAt') }}
                </dt>
                <dd class="mt-0.5 whitespace-pre-line">{{ destination }}</dd>
                <dd v-if="order.type === 'DELIVERY' && order.addressExtra" class="opacity-70">{{ order.addressExtra }}</dd>
            </div>
        </dl>
    </section>
</template>

<script lang="ts" setup>
import { computed, useId } from 'vue'
import type { Order } from '#engine/types'
import { brand } from '#brand/brand'
import { buildOrderReceipt } from '#engine/utils/orderReceipt'
import { formatAddress } from '#engine/utils/utils'
import { formatCents } from '#engine/lib/price'

/*
 * The money, the payment method and the place of an order (audit M24). Brand-neutral: it inherits the
 * text colour of its card and uses opacity for the muted text. The numbers come from `buildOrderReceipt`
 * (pure, tested); the pickup point is the brand's address.
 */
const { order } = defineProps<{ order: Order }>()

const titleId = `order-receipt-${useId()}`
const receipt = computed(() => buildOrderReceipt(order))
const destination = computed(() => order.type === 'DELIVERY'
    ? formatAddress(order.address)
    : `${brand.address.street}\n${brand.address.postal} ${brand.address.city}`)
</script>
