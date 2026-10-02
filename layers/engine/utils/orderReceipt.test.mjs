// Run: `node --test layers/engine/utils/orderReceipt.test.mjs`.

import assert from 'node:assert/strict'
import { buildOrderReceipt } from './orderReceipt.ts'
import { test } from 'node:test'

test('delivery order: subtotal, delivery fee and total add up, nothing to round', () => {
  const receipt = buildOrderReceipt({
    type: 'DELIVERY', isOnlinePayment: false, items: [{ totalPrice: '20.00' }, { totalPrice: '10.50' }],
    deliveryFee: '2.00', discountAmount: '0.00', transactionFee: null, totalPrice: '32.50',
  })
  assert.equal(receipt.subtotalCents, 3050)
  assert.equal(receipt.deliveryFeeCents, 200)
  assert.equal(receipt.discountCents, 0)
  assert.equal(receipt.roundingCents, 0)
  assert.equal(receipt.totalCents, 3250)
  assert.equal(receipt.paymentMethod, 'CASH')
})

test('pickup order: no delivery row; the discount and the online fee are separate rows', () => {
  const receipt = buildOrderReceipt({
    type: 'PICKUP', isOnlinePayment: true, items: [{ totalPrice: '30.00' }], deliveryFee: '0.00',
    discountAmount: '3.00', transactionFee: '0.30', totalPrice: '27.30', couponCode: null,
  })
  assert.equal(receipt.deliveryFeeCents, null)
  assert.equal(receipt.discountCents, 300)
  assert.equal(receipt.onlineFeeCents, 30)
  assert.equal(receipt.roundingCents, 0)
  assert.equal(receipt.paymentMethod, 'ONLINE')
})

test('free delivery is 0, not null', () => {
  const receipt = buildOrderReceipt({ type: 'DELIVERY', isOnlinePayment: true, items: [{ totalPrice: '30.00' }], deliveryFee: '0.00', totalPrice: '30.00' })
  assert.equal(receipt.deliveryFeeCents, 0)
})

test('the 0,10 EUR rounding of the stored total becomes its own signed line', () => {
  const up = buildOrderReceipt({ type: 'PICKUP', isOnlinePayment: false, items: [{ totalPrice: '12.48' }], totalPrice: '12.50' })
  assert.equal(up.roundingCents, 2)
  const down = buildOrderReceipt({ type: 'PICKUP', isOnlinePayment: false, items: [{ totalPrice: '12.43' }], totalPrice: '12.40' })
  assert.equal(down.roundingCents, -3)
})

test('a coupon larger than the basket leaves only the online fee', () => {
  const receipt = buildOrderReceipt({
    type: 'PICKUP', isOnlinePayment: true, items: [{ totalPrice: '5.00' }], discountAmount: '8.00', transactionFee: '0.30', totalPrice: '0.30', couponCode: 'BIG',
  })
  assert.equal(receipt.roundingCents, 0)
  assert.equal(receipt.couponCode, 'BIG')
})

test('cash with a "paying with" amount above the total reports the change due', () => {
  const receipt = buildOrderReceipt({ type: 'DELIVERY', isOnlinePayment: false, items: [{ totalPrice: '28.00' }], deliveryFee: '2.00', totalPrice: '30.00', cashPaymentAmount: '50.00' })
  assert.equal(receipt.cashPaymentCents, 5000)
  assert.equal(receipt.changeDueCents, 2000)
  const exact = buildOrderReceipt({ type: 'PICKUP', isOnlinePayment: false, items: [{ totalPrice: '30.00' }], totalPrice: '30.00', cashPaymentAmount: '30.00' })
  assert.equal(exact.changeDueCents, null)
  const online = buildOrderReceipt({ type: 'PICKUP', isOnlinePayment: true, items: [{ totalPrice: '30.00' }], totalPrice: '30.00', cashPaymentAmount: '50.00' })
  assert.equal(online.cashPaymentCents, null)
})
