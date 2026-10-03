/*
 * Randomised parity between the engine's cart total (`computeCartTotals`, integer cents) and the
 * backend's CreateOrder, re-implemented here from scratch with exact decimal arithmetic.
 * Run: `vp test run layers/engine/utils/cartTotals.parity.test.mjs`.
 *
 * The reference below is a line-by-line transcription of the Go code (tsb-service, branch
 * audit/phase-2), deliberately NOT sharing any code with the engine:
 *
 *   internal/modules/order/domain/pricing.go          PriceLine          line total (L40-L56)
 *   internal/api/graphql/resolver/order.go            CreateOrder
 *       L300  delivery minimum: subtotal < 25 → rejected (before the fee is added)
 *       L305-L321 delivery: distance >= 9000 or excluded postcode → rejected; fee tier; total += fee
 *       L344-L356 pickup && total >= 20: Σ(discountable line total × 0.10) → RoundToNearest10Cents
 *       L382-L388 totalDiscount > total → both scaled by total/totalDiscount, snapped to 0,10 €
 *   internal/modules/order/domain/pricing.go          OrderTotal (what repository.go Save stores)
 *       total_price = RoundToNearest10Cents(max(Σ lines + fee − discounts, 0) + transaction fee (0.30 online))
 *       The max(…, 0) clamp is audit PR 2.2: before it a coupon covering a basket that is not a
 *       multiple of 10 cents stored −0,05 / −0,10 €.
 *   pkg/money/rounding.go                              RoundToNearest10Cents
 *   internal/modules/order/domain/order.go L42         TransactionFee = 0.30
 *   internal/api/graphql/resolver/mappers.go L418      deliveryFeeFromDistance
 *   internal/modules/coupon/domain/coupon.go L148      CalculateDiscount (the coupon amount the
 *                                                      server grants; the engine takes it as an input)
 *
 * The backend's proportional discount scaling (order.go L382-L388) is implemented in the reference
 * but NOT in the engine: `computePayableCents` simply clamps at 0. The test shows the two agree on
 * every cart (the scaled discounts add up to the basket within 5 cents, and the 0,10 € snap of the
 * total absorbs the difference), which is why the engine does not need the extra maths.
 *
 * The "decimal" type mimics shopspring/decimal: arbitrary-precision coefficient + exponent,
 * Div rounds half away from zero at 16 digits (DivisionPrecision), Round(0) half away from zero.
 */

import assert from 'node:assert/strict'
import { computeCartTotals } from './cartTotals.ts'
import { test } from 'vite-plus/test'

// ---------------------------------------------------------------------------------------------
// Minimal shopspring/decimal
// ---------------------------------------------------------------------------------------------
const pow10 = (n) => 10n ** BigInt(n)
const dec = (coef, exp = 0) => ({ coef: BigInt(coef), exp })
const fromString = (str) => {
  const m = /^(?<sign>-?)(?<whole>\d+)(?:\.(?<frac>\d+))?$/u.exec(str)
  const frac = m.groups.frac ?? ''
  return dec(BigInt(`${m.groups.sign}${m.groups.whole}${frac}`), -frac.length)
}
const align = (a, b) => {
  const exp = Math.min(a.exp, b.exp)
  return [a.coef * pow10(a.exp - exp), b.coef * pow10(b.exp - exp), exp]
}
const add = (a, b) => {
  const [x, y, exp] = align(a, b)
  return dec(x + y, exp)
}
const sub = (a, b) => {
  const [x, y, exp] = align(a, b)
  return dec(x - y, exp)
}
const mul = (a, b) => dec(a.coef * b.coef, a.exp + b.exp)
const cmp = (a, b) => {
  const [x, y] = align(a, b)
  return x < y ? -1 : x > y ? 1 : 0
}
const roundHalfAwayDiv = (num, den) => {
  const negative = num < 0n !== den < 0n
  const n = num < 0n ? -num : num
  const d = den < 0n ? -den : den
  const q = (2n * n + d) / (2n * d)
  return negative ? -q : q
}
// Go decimal.Round(places): half away from zero
const round = (a, places) => {
  const shift = -places - a.exp
  if (shift <= 0) return a
  return dec(roundHalfAwayDiv(a.coef, pow10(shift)), -places)
}
// Go decimal.Div: DivRound to DivisionPrecision = 16 digits
const div16 = (a, b) => {
  const shift = a.exp - b.exp + 16
  const num = shift >= 0 ? a.coef * pow10(shift) : a.coef
  const den = shift >= 0 ? b.coef : b.coef * pow10(-shift)
  return dec(roundHalfAwayDiv(num, den), -16)
}
// Go: d.Mul(100).Round(0).IntPart()
const centsOf = (a) => {
  const c = round(mul(a, dec(100)), 0)
  return Number(c.exp >= 0 ? c.coef * pow10(c.exp) : c.coef / pow10(-c.exp))
}

