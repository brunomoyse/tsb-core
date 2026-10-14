import { collapseHours, formatHm, openState, statusView, toMinutes } from './openingHours'
import { describe, expect, it } from 'vite-plus/test'

const day = { open: '11:30', close: '22:00' }
const everyDay = {
  monday: day,
  tuesday: day,
  wednesday: day,
  thursday: day,
  friday: day,
  saturday: day,
  sunday: day,
}
// Wednesday 14 October 2026, Brussels is UTC+2 (summer time).
const at = (hm: string) => new Date(`2026-10-14T${hm}:00+02:00`)

describe('collapseHours', () => {
  it('seven identical days are one line', () => {
    expect(collapseHours(everyDay)).toEqual([{ from: 'monday', to: 'sunday', hours: day }])
  })

  it('a closed day and a split day break the runs', () => {
    const split = { open: '11:30', close: '14:00', dinnerOpen: '18:00', dinnerClose: '22:00' }
    expect(
      collapseHours({ ...everyDay, tuesday: null, saturday: split, sunday: { ...split } }),
    ).toEqual([
      { from: 'monday', to: 'monday', hours: day },
      { from: 'tuesday', to: 'tuesday', hours: null },
      { from: 'wednesday', to: 'friday', hours: day },
      { from: 'saturday', to: 'sunday', hours: split },
    ])
    // A day left out is closed, like an explicit null.
    expect(collapseHours({ monday: day }).at(-1)).toEqual({
      from: 'tuesday',
      to: 'sunday',
      hours: null,
    })
  })
})

describe('openState', () => {
  it('open: until when, how long is left, how far into the day', () => {
    expect(openState(everyDay, at('16:45'))).toEqual({
      kind: 'open',
      closesAt: '22:00',
      minutesLeft: 315,
      progress: 0.5,
    })
  })

  it('closed before the opening: opens today; after closing: opens tomorrow', () => {
    expect(openState(everyDay, at('09:00'))).toEqual({
      kind: 'closed',
      opensAt: { day: 'wednesday', time: '11:30', today: true },
    })
    expect(openState(everyDay, at('22:00'))).toEqual({
      kind: 'closed',
      opensAt: { day: 'thursday', time: '11:30', today: false },
    })
  })

  it('a split day: closed between the services, open in the evening; a closed day is skipped', () => {
    const split = { open: '11:30', close: '14:00', dinnerOpen: '18:00', dinnerClose: '22:00' }
    const week = { wednesday: split, friday: day }
    expect(openState(week, at('15:00'))).toEqual({
      kind: 'closed',
      opensAt: { day: 'wednesday', time: '18:00', today: true },
    })
    expect(openState(week, at('19:00'))).toMatchObject({ kind: 'open', closesAt: '22:00' })
    expect(openState(week, at('23:00'))).toEqual({
      kind: 'closed',
      opensAt: { day: 'friday', time: '11:30', today: false },
    })
  })

  it('a close after midnight, and a week with no hours at all', () => {
    expect(openState({ wednesday: { open: '18:00', close: '01:00' } }, at('23:30'))).toEqual({
      kind: 'open',
      closesAt: '01:00',
      minutesLeft: 90,
      progress: 5.5 / 7,
    })
    expect(openState({}, at('12:00'))).toEqual({ kind: 'closed', opensAt: null })
  })
})

describe('formatting', () => {
  it('writes 11h30 in French and 11:30 elsewhere', () => {
    expect(formatHm('11:30', 'fr')).toBe('11h30')
    expect(formatHm('22:00', 'fr-BE')).toBe('22h00')
    expect(formatHm('11:30', 'en')).toBe('11:30')
    expect(toMinutes('22:15')).toBe(1335)
  })
})

describe('statusView', () => {
  const format = { time: (hm: string) => `[${hm}]`, day: (d: string) => `<${d}>` }
  const open = openState(everyDay, at('16:45'))

  it('the live shop wins: ready in ~N minutes, pre-order time, walk-in only', () => {
    expect(statusView(open, { ...format, ordering: 'open', preparationMinutes: 30 })).toEqual({
      open: true,
      labelKey: 'mkt.status.open',
      sub: { key: 'mkt.status.readyIn', values: { minutes: 30 } },
    })
    expect(
      statusView(openState(everyDay, at('09:00')), {
        ...format,
        ordering: 'preorder',
        preorderTime: '12:00',
      }),
    ).toEqual({
      open: false,
      labelKey: 'mkt.status.closed',
      sub: { key: 'mkt.status.preorder', values: { time: '12:00' } },
    })
    expect(statusView(open, { ...format, ordering: 'onsiteOnly' }).sub?.key).toBe(
      'mkt.status.onsiteOnly',
    )
  })

  it('otherwise the hours: open until, closing soon, opens today or another day, or nothing known', () => {
    expect(statusView(open, format).sub).toEqual({
      key: 'mkt.status.closesAt',
      values: { time: '[22:00]' },
    })
    // Live "open" without a preparation time, or a pre-order without its time, fall back to the hours too.
    expect(
      statusView(openState(everyDay, at('21:40')), { ...format, ordering: 'open' }).sub,
    ).toEqual({
      key: 'mkt.status.closingSoon',
      values: { time: '[22:00]' },
    })
    expect(
      statusView(openState(everyDay, at('09:00')), { ...format, ordering: 'preorder' }).sub,
    ).toEqual({ key: 'mkt.status.opensToday', values: { time: '[11:30]' } })
    expect(statusView(openState(everyDay, at('23:00')), format).sub).toEqual({
      key: 'mkt.status.opensOn',
      values: { day: '<thursday>', time: '[11:30]' },
    })
    expect(statusView(openState({}, at('12:00')), { ...format, ordering: 'closed' })).toEqual({
      open: false,
      labelKey: 'mkt.status.closed',
      sub: null,
    })
  })
})
