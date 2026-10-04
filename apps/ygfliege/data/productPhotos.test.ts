import { describe, expect, it } from 'vite-plus/test'
import {
  PRODUCT_PHOTOS,
  PRODUCT_PHOTO_WIDTHS,
  productPhoto,
  productPhotoUrls,
} from './productPhotos'

describe('ygfliege productPhoto', () => {
  it('finds the photo of a mapped product by slug', () => {
    expect(productPhoto('malatang-decouverte')).toEqual({ base: '/images/bowls/tomato-top' })
  })

  it('an unmapped, empty or missing slug has none (the S3 upload or placeholder applies)', () => {
    expect(productPhoto('coca-cola')).toBeUndefined()
    expect(productPhoto('')).toBeUndefined()
    expect(productPhoto(null)).toBeUndefined()
    expect(productPhoto(undefined)).toBeUndefined()
  })

  it('does not resolve inherited object keys as products', () => {
    expect(productPhoto('constructor')).toBeUndefined()
  })

  it('every mapped photo points at an asset base under /images', () => {
    for (const photo of Object.values(PRODUCT_PHOTOS)) expect(photo.base).toMatch(/^\/images\//u)
  })
})

describe('productPhotoUrls', () => {
  it('gives the png fallback (560 by default) and the largest webp', () => {
    expect(productPhotoUrls('malatang-gourmand')).toEqual({
      png: '/images/bowls/beef-bone-top-560.png',
      webp: `/images/bowls/beef-bone-top-${Math.max(...PRODUCT_PHOTO_WIDTHS)}.webp`,
    })
  })

  it('honours a photo with its own widths and fallback width', () => {
    const original = PRODUCT_PHOTOS['malatang-decouverte']!
    PRODUCT_PHOTOS['malatang-decouverte'] = {
      ...original,
      widths: [200, 1200, 600],
      fallbackWidth: 320,
    }
    try {
      expect(productPhotoUrls('malatang-decouverte')).toEqual({
        png: '/images/bowls/tomato-top-320.png',
        webp: '/images/bowls/tomato-top-1200.webp',
      })
    } finally {
      PRODUCT_PHOTOS['malatang-decouverte'] = original
    }
  })

  it('is undefined for a product without a photo', () => {
    expect(productPhotoUrls('nothing')).toBeUndefined()
    expect(productPhotoUrls(null)).toBeUndefined()
  })
})