// Go: pkg/money.RoundToNearest10Cents
const roundToNearest10Cents = (d) => {
  let cents = centsOf(d)
  const negative = cents < 0
  if (negative) cents = -cents
  const last = cents % 10
  if (last === 0) {
    /* Already .x0 */
  } else if (last <= 4) cents -= last
  else cents += 10 - last
  return dec(negative ? -cents : cents, -2)
}

// ---------------------------------------------------------------------------------------------
// The backend, as reading CreateOrder + Save
// ---------------------------------------------------------------------------------------------
const EXCLUDED_POSTCODES = new Set(['4610'])
const TRANSACTION_FEE = fromString('0.30')

const deliveryFeeFromDistance = (distance) => {
  const tiers = [3000, 4000, 5000, 6000, 7000, 8000, 9000]
  const idx = tiers.findIndex((t) => distance < t)
  return dec(idx === -1 ? 10 : idx)
}

// Go: domain.PriceLine
const priceLine = (base, qty, selections) => {
  let lineTotal = mul(base, dec(qty))
  for (const s of selections) {
    const modifier = s.modifier.coef < 0n ? dec(0) : s.modifier
    lineTotal = add(lineTotal, mul(modifier, dec(s.quantity)))
  }
  return lineTotal
}

/** Returns { error } when CreateOrder rejects the order, else { totalPrice (Decimal), parts }. */
function backendCreateOrder(cart) {
  let total = dec(0)
  const lines = []
  for (const line of cart.lines) {
    const selections = line.selections.map((s) => ({
      modifier: fromString(s.modifier),
      quantity: s.quantity,
    }))
    const lineTotal = priceLine(fromString(line.price), line.qty, selections)
    total = add(total, lineTotal)
    lines.push({ lineTotal, isDiscountable: line.isDiscountable })
  }

  let fee = dec(0)
  if (cart.type === 'DELIVERY') {
    if (cmp(total, dec(25)) < 0) return { error: 'minimum' }
    if (cart.distance >= 9000) return { error: 'too far' }
    if (EXCLUDED_POSTCODES.has(cart.postcode.trim())) return { error: 'excluded' }
    fee = deliveryFeeFromDistance(cart.distance)
    total = add(total, fee)
  }

  let takeawayDiscount = dec(0)
  if (cart.type === 'PICKUP' && cmp(total, dec(20)) >= 0) {
    for (const item of lines) {
      if (item.isDiscountable)
        takeawayDiscount = add(takeawayDiscount, mul(item.lineTotal, fromString('0.10')))
    }
    takeawayDiscount = roundToNearest10Cents(takeawayDiscount)
  }

  let couponDiscount = dec(0)
  if (cart.couponGranted)
    couponDiscount = roundToNearest10Cents(couponGrantedDecimal(cart.couponGranted, total))

  const totalDiscount = add(takeawayDiscount, couponDiscount)
  if (cmp(totalDiscount, total) > 0) {
    const ratio = div16(total, totalDiscount)
    takeawayDiscount = roundToNearest10Cents(mul(takeawayDiscount, ratio))
    couponDiscount = roundToNearest10Cents(sub(total, takeawayDiscount))
  }

  // The domain.OrderTotal function (pricing.go), which the repository's Save stores as total_price
  let goods = dec(0)
  for (const item of lines) goods = add(goods, item.lineTotal)
  goods = add(goods, fee)
  goods = sub(goods, add(takeawayDiscount, couponDiscount))
  // Would the total have gone negative before the clamp? (the bug the clamp fixes)
  const wasNegative = goods.coef < 0n
  if (wasNegative) goods = dec(0)
  if (cart.online) goods = add(goods, TRANSACTION_FEE)
  return {
    totalPrice: roundToNearest10Cents(goods),
    takeawayDiscount,
    couponDiscount,
    fee,
    wasNegative,
  }
}

// Go: Coupon.CalculateDiscount(orderAmount = total incl. delivery fee, as passed by CreateOrder)
function couponGrantedDecimal(coupon, orderAmount) {
  if (coupon.kind === 'percentage') {
    const discount = round(div16(mul(orderAmount, fromString(coupon.value)), dec(100)), 2)
    return cmp(discount, orderAmount) > 0 ? orderAmount : discount
  }
  const value = fromString(coupon.value)
  return cmp(value, orderAmount) > 0 ? orderAmount : value
}

