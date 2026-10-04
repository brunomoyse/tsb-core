// The phone-prefix country list: data the checkout phone input depends on, so its invariants are checked against
// libphonenumber rather than re-typed.
import { getCountryCallingCode } from 'libphonenumber-js'
import { describe, expect, it } from 'vite-plus/test'
import { EUROPEAN_COUNTRIES, getCountryName } from './europeanCountries'

const regionalIndicators = (flag: string): string =>
  Array.from(flag)
    .map((char) => String.fromCharCode(char.codePointAt(0)! - 0x1f1e6 + 65))
    .join('')

describe('EUROPEAN_COUNTRIES', () => {
  it('starts with the delivery area and its neighbours', () => {
    expect(EUROPEAN_COUNTRIES.slice(0, 5).map((c) => c.code)).toEqual([
      'BE',
      'FR',
      'NL',
      'LU',
      'DE',
    ])
  })

  it('has unique country codes', () => {
    const codes = EUROPEAN_COUNTRIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('the rest is alphabetical by ISO code', () => {
    const rest = EUROPEAN_COUNTRIES.slice(5).map((c) => c.code)
    expect(rest).toEqual([...rest].sort())
  })

  it('every prefix is the calling code libphonenumber knows for the country', () => {
    for (const { code, prefix } of EUROPEAN_COUNTRIES) {
      expect(prefix, code).toBe(`+${getCountryCallingCode(code)}`)
    }
  })

  it('Italy is listed before Vatican City, which shares its +39: a stored +39 number resolves to Italy', () => {
    const codes = EUROPEAN_COUNTRIES.map((c) => c.code)
    expect(EUROPEAN_COUNTRIES.find((c) => c.code === 'VA')?.prefix).toBe('+39')
    expect(codes.indexOf('IT')).toBeLessThan(codes.indexOf('VA'))
  })

  it('every flag is the emoji of its own country code', () => {
    for (const { code, flag } of EUROPEAN_COUNTRIES) {
      expect(regionalIndicators(flag), code).toBe(code)
    }
  })
})

describe('getCountryName', () => {
  it('names the country in the language of the page', () => {
    expect(getCountryName('BE', 'fr')).toBe('Belgique')
    expect(getCountryName('DE', 'en')).toBe('Germany')
    expect(getCountryName('NL', 'nl')).toBe('Nederland')
  })

  it('falls back to the country code when the locale is not a valid language tag', () => {
    expect(getCountryName('BE', '')).toBe('BE')
  })
})
