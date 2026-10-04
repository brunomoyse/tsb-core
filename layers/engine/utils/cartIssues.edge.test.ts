import { describe, expect, it } from 'vite-plus/test'
import { describeLineIssues } from './cartIssues'

describe('describeLineIssues ordering', () => {
  it('puts a code the table does not know after every known one, keeping the order of the unknown ones', () => {
    const views = describeLineIssues(
      [
        { code: 'BRAND_NEW_B', currentPrice: null },
        { code: 'PRICE_CHANGED', currentPrice: null },
        { code: 'BRAND_NEW_A', currentPrice: null },
        { code: 'PRODUCT_NOT_FOUND', currentPrice: null },
      ],
      1000,
      1200,
    )
    expect(views.map((view) => view.code)).toEqual([
      'PRODUCT_NOT_FOUND',
      'PRICE_CHANGED',
      'BRAND_NEW_B',
      'BRAND_NEW_A',
    ])
    // An unknown code can only be removed.
    expect(views[2]).toMatchObject({ messageKey: 'cart.issues.generic', actions: ['remove'] })
    expect(views[1]!.params).toEqual({ fromCents: 1000, toCents: 1200 })
  })
})
