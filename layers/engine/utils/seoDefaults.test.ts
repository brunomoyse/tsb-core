import { OG_IMAGE_HEIGHT, OG_IMAGE_PATH, OG_IMAGE_WIDTH, inLanguageTag } from './seoDefaults'
import { describe, expect, it } from 'vite-plus/test'

describe('inLanguageTag', () => {
  it.each([
    ['fr', 'fr-BE'],
    ['en', 'en'],
    ['zh', 'zh-CN'],
    ['nl', 'nl-BE'],
    ['de', 'fr-BE'],
    ['', 'fr-BE'],
  ])('%j gives %s', (locale, tag) => {
    expect(inLanguageTag(locale)).toBe(tag)
  })
})

describe('share image', () => {
  it('is the 1.91:1 default image', () => {
    expect(OG_IMAGE_PATH).toBe('/images/og-default.jpg')
    expect(OG_IMAGE_WIDTH / OG_IMAGE_HEIGHT).toBeCloseTo(1.9, 1)
  })
})
