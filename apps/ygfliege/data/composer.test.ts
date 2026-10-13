import type { Product } from '#engine/types'
import { COMPOSER_CATEGORY_SLUG, composerHero, isBowlComposer } from './composer'
import { describe, expect, it } from 'vite-plus/test'

const inCategory = (slug: string) => ({ category: { slug } }) as Product

describe('isBowlComposer', () => {
  it('is true for the products of the composer category only', () => {
    expect(isBowlComposer(inCategory(COMPOSER_CATEGORY_SLUG))).toBe(true)
    expect(isBowlComposer(inCategory('malatang'))).toBe(false)
  })
})

describe('composerHero', () => {
  it('gives the dry Mala Mix composer its own photo and a subtitle without broth', () => {
    expect(composerHero('mala-mix-personnalise')).toEqual({
      photo: '/images/bowls/mala-dry-mix-top',
      subtitleKey: 'composer.heroSubtitleDry',
    })
  })

  it('falls back to the broth bowl and subtitle for any other composer', () => {
    expect(composerHero('malatang-personnalise')).toEqual({
      photo: '/images/bowls/beef-bone-top',
      subtitleKey: 'composer.heroSubtitle',
    })
  })
})
