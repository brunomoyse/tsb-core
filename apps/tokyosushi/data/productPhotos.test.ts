import { describe, expect, it } from 'vite-plus/test'
import { PRODUCT_PHOTO_WIDTHS, productPhoto } from './productPhotos'

describe('tokyosushi productPhoto', () => {
  it('has no brand-side override: every image comes from the dashboard upload', () => {
    expect(productPhoto('nigiri-saumon')).toBeUndefined()
    expect(productPhoto(null)).toBeUndefined()
    expect(productPhoto()).toBeUndefined()
  })

  it('exposes the default asset widths', () => {
    expect(PRODUCT_PHOTO_WIDTHS).toEqual([320, 560, 800])
  })
})
