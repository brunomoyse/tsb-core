import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { formatAddress, timeToRFC3339, toCamelCase } from './utils'
import type { Address } from '#engine/types'

const address = (overrides: Partial<Address> = {}) =>
  ({
    id: 'a1',
    postcode: '4000',
    municipalityName: 'Liège',
    streetName: 'Rue de la Cathédrale',
    houseNumber: '59',
    ...overrides,
  }) as Address

describe('formatAddress', () => {
  it('is empty for no address', () => {
    expect(formatAddress(null)).toBe('')
  })

  it('writes street and number, then postcode and municipality on a second line', () => {
    expect(formatAddress(address())).toBe('Rue de la Cathédrale 59\n4000 – Liège')
  })

  it('adds the box number after a slash', () => {
    expect(formatAddress(address({ boxNumber: '3B' }))).toBe(
      'Rue de la Cathédrale 59 / 3B\n4000 – Liège',
    )
  })

  it('ignores an empty box number', () => {
    expect(formatAddress(address({ boxNumber: '' }))).toBe('Rue de la Cathédrale 59\n4000 – Liège')
  })
})

describe('toCamelCase', () => {
  it.each([
    ['order_status', 'orderStatus'],
    ['ORDER_READY_AT', 'orderReadyAt'],
    ['single', 'single'],
    ['', ''],
    ['Already_Mixed', 'alreadyMixed'],
  ])('%j becomes %j', (input, expected) => {
    expect(toCamelCase(input)).toBe(expected)
  })
})

describe('timeToRFC3339', () => {
  const originalTz = process.env.TZ
  afterEach(() => {
    vi.useRealTimers()
    if (originalTz === undefined) delete process.env.TZ
    else process.env.TZ = originalTz
  })

  it.each([
    ['Europe/Brussels', '2026-10-04T18:45:00+02:00', '18:45'],
    ['Europe/Brussels', '2026-01-04T18:45:00+01:00', '18:45'],
    ['Asia/Kolkata', '2026-10-04T09:05:00+05:30', '09:05'],
    ['America/St_Johns', '2026-01-04T09:05:00-03:30', '09:05'],
    ['UTC', '2026-10-04T00:00:00+00:00', '00:00'],
  ])('%s: %s for "%s"', (tz, expected, time) => {
    process.env.TZ = tz
    vi.useFakeTimers()
    // Any instant of that local day: the date part comes from "today".
    vi.setSystemTime(new Date(`${expected.slice(0, 10)}T12:00:00Z`))
    expect(timeToRFC3339(time)).toBe(expected)
  })

  it('zeroes the seconds', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T10:20:37.123Z'))
    expect(timeToRFC3339('12:00')).toMatch(/T12:00:00[+-]\d\d:\d\d$/u)
  })

  it('a malformed time becomes midnight rather than NaN', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T10:20:37Z'))
    expect(timeToRFC3339('')).toMatch(/T00:00:00/u)
  })

  it('a bare hour has minute 0', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T10:20:37Z'))
    expect(timeToRFC3339('7')).toMatch(/T07:00:00/u)
  })
})
