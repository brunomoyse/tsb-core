import { describe, expect, it } from 'vite-plus/test'
import { telHref } from './phone'

describe('telHref', () => {
  it('strips every kind of whitespace from an international number', () => {
    expect(telHref('+32 4 222 98 88')).toBe('tel:+3242229888')
    expect(telHref('+32\u00a04\t222\n98 88')).toBe('tel:+3242229888')
  })

  it('leaves a number without spaces as it is', () => {
    expect(telHref('+3242229888')).toBe('tel:+3242229888')
  })
})
