import { describe, expect, it } from 'vite-plus/test'
import { productPhoto } from './productPhotos'

describe('tokyosushi productPhoto', () => {
  it('has no brand-side override: every image comes from the dashboard upload', () => {
    expect(productPhoto('nigiri-saumon')).toBeUndefined()
    expect(productPhoto(null)).toBeUndefined()
    expect(productPhoto()).toBeUndefined()
  })
})