// ---------------------------------------------------------------------------------------------
// Seeded random carts
// ---------------------------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const eur = (cents) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

function randomCart(rand) {
  const int = (min, max) => min + Math.floor(rand() * (max - min + 1))
  const pick = (items) => items[int(0, items.length - 1)]

  const lines = Array.from({ length: int(1, 8) }, () => {
    // Mostly the shop's real price shapes (.x0 / .x5 / .x9) and some arbitrary cents.
    const shape = int(1, 6)
    const priceCents =
      shape <= 3 ? int(1, 400) * 10 : shape <= 5 ? int(1, 400) * 10 + 5 : int(50, 4500)
    const qty = int(1, 10) <= 7 ? int(1, 4) : int(1, 99)
    const choiceCount = pick([0, 0, 1, 2, 3])
    const choices = Array.from({ length: choiceCount }, (_, i) => ({
      id: `c${i}`,
      modifier: `${int(1, 12) === 1 ? '-' : ''}${eur(pick([0, 50, 100, 150, 200, 25, 35]))}`,
    }))
    return {
      price: eur(priceCents),
      qty,
      isDiscountable: rand() < 0.7,
      choices,
      selections: choices.map((c) => ({
        choiceId: c.id,
        modifier: c.modifier,
        quantity: int(1, qty * 3),
      })),
    }
  })

  const type = rand() < 0.5 ? 'PICKUP' : 'DELIVERY'
  const cart = {
    lines,
    type,
    online: rand() < 0.6,
    distance: pick([0, 1500, 2999, 3000, 3500, 4999, 6000, 7999, 8500, 8999, 9000, 9500]),
    postcode: rand() < 0.08 ? '4610' : pick(['4000', '4020', '4030', '4100']),
    couponGranted: null,
  }
  const r = rand()
  if (r < 0.25)
    cart.couponGranted = {
      kind: 'percentage',
      value: pick(['5', '10', '15', '20', '25', '33.33', '100']),
    }
  else if (r < 0.4)
    cart.couponGranted = {
      kind: 'fixed',
      value: eur(pick([100, 250, 500, 1000, 1500, 2000, 5000, 20000, 12345])),
    }
  return cart
}

/*
 * What validateCoupon would answer for this cart, in cents: the server computes it on the order
 * amount it sees (goods + delivery fee, see CreateOrder); the engine only receives the result.
 */
function grantedCouponCents(cart, backend) {
  if (!cart.couponGranted) return 0
  // Recompute against `total` (goods + fee) exactly like the resolver: undo the later maths via the lines.
  let total = dec(0)
  for (const line of cart.lines) {
    total = add(
      total,
      priceLine(
        fromString(line.price),
        line.qty,
        line.selections.map((s) => ({ modifier: fromString(s.modifier), quantity: s.quantity })),
      ),
    )
  }
  total = add(total, backend.fee)
  return centsOf(couponGrantedDecimal(cart.couponGranted, total))
}

const engineInput = (cart, couponDiscountCents) => ({
  lines: cart.lines.map((line) => ({
    quantity: line.qty,
    product: {
      price: line.price,
      isDiscountable: line.isDiscountable,
      choices: line.choices.map((c) => ({ id: c.id, priceModifier: c.modifier })),
    },
    selectedChoices: line.selections.map((s) => ({ choiceId: s.choiceId, quantity: s.quantity })),
  })),
  collectionOption: cart.type,
  address: cart.type === 'DELIVERY' ? { distance: cart.distance, postcode: cart.postcode } : null,
  paymentOption: cart.online ? 'ONLINE' : 'CASH',
  couponDiscountCents,
})

