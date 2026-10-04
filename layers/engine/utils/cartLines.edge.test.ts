import { describe, expect, it } from 'vite-plus/test'
import { canChangeLineQuantity, cartLineKey } from './cartLines'

describe('canChangeLineQuantity without selections', () => {
  it.each([undefined, null, []])('a line with %j can always change quantity', (selections) => {
    expect(canChangeLineQuantity(selections, 3)).toBe(true)
  })

  it('a uniform composition can, a non-uniform one cannot', () => {
    const selection = (quantity: number) => ({ groupId: 'g', choiceId: 'c', quantity })
    expect(canChangeLineQuantity([selection(4)], 2)).toBe(true)
    expect(canChangeLineQuantity([selection(3)], 2)).toBe(false)
  })
})

describe('cartLineKey', () => {
  const product = { id: 'p1' }

  it('is the product id and the per-unit composition, whatever the quantity', () => {
    const selection = (quantity: number) => ({ groupId: 'g', choiceId: 'c', quantity })
    const one = cartLineKey({ product, quantity: 1, selectedChoices: [selection(1)] })
    const three = cartLineKey({ product, quantity: 3, selectedChoices: [selection(3)] })
    expect(one).toBe(three)
    expect(one.startsWith('p1-')).toBe(true)
  })

  it('falls back to the single selected choice id when there are no selections', () => {
    expect(cartLineKey({ product, quantity: 1, selectedChoice: { id: 'choice-9' } })).toBe(
      'p1-choice-9',
    )
    expect(
      cartLineKey({ product, quantity: 1, selectedChoices: [], selectedChoice: { id: 'x' } }),
    ).toBe('p1-x')
  })

  it('is "none" for a plain product', () => {
    expect(cartLineKey({ product, quantity: 2 })).toBe('p1-none')
    expect(cartLineKey({ product, quantity: 2, selectedChoices: null, selectedChoice: null })).toBe(
      'p1-none',
    )
  })
})
