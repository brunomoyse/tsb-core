// UseBrandPhone: tel: link and national display form from the brand's international number (tokyosushi in this app).
import { describe, expect, it } from 'vite-plus/test'
import { useAppConfig } from '#imports'
import { useBrandPhone } from '#engine/composables/useBrandPhone'

describe('useBrandPhone', () => {
  it('builds the digits-only tel: href and the national label with no-break spaces', () => {
    expect(useAppConfig().brand.phone).toBe('+32 4 222 98 88')
    const { phoneHref, phoneLabel } = useBrandPhone()
    expect(phoneHref).toBe('tel:+3242229888')
    expect(phoneLabel).toBe('04\u00a0222\u00a098\u00a088')
    expect(phoneLabel).not.toContain(' ')
  })

  it('handles a number written without a space after the country code', () => {
    const config = useAppConfig().brand as { phone: string }
    const original = config.phone
    config.phone = '+3242229888'
    try {
      expect(useBrandPhone().phoneLabel).toBe('042229888')
      expect(useBrandPhone().phoneHref).toBe('tel:+3242229888')
    } finally {
      config.phone = original
    }
  })
})
