// Brussels time helpers: the restaurant's day is Brussels', whatever the visitor's or the server's timezone.
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  RESTAURANT_TZ,
  formatDate,
  formatDateTime,
  formatTime,
  getBrusselsParts,
  isSameBrusselsDay,
} from './datetime'

const originalTz = process.env.TZ
afterEach(() => {
  vi.useRealTimers()
  if (originalTz === undefined) delete process.env.TZ
  else process.env.TZ = originalTz
})

describe('formatting in Brussels time', () => {
  it('uses the Europe/Brussels zone', () => {
    expect(RESTAURANT_TZ).toBe('Europe/Brussels')
  })

  it('summer time (UTC+2): 10:30Z is 12:30', () => {
    expect(formatTime('2026-07-14T10:30:00Z', 'fr-BE')).toBe('12:30')
    expect(formatDate('2026-07-14T10:30:00Z', 'fr-BE')).toBe('14/07/2026')
    const both = formatDateTime('2026-07-14T10:30:00Z', 'fr-BE')
    expect(both).toContain('14/07/2026')
    expect(both).toContain('12:30')
  })

  it('winter time (UTC+1): 10:30Z is 11:30', () => {
    expect(formatTime('2026-01-14T10:30:00Z', 'fr-BE')).toBe('11:30')
  })

  it('late evening UTC is already the next day in Brussels', () => {
    expect(formatDate('2026-07-14T22:30:00Z', 'fr-BE')).toBe('15/07/2026')
  })

  it('does not depend on the process timezone', () => {
    process.env.TZ = 'Pacific/Auckland'
    expect(formatTime('2026-07-14T10:30:00Z', 'fr-BE')).toBe('12:30')
  })

  it('follows the requested locale', () => {
    expect(formatDate('2026-07-14T10:30:00Z', 'en-US')).toBe('07/14/2026')
  })
})

describe('getBrusselsParts', () => {
  it('splits an instant into Brussels calendar parts (weekday: Sunday 0)', () => {
    // Tuesday 14 July 2026, 12:05 Brussels.
    expect(getBrusselsParts(new Date('2026-07-14T10:05:00Z'))).toEqual({
      year: 2026,
      month: 7,
      day: 14,
      hour: 12,
      minute: 5,
      weekday: 2,
    })
  })

  it.each([
    ['2026-07-12T10:00:00Z', 0],
    ['2026-07-13T10:00:00Z', 1],
    ['2026-07-14T10:00:00Z', 2],
    ['2026-07-15T10:00:00Z', 3],
    ['2026-07-16T10:00:00Z', 4],
    ['2026-07-17T10:00:00Z', 5],
    ['2026-07-18T10:00:00Z', 6],
  ])('%s is weekday %i', (iso, weekday) => {
    expect(getBrusselsParts(new Date(iso)).weekday).toBe(weekday)
  })

  it('midnight is hour 0, not 24 (h23 cycle)', () => {
    // 23:00Z on 14 July is 01:00 on the 15th; 22:00Z is 00:00 on the 15th.
    const parts = getBrusselsParts(new Date('2026-07-14T22:00:00Z'))
    expect(parts).toMatchObject({ day: 15, hour: 0, minute: 0 })
  })

  it('crosses the spring-forward change (29 March 2026, 02:00 -> 03:00)', () => {
    expect(getBrusselsParts(new Date('2026-03-29T00:59:00Z'))).toMatchObject({
      hour: 1,
      minute: 59,
    })
    expect(getBrusselsParts(new Date('2026-03-29T01:00:00Z'))).toMatchObject({ hour: 3, minute: 0 })
  })

  it('crosses the autumn fall-back change (25 October 2026, 03:00 -> 02:00)', () => {
    expect(getBrusselsParts(new Date('2026-10-25T00:59:00Z'))).toMatchObject({
      hour: 2,
      minute: 59,
    })
    expect(getBrusselsParts(new Date('2026-10-25T01:00:00Z'))).toMatchObject({ hour: 2, minute: 0 })
  })

  it('defaults to now', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z')) // Already New Year in Brussels
    expect(getBrusselsParts()).toMatchObject({ year: 2027, month: 1, day: 1, hour: 0, minute: 30 })
  })
})

describe('isSameBrusselsDay', () => {
  it('compares calendar days in Brussels, not in UTC', () => {
    // 22:30Z and 23:30Z on the 14th are 00:30 and 01:30 on the 15th in Brussels: same day.
    expect(
      isSameBrusselsDay(new Date('2026-07-14T22:30:00Z'), new Date('2026-07-14T23:30:00Z')),
    ).toBe(true)
    // 21:30Z (23:30 on the 14th) and 22:30Z (00:30 on the 15th): different days though one UTC day.
    expect(
      isSameBrusselsDay(new Date('2026-07-14T21:30:00Z'), new Date('2026-07-14T22:30:00Z')),
    ).toBe(false)
  })

  it('same clock time on different months or years is not the same day', () => {
    expect(
      isSameBrusselsDay(new Date('2026-07-14T10:00:00Z'), new Date('2026-08-14T10:00:00Z')),
    ).toBe(false)
    expect(
      isSameBrusselsDay(new Date('2026-07-14T10:00:00Z'), new Date('2027-07-14T10:00:00Z')),
    ).toBe(false)
  })
})
