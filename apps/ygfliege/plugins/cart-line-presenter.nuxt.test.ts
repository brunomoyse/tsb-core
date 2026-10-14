// The cart-line presenter plugin: it hands the engine a presenter that renders composed bowls with the app's i18n.
import { describe, expect, it, vi } from 'vite-plus/test'
import { makeCartItem, makeChoice, makeProduct } from '../../../test/fixtures/catalog'
import plugin from './cart-line-presenter'

describe('cart-line-presenter plugin', () => {
  it('provides a presenter that says "n ingrédients" through the app i18n', () => {
    const provide = vi.fn()
    const t = vi.fn((key: string, named: { count: number }) => `${named.count} ${key}`)
    ;(plugin as unknown as (app: unknown) => void)({ $i18n: { t }, provide })

    expect(provide).toHaveBeenCalledWith('cartLinePresenter', expect.any(Function))
    const present = provide.mock.calls[0]![1] as (item: unknown) => { summary: string } | null
    const tofu = makeChoice({ id: 'tofu', choiceGroupId: 'ing', name: 'Tofu frais' })
    const bowl = makeProduct({
      id: 'bowl',
      category: { id: 'c', name: 'Sur mesure', order: 1, slug: 'sur-mesure', products: [] },
      choices: [tofu],
    })
    const line = makeCartItem({
      product: bowl,
      selections: [{ groupId: 'ing', choiceId: 'tofu', quantity: 3 }],
    })
    expect(present(line)?.summary).toBe('3 composer.ingredientsSummary')
    expect(t).toHaveBeenCalledWith('composer.ingredientsSummary', { count: 3 }, 3)
    expect(present(makeCartItem())).toBeNull()
  })
})
