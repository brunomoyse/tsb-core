// The checkout from cart to createOrder: payload matrix, the answer of the server, every error shown translated.
// Run: `vp test run layers/engine/utils/checkoutSubmit.test.mjs`.

import { GQL_KNOWN_CODES, describeErrorCode, describeGqlError } from './gqlErrors.ts'
import { GqlError, unwrapGqlError } from './gqlError.ts'
import { blockingProductName, orderPlacementRoute } from './checkoutSubmit.ts'
import { buildCreateOrderInput, buildQuoteInput } from './orderPayload.ts'
import { describe, test } from 'vite-plus/test'
import { describeLineIssue, describeLineIssues } from './cartIssues.ts'
import { isQuoteBlocking, lineIssuesByKey, quoteLineByKey, recheckQuote } from './orderQuote.ts'
import { DEFAULT_ORDERING_POLICY as POLICY } from './orderingPolicy.ts'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const bowl = {
  product: { id: 'bowl', name: 'Malatang bowl', price: '10.00', choices: [] },
  quantity: 2,
  selectedChoices: [],
  selectedChoice: null,
}
const gyoza = {
  product: { id: 'gyoza', name: 'Gyoza', price: '6.00', choices: [] },
  quantity: 1,
  selectedChoices: [],
  selectedChoice: null,
}
const cart = (overrides = {}) => ({
  products: [bowl, gyoza],
  collectionOption: 'PICKUP',
  paymentOption: 'ONLINE',
  address: null,
  addressExtra: null,
  couponCode: null,
  orderNote: null,
  orderExtra: null,
  preferredReadyTime: null,
  cashPaymentAmount: null,
  ...overrides,
})
const wire = (code, extra = {}, message = 'raw backend text') =>
  new GqlError([{ message, extensions: { code, ...extra } }], { operationName: 'CreateOrder' })

describe('payload for every way to order', () => {
  const place = { id: 'place-1' }
  const cases = [
    [
      'pickup + online',
      cart(),
      { orderType: 'PICKUP', isOnlinePayment: true, addressPlaceId: null },
    ],
    [
      'pickup + cash',
      cart({ paymentOption: 'CASH', cashPaymentAmount: '30' }),
      {
        orderType: 'PICKUP',
        isOnlinePayment: false,
        addressPlaceId: null,
        cashPaymentAmount: '30',
      },
    ],
    [
      'delivery + online',
      cart({ collectionOption: 'DELIVERY', address: place }),
      { orderType: 'DELIVERY', isOnlinePayment: true, addressPlaceId: 'place-1' },
    ],
    [
      'delivery + cash',
      cart({ collectionOption: 'DELIVERY', address: place, paymentOption: 'CASH' }),
      {
        orderType: 'DELIVERY',
        isOnlinePayment: false,
        addressPlaceId: 'place-1',
        cashPaymentAmount: null,
      },
    ],
  ]
  for (const [name, source, expected] of cases) {
    test(name, () => {
      const input = buildCreateOrderInput(source)
      for (const [key, value] of Object.entries(expected)) assert.equal(input[key], value, key)
      assert.deepEqual(
        input.items.map((i) => [i.productId, i.quantity]),
        [
          ['bowl', 2],
          ['gyoza', 1],
        ],
      )
      // What is priced is what is ordered, for every combination.
      const quote = buildQuoteInput(source)
      assert.equal(quote.orderType, input.orderType)
      assert.equal(quote.isOnlinePayment, input.isOnlinePayment)
      assert.equal(quote.addressPlaceId, input.addressPlaceId)
    })
  }

  test('a stale address and a stale cash amount never leak into the other mode', () => {
    const pickup = buildCreateOrderInput(cart({ address: place, cashPaymentAmount: '50' }))
    assert.equal(pickup.addressPlaceId, null)
    assert.equal(pickup.cashPaymentAmount, null)
    assert.equal(buildQuoteInput(cart({ address: place })).addressPlaceId, null)
  })

  test('delivery without an address sends no place id (the server answers ADDRESS_REQUIRED)', () => {
    assert.equal(buildCreateOrderInput(cart({ collectionOption: 'DELIVERY' })).addressPlaceId, null)
  })

  test('an empty cart sends no items (the server answers ORDER_EMPTY)', () => {
    assert.deepEqual(buildCreateOrderInput(cart({ products: [] })).items, [])
  })

  test('the order carries the extras, the coupon, the address note and the slot as chosen', () => {
    const input = buildCreateOrderInput(
      cart({
        collectionOption: 'DELIVERY',
        address: place,
        addressExtra: 'floor 3',
        couponCode: 'TOKYO10',
        orderExtra: [{ name: 'soy sauce', options: ['both'] }],
        preferredReadyTime: '2026-10-03T19:30:00+02:00',
      }),
    )
    assert.equal(input.addressExtra, 'floor 3')
    assert.equal(input.couponCode, 'TOKYO10')
    assert.deepEqual(input.orderExtra, [{ name: 'soy sauce', options: ['both'] }])
    assert.equal(input.preferredReadyTime, '2026-10-03T19:30:00+02:00')
  })
})

