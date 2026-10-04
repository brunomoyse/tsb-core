import { describe, expect, it } from 'vite-plus/test'
import type { ProductCategory } from '#engine/types'
import { baseCategories } from './menuCatalog'
import { makeProduct } from '../../../test/fixtures/catalog'

const category = (
  overrides: Partial<ProductCategory> & { products: ProductCategory['products'] },
) => ({ id: 'cat-1', name: 'Sushi', slug: 'sushi', order: 1, ...overrides })

describe('baseCategories', () => {
  it('stamps the parent category on products that come without one, keeps one they already have', () => {
    const own = { id: 'other', name: 'Other', slug: 'other' } as ProductCategory
    const [result] = baseCategories(
      [
        category({
          products: [
            makeProduct({ id: 'a', category: undefined as unknown as ProductCategory }),
            makeProduct({ id: 'b', category: own }),
          ],
        }),
      ],
      {},
    )
    expect(result!.products[0]!.category).toEqual({ id: 'cat-1', name: 'Sushi', slug: 'sushi' })
    expect(result!.products[1]!.category).toBe(own)
  })

  it('merges live updates, drops hidden products and empty categories, and sorts by category order', () => {
    const result = baseCategories(
      [
        category({ id: 'late', name: 'Desserts', order: 9, products: [makeProduct({ id: 'd' })] }),
        category({ id: 'empty', order: 2, products: [makeProduct({ id: 'x', isVisible: false })] }),
        category({
          id: 'early',
          order: 1,
          products: [
            makeProduct({ id: 'a', name: 'Old' }),
            makeProduct({ id: 'b', isVisible: true }),
          ],
        }),
      ],
      { a: { name: 'New', isVisible: true }, b: { isVisible: false } },
    )
    expect(result.map((c) => c.id)).toEqual(['early', 'late'])
    expect(result[0]!.products.map((p) => [p.id, p.name])).toEqual([['a', 'New']])
  })
})