test('10,000 random carts: the engine total equals the backend total_price', () => {
  const rand = mulberry32(0x7a5b9)
  let compared = 0
  let rejected = 0
  let clamped = 0
  let scaled = 0
  let withCoupon = 0
  let pickupDiscounts = 0

  for (let n = 0; n < 10000; n++) {
    const cart = randomCart(rand)
    // Fees the coupon amount depends on need the delivery fee: run the backend once without coupon.
    const probe = backendCreateOrder({ ...cart, couponGranted: null })
    if (probe.error) {
      // The backend rejects it (below the delivery minimum / outside the zone / excluded postcode).
      const engine = computeCartTotals(engineInput(cart, 0))
      const deliveryBlocked =
        cart.type === 'DELIVERY' && (cart.distance >= 9000 || EXCLUDED_POSTCODES.has(cart.postcode))
      assert.ok(
        probe.error === 'minimum'
          ? !engine.isMinimumReached
          : deliveryBlocked && engine.deliveryFeeCents === -1,
        `cart ${n}: backend rejects (${probe.error}) but the engine does not flag it`,
      )
      rejected++
      continue
    }

    const backend = backendCreateOrder(cart)
    const coupon = grantedCouponCents(cart, backend)
    const engine = computeCartTotals(engineInput(cart, coupon))

    // Exact parity, including the carts where a coupon snapped up to 0,10 € overshoots the basket:
    // The backend now clamps the goods part at 0 before adding the online fee, like the engine.
    const expectedCents = centsOf(backend.totalPrice)
    assert.ok(expectedCents >= 0, `cart ${n}: the backend total is never negative`)
    assert.strictEqual(engine.payableCents, expectedCents, `cart ${n}: ${JSON.stringify(cart)}`)
    if (backend.wasNegative) clamped++
    assert.strictEqual(
      engine.pickupDiscountCents,
      cart.type === 'PICKUP' ? centsOf(probeTakeaway(cart)) : 0,
      `cart ${n}: pickup discount`,
    )
    if (engine.pickupDiscountCents > 0) pickupDiscounts++
    if (cart.couponGranted) withCoupon++
    if (
      cart.couponGranted &&
      engine.pickupDiscountCents + engine.couponDiscountCents >
        engine.subtotalCents + Math.max(engine.deliveryFeeCents, 0)
    )
      scaled++
    compared++
  }

  // Make sure the generator really exercised the interesting branches.
  assert.ok(compared > 5000, `only ${compared} comparable carts`)
  assert.ok(rejected > 100, 'rejections not exercised')
  assert.ok(withCoupon > 1000, 'coupons not exercised')
  assert.ok(pickupDiscounts > 1000, 'pickup discounts not exercised')
  assert.ok(scaled > 20, `discount scaling not exercised (${scaled})`)
  assert.ok(clamped > 0, 'the negative-total clamp is not exercised')
  console.log(
    `parity: ${compared} compared, ${rejected} rejected, ${withCoupon} with coupon, ${scaled} scaled, ${clamped} carts clamped at 0`,
  )
})

// The pickup discount alone, as the backend computes it before any scaling (L344-L356).
function probeTakeaway(cart) {
  let total = dec(0)
  const lines = cart.lines.map((line) => {
    const lt = priceLine(
      fromString(line.price),
      line.qty,
      line.selections.map((s) => ({ modifier: fromString(s.modifier), quantity: s.quantity })),
    )
    total = add(total, lt)
    return { lt, isDiscountable: line.isDiscountable }
  })
  if (cmp(total, dec(20)) < 0) return dec(0)
  let discount = dec(0)
  for (const l of lines)
    if (l.isDiscountable) discount = add(discount, mul(l.lt, fromString('0.10')))
  return roundToNearest10Cents(discount)
}

test('audit M13 example: one 24.15 € item × 3 on pickup gets a 7.30 € discount (was 7.20 €)', () => {
  const input = {
    lines: [
      {
        quantity: 3,
        product: { price: '24.15', isDiscountable: true, choices: [] },
        selectedChoices: [],
      },
    ],
    collectionOption: 'PICKUP',
    paymentOption: 'CASH',
  }
  const cash = computeCartTotals(input)
  assert.strictEqual(cash.subtotalCents, 7245)
  assert.strictEqual(cash.pickupDiscountCents, 730)
  // 72.45 − 7.30 = 65.15 → 65.20 (the .x5 tie goes up, in favour of the restaurant)
  assert.strictEqual(cash.payableCents, 6520)
  // Online: 65.15 + 0.30 = 65.45 → 65.50
  assert.strictEqual(computeCartTotals({ ...input, paymentOption: 'ONLINE' }).payableCents, 6550)

  // Same cart through the backend reference.
  const cart = {
    lines: [{ price: '24.15', qty: 3, isDiscountable: true, choices: [], selections: [] }],
    type: 'PICKUP',
    online: false,
    distance: 0,
    postcode: '4000',
    couponGranted: null,
  }
  const backend = backendCreateOrder(cart)
  assert.strictEqual(centsOf(backend.takeawayDiscount), 730)
  assert.strictEqual(centsOf(backend.totalPrice), 6520)
})

test('the float implementation this replaced disagreed on that cart (documents the bug)', () => {
  // The old maths: unitPrice × qty × 0.1 summed as floats, then rounded to 0,10 €: 7.245 → 7.2
  const floatDiscount = Math.round(Math.round(24.15 * 3 * 0.1 * 100) / 10) / 10
  assert.notStrictEqual(Math.round(floatDiscount * 100), 730)
})