describe('the answer of createOrder', () => {
  test('an online order leaves for the payment page', () => {
    const order = {
      id: 'o1',
      payment: { links: { checkout: { href: 'https://mollie.test/pay/1' } } },
    }
    assert.deepEqual(orderPlacementRoute(order), {
      kind: 'payment',
      href: 'https://mollie.test/pay/1',
    })
  })

  test('a cash order (no payment links) goes to its confirmation page', () => {
    assert.deepEqual(orderPlacementRoute({ id: 'o2', payment: null }), {
      kind: 'confirmation',
      orderId: 'o2',
    })
    assert.deepEqual(orderPlacementRoute({ id: 'o3' }), { kind: 'confirmation', orderId: 'o3' })
    assert.deepEqual(orderPlacementRoute({ id: 'o4', payment: { links: null } }), {
      kind: 'confirmation',
      orderId: 'o4',
    })
  })

  test('an answer with neither a link nor an id keeps the customer on the page', () => {
    assert.deepEqual(orderPlacementRoute(null), { kind: 'none' })
    assert.deepEqual(orderPlacementRoute(undefined), { kind: 'none' })
    assert.deepEqual(orderPlacementRoute({}), { kind: 'none' })
    assert.deepEqual(orderPlacementRoute({ id: '' }), { kind: 'none' })
  })
})

describe('named items in error messages', () => {
  test('the product of the error is looked up in the cart by extensions.productId', () => {
    assert.equal(blockingProductName('gyoza', cart().products), 'Gyoza')
    assert.equal(blockingProductName('bowl', cart().products), 'Malatang bowl')
  })

  test('no product id, a non-string id or a product no longer in the cart names nothing', () => {
    assert.equal(blockingProductName(undefined, cart().products), undefined)
    assert.equal(blockingProductName(42, cart().products), undefined)
    assert.equal(blockingProductName('ghost', cart().products), undefined)
    assert.equal(blockingProductName('bowl', []), undefined)
  })

  for (const code of ['PRODUCT_NOT_FOUND', 'PRODUCT_UNAVAILABLE', 'SELECTION_INVALID']) {
    test(`${code} from the wire names the cart item through the page's lookup`, () => {
      const err = wire(code, { productId: 'gyoza' })
      const name = blockingProductName(unwrapGqlError(err)?.extensions.productId, cart().products)
      const described = describeGqlError(err, POLICY, { productName: name })
      assert.match(described.key, /Named$/u)
      assert.deepEqual(described.params, { name: 'Gyoza' })
    })

    test(`${code} for a product that left the cart falls back to the generic sentence`, () => {
      const err = wire(code, { productId: 'ghost' })
      const name = blockingProductName(unwrapGqlError(err)?.extensions.productId, cart().products)
      const described = describeGqlError(err, POLICY, { productName: name })
      assert.doesNotMatch(described.key, /Named$/u)
      assert.equal(described.params, undefined)
    })
  }
})

