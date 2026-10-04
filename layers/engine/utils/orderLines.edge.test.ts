// Order-line helpers on the shapes older carts and orders really have: no selections key, a legacy single choice,
// A product without choices.
import { describe, expect, it } from 'vite-plus/test'
import { orderItemChoiceText } from './orderItemLabel'
import { orderItemPayload } from './orderPayload'
import { paidExtraQuantity } from './paidExtras'
import { lineIssuesByKey, quoteLineByKey } from './orderQuote'
import { priceCartLine, priceLine } from './pricing'
import { planReorder } from './reorder'
import { makeChoice, makeProduct } from '../../../test/fixtures/catalog'
import { makeQuote, makeQuoteLine } from '../../../test/fixtures/quote'

describe('orderItemChoiceText', () => {
  it('names the selections from the product choices, with line-wide quantities', () => {
    expect(
      orderItemChoiceText({
        selections: [
          { choiceId: 'a', quantity: 1 },
          { choiceId: 'b', quantity: 2 },
        ],
        product: {
          choices: [
            { id: 'a', name: 'Tonkotsu' },
            { id: 'b', name: 'Corn' },
          ],
        },
      }),
    ).toBe('Tonkotsu, Corn x2')
  })

  it('selections whose product is gone fall back to the legacy single choice, or nothing', () => {
    const selections = [{ choiceId: 'a', quantity: 1 }]
    expect(orderItemChoiceText({ selections, choice: { name: ' Old broth ' } })).toBe('Old broth')
    expect(orderItemChoiceText({ selections, product: { choices: null } })).toBeUndefined()
    expect(orderItemChoiceText({ selections, product: {} })).toBeUndefined()
  })

  it('an order from before selections existed shows its single choice', () => {
    expect(orderItemChoiceText({ choice: { name: 'Spicy' } })).toBe('Spicy')
    expect(orderItemChoiceText({ selections: null, choice: null })).toBeUndefined()
  })
})

describe('orderItemPayload', () => {
  const product = { id: 'p1', price: '10.00' }

  it('sends the selections when there are some', () => {
    const selections = [{ groupId: 'g', choiceId: 'c', quantity: 2 }]
    expect(orderItemPayload({ product, quantity: 2, selectedChoices: selections })).toMatchObject({
      productId: 'p1',
      quantity: 2,
      selections,
    })
  })

  it('a line without a selections key sends the legacy single choice id', () => {
    const payload = orderItemPayload({
      product,
      quantity: 1,
      selectedChoice: { id: 'legacy', priceModifier: '1.00' },
    })
    expect(payload).toMatchObject({ choiceId: 'legacy' })
    expect(payload).not.toHaveProperty('selections')
  })

  it('a plain line sends neither', () => {
    const payload = orderItemPayload({ product, quantity: 1, selectedChoices: null })
    expect(payload).not.toHaveProperty('selections')
    expect(payload).not.toHaveProperty('choiceId')
  })
})

describe('paidExtraQuantity', () => {
  it('counts plain lines of the extra, with or without a selections key, not menu items that carry a choice', () => {
    const lines = [
      { product: { code: 'X1' }, quantity: 2 },
      { product: { code: 'X1' }, quantity: 1, selectedChoices: [] },
      { product: { code: 'X1' }, quantity: 4, selectedChoice: { id: 'c' }, selectedChoices: [{}] },
      { product: { code: 'X1' }, quantity: 8, selectedChoice: { id: 'c' } },
      { product: { code: 'Y1' }, quantity: 16 },
    ]
    // The 3rd line has a choice AND selections (a menu item); the 4th has a legacy choice without selections key: counted.
    expect(paidExtraQuantity(lines, 'X1')).toBe(2 + 1 + 8)
  })
})

describe('quote lines by key', () => {
  it('matches a line by the position of its key', () => {
    const quote = makeQuote({
      lines: [
        makeQuoteLine({ productId: 'a' }),
        makeQuoteLine({ productId: 'b', issues: [{ code: 'PRICE_CHANGED', currentPrice: null }] }),
      ],
    })
    expect(quoteLineByKey(quote, ['k1', 'k2'], 'k2')?.productId).toBe('b')
    expect(lineIssuesByKey(quote, ['k1', 'k2'])).toEqual({
      k2: [{ code: 'PRICE_CHANGED', currentPrice: null }],
    })
  })

  it('a key that is unknown, or whose line the server did not return, is null', () => {
    const quote = makeQuote({ lines: [makeQuoteLine()] })
    expect(quoteLineByKey(quote, ['k1', 'k2'], 'missing')).toBeNull()
    expect(quoteLineByKey(quote, ['k1', 'k2'], 'k2')).toBeNull()
  })

  it('issues without a key for their position are not reported', () => {
    const quote = makeQuote({
      lines: [makeQuoteLine({ issues: [{ code: 'X', currentPrice: null }] })],
    })
    expect(lineIssuesByKey(quote, [])).toEqual({})
  })
})

describe('pricing', () => {
  it('a zero quantity has the base price as unit price and no total', () => {
    expect(priceLine('10.00', 0, [])).toEqual({ lineTotalCents: 0, unitPriceCents: 1000 })
  })

  it('selections of a product that lost its choices list, or of a choice that is gone, cost nothing', () => {
    const selectedChoices = [{ groupId: 'g', choiceId: 'gone', quantity: 2 }]
    const noChoices = { price: '10.00' }
    expect(priceCartLine({ quantity: 1, product: noChoices, selectedChoices }).lineTotalCents).toBe(
      1000,
    )
    expect(
      priceCartLine({ quantity: 1, product: { price: '10.00', choices: null }, selectedChoices })
        .lineTotalCents,
    ).toBe(1000)
    expect(
      priceCartLine({
        quantity: 1,
        product: { price: '10.00', choices: [{ id: 'other', priceModifier: '5.00' }] },
        selectedChoices,
      }).lineTotalCents,
    ).toBe(1000)
  })

  it('a legacy single choice applies to every unit, a negative modifier never discounts', () => {
    expect(
      priceCartLine({
        quantity: 3,
        product: { price: '10.00' },
        selectedChoice: { priceModifier: '1.50' },
      }).lineTotalCents,
    ).toBe(3450)
    expect(
      priceCartLine({
        quantity: 3,
        product: { price: '10.00' },
        selectedChoice: { priceModifier: '-1.50' },
      }).lineTotalCents,
    ).toBe(3000)
  })
})

describe('planReorder with older orders', () => {
  it('a product that no longer lists choices cannot honour the choice of the old order', () => {
    const product = makeProduct({ choices: undefined as never })
    const plan = planReorder([
      { quantity: 1, product, choice: makeChoice({ id: 'c1' }), selections: [] },
    ])
    expect(plan.lines).toEqual([])
    expect(plan.skipped).toEqual([{ name: product.name, quantity: 1, reason: 'choices' }])
  })

  it('a legacy choice whose group is not recorded becomes a selection with an empty group', () => {
    const choice = makeChoice({ id: 'c1', choiceGroupId: undefined as never })
    const product = makeProduct({ choices: [choice] })
    const plan = planReorder([{ quantity: 2, product, choice, selections: [] }])
    expect(plan.lines[0]!.selections).toEqual([{ groupId: '', choiceId: 'c1', quantity: 2 }])
    expect(plan.lines[0]!.choice).toBe(choice)
  })

  it('a missing selections key means a plain line', () => {
    const product = makeProduct()
    const plan = planReorder([{ quantity: 1, product, choice: null }])
    expect(plan.lines).toHaveLength(1)
    expect(plan.lines[0]!.selections).toEqual([])
  })
})
