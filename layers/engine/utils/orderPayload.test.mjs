// The cart -> API payload: createOrder and quoteOrder share one item builder.
// Run: `node --test layers/engine/utils/orderPayload.test.mjs`.

import { buildCreateOrderInput, buildQuoteInput, orderItemPayload } from './orderPayload.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const bowl = {
  product: { id: 'bowl', price: '10.00', choices: [{ id: 'broth-b', priceModifier: '1.50' }] },
  quantity: 2,
  selectedChoices: [{ groupId: 'broths', choiceId: 'broth-b', quantity: 2 }],
  selectedChoice: null,
}
const tea = {
  product: { id: 'tea', price: '3.50', choices: [] },
  quantity: 1,
  selectedChoices: [],
  selectedChoice: null,
}
const legacy = {
  product: { id: 'salmon', price: '12.50', choices: [{ id: 'c1', priceModifier: '0.50' }] },
  quantity: 3,
  selectedChoices: [],
  selectedChoice: { id: 'c1', priceModifier: '0.50' },
}

const cart = (overrides = {}) => ({
  products: [bowl, tea],
  collectionOption: 'DELIVERY',
  paymentOption: 'ONLINE',
  address: { id: 'place-1' },
  addressExtra: 'ring twice',
  couponCode: 'TOKYO10',
  orderNote: '  no onions  ',
  orderExtra: [{ name: 'chopsticks' }],
  preferredReadyTime: null,
  cashPaymentAmount: null,
  ...overrides,
})

test('an order line carries its selections, or the legacy single choice, never both', () => {
  assert.deepEqual(orderItemPayload(bowl), {
    productId: 'bowl',
    quantity: 2,
    selections: bowl.selectedChoices,
  })
  assert.deepEqual(orderItemPayload(tea), { productId: 'tea', quantity: 1 })
  assert.deepEqual(orderItemPayload(legacy), { productId: 'salmon', quantity: 3, choiceId: 'c1' })
})

test('createOrder input: what checkout used to build inline', () => {
  assert.deepEqual(buildCreateOrderInput(cart()), {
    orderType: 'DELIVERY',
    isOnlinePayment: true,
    addressPlaceId: 'place-1',
    addressExtra: 'ring twice',
    couponCode: 'TOKYO10',
    orderNote: 'no onions',
    orderExtra: [{ name: 'chopsticks' }],
    items: [
      { productId: 'bowl', quantity: 2, selections: bowl.selectedChoices },
      { productId: 'tea', quantity: 1 },
    ],
    preferredReadyTime: null,
    cashPaymentAmount: null,
  })
})

test('pickup sends no address; a blank note is null; a fixed slot is passed through', () => {
  const input = buildCreateOrderInput(
    cart({
      collectionOption: 'PICKUP',
      orderNote: '   ',
      preferredReadyTime: '2026-05-13T12:30:00+02:00',
    }),
  )
  assert.equal(input.addressPlaceId, null)
  assert.equal(input.orderNote, null)
  assert.equal(input.preferredReadyTime, '2026-05-13T12:30:00+02:00')
})

test('the cash amount is only sent for cash orders, trimmed, and null when blank', () => {
  assert.equal(
    buildCreateOrderInput(cart({ paymentOption: 'CASH', cashPaymentAmount: ' 50 ' }))
      .cashPaymentAmount,
    '50',
  )
  assert.equal(
    buildCreateOrderInput(cart({ paymentOption: 'CASH', cashPaymentAmount: '  ' }))
      .cashPaymentAmount,
    null,
  )
  assert.equal(
    buildCreateOrderInput(cart({ paymentOption: 'ONLINE', cashPaymentAmount: '50' }))
      .cashPaymentAmount,
    null,
  )
  assert.equal(
    buildCreateOrderInput(cart({ paymentOption: 'CASH', cashPaymentAmount: 20 })).cashPaymentAmount,
    '20',
  )
})

test('quote input: the same items as the order, plus the total the cart shows for each line', () => {
  const quote = buildQuoteInput(cart())
  const order = buildCreateOrderInput(cart())
  const withoutExpected = quote.items.map((item) => {
    const rest = { ...item }
    delete rest.expectedLineTotal
    return rest
  })
  assert.deepEqual(withoutExpected, order.items)
  // 2 bowls: 2 × 10.00 + 2 × 1.50 broth = 23.00 ; tea 3.50
  assert.deepEqual(
    quote.items.map((item) => item.expectedLineTotal),
    ['23.00', '3.50'],
  )
  assert.deepEqual(
    { ...quote, items: undefined },
    {
      orderType: 'DELIVERY',
      isOnlinePayment: true,
      addressPlaceId: 'place-1',
      preferredReadyTime: null,
      couponCode: 'TOKYO10',
      items: undefined,
    },
  )
})

test('quote input leaves out what only matters once the order is placed', () => {
  const quote = buildQuoteInput(cart({ paymentOption: 'CASH', cashPaymentAmount: '50' }))
  for (const key of ['orderNote', 'orderExtra', 'addressExtra', 'cashPaymentAmount'])
    assert.ok(!(key in quote), key)
  assert.equal(quote.isOnlinePayment, false)
})

test('a line priced from a legacy single choice expects the surcharge on every unit', () => {
  const quote = buildQuoteInput(cart({ products: [legacy], collectionOption: 'PICKUP' }))
  // 3 × 12.50 + 3 × 0.50
  assert.equal(quote.items[0].expectedLineTotal, '39.00')
  assert.equal(quote.items[0].choiceId, 'c1')
  assert.equal(quote.addressPlaceId, null)
})

test('a blank coupon is null (never an empty string)', () => {
  assert.equal(buildQuoteInput(cart({ couponCode: '' })).couponCode, null)
  assert.equal(buildCreateOrderInput(cart({ couponCode: null })).couponCode, null)
})