describe('every backend error is a translated message, never raw text', () => {
  const LANGS = ['fr', 'en', 'nl', 'zh']
  const flatten = (node, prefix = '', out = {}) => {
    for (const [k, v] of Object.entries(node)) {
      const full = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === 'object') flatten(v, full, out)
      else out[full] = v
    }
    return out
  }
  const locales = Object.fromEntries(
    LANGS.map((lang) => [
      lang,
      flatten(
        JSON.parse(readFileSync(new URL(`../locales/${lang}.json`, import.meta.url), 'utf8')),
      ),
    ]),
  )
  const params = (text) =>
    [...text.matchAll(/\{(?<name>\w+)\}/gu)]
      .map((m) => m.groups.name)
      .toSorted((a, b) => a.localeCompare(b))
  // What a code can carry: every parameter the table may use.
  const extensions = { productName: 'Gyoza', productId: 'gyoza', minimum: '25' }

  for (const code of GQL_KNOWN_CODES) {
    test(`${code}: a message in fr/en/nl/zh that fills every placeholder and is not the backend text`, () => {
      const described = describeGqlError(wire(code, extensions, 'RAW-BACKEND-TEXT'), POLICY, {
        productName: 'Gyoza',
      })
      assert.ok(described, `${code} has no description`)
      for (const lang of LANGS) {
        const template = locales[lang][described.key]
        assert.equal(typeof template, 'string', `${lang}: missing ${described.key}`)
        assert.doesNotMatch(template, /RAW-BACKEND-TEXT/u)
        // Every placeholder the locale uses is given by the descriptor (else it would show as "{name}").
        for (const name of params(template))
          assert.ok(name in (described.params ?? {}), `${lang}: ${described.key} needs {${name}}`)
      }
    })
  }

  test('a key with a placeholder has the same placeholders in all four languages', () => {
    const keys = new Set(
      GQL_KNOWN_CODES.map((code) => describeErrorCode(code, POLICY, extensions)?.key).filter(
        Boolean,
      ),
    )
    for (const key of keys) {
      const expected = params(locales.en[key])
      for (const lang of LANGS)
        assert.deepEqual(params(locales[lang][key]), expected, `${lang}: ${key} placeholders`)
    }
  })

  test('a code the table does not know, or no code at all, shows the caller generic text, not the raw message', () => {
    assert.equal(describeGqlError(wire('SOMETHING_NEW', {}, 'RAW'), POLICY), null)
    assert.equal(describeGqlError(wire(null, {}, 'Totally unknown english text'), POLICY), null)
  })
})

describe('a deleted product in the cart (stale line)', () => {
  const quote = (lines, issues = []) => ({
    lines,
    subtotal: '0.00',
    deliveryFee: '0.00',
    pickupDiscount: '0.00',
    couponDiscount: '0.00',
    onlineFee: '0.00',
    total: '0.00',
    coupon: null,
    issues,
  })
  const line = (productId, issues = []) => ({
    productId,
    quantity: 1,
    selections: [],
    productPrice: issues.length ? null : '6.00',
    unitPrice: '6.00',
    lineTotal: '6.00',
    issues,
  })

  test('the line is flagged, blocks the order, and the only way out is to remove it', () => {
    const q = quote([
      line('bowl'),
      line('gyoza', [{ code: 'PRODUCT_NOT_FOUND', currentPrice: null }]),
    ])
    const keys = ['k-bowl', 'k-gyoza']
    assert.equal(isQuoteBlocking(q), true)
    const issues = lineIssuesByKey(q, keys)
    assert.deepEqual(Object.keys(issues), ['k-gyoza'])
    const [view] = describeLineIssues(issues['k-gyoza'], 600, 0)
    assert.equal(view.messageKey, 'cart.issues.notFound')
    assert.deepEqual(view.actions, ['remove'])
  })

  test('removing the flagged line clears the block (the next quote has no issue)', () => {
    assert.equal(isQuoteBlocking(quote([line('bowl')])), false)
  })

  test('a sold-out line is flagged the same way', () => {
    const view = describeLineIssue({ code: 'PRODUCT_UNAVAILABLE', currentPrice: null }, 600, 0)
    assert.equal(view.messageKey, 'cart.issues.unavailable')
    assert.deepEqual(view.actions, ['remove'])
  })
})

describe('price changed', () => {
  const q = (total) => ({
    lines: [],
    subtotal: total,
    deliveryFee: '0.00',
    pickupDiscount: '0.00',
    couponDiscount: '0.00',
    onlineFee: '0.00',
    total,
    coupon: null,
    issues: [],
  })

  test('the line offers to accept the new price (primary) or to be removed, with both amounts', () => {
    const view = describeLineIssue({ code: 'PRICE_CHANGED', currentPrice: '7.00' }, 600, 700)
    assert.equal(view.messageKey, 'cart.issues.priceChanged')
    assert.deepEqual(view.params, { fromCents: 600, toCents: 700 })
    assert.deepEqual(view.actions, ['accept-price', 'remove'])
  })

  test('the last check before ordering stops the order when the total moved, and lets it go when not', () => {
    assert.equal(recheckQuote(q('22.00'), 2200), 'ok')
    assert.equal(recheckQuote(q('23.00'), 2200), 'changed')
  })

  test('the createOrder PRICE_CHANGED error has a translated message', () => {
    assert.equal(describeGqlError(wire('PRICE_CHANGED'), POLICY).key, 'notify.errors.priceChanged')
  })

  test('the quote line is found by key to take the new price', () => {
    const quote = {
      ...q('7.00'),
      lines: [{ productId: 'gyoza', productPrice: '7.00', selections: [] }],
    }
    assert.equal(quoteLineByKey(quote, ['k1'], 'k1').productPrice, '7.00')
  })
})
