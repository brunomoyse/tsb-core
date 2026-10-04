// useBrandPhone in the real app of ygfliege: the number of the Liège restaurant, in the national form.
import { describe, expect, it } from 'vite-plus/test'
import { useAppConfig } from '#imports'
import { useBrandPhone } from '#engine/composables/useBrandPhone'

describe('useBrandPhone in the ygfliege app', () => {
  it("builds the tel: href and the national label from this brand's number", () => {
    expect(useAppConfig().brand.phone).toBe('+32 4 286 68 20')
    const { phoneHref, phoneLabel } = useBrandPhone()
    expect(phoneHref).toBe('tel:+3242866820')
    expect(phoneLabel).toBe('04 286 68 20')
  })
})
