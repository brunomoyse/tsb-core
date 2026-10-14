import type { BrandDayHours, BrandOpeningHours } from '#engine/types/brand'
import { getBrusselsParts } from '#engine/utils/datetime'

/*
 * Opening hours for the showcase pages (home hero, practical info): one line for identical days ("Tous les jours ·
 * 11h30 - 22h00" instead of the same hours seven times), and the state at a given moment (open until when, how far into
 * the day, or when it opens next). The hours come from the live restaurant config, else from brand.openingHours; the
 * clock is always Brussels (utils/datetime).
 */

export const WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
export type WeekDay = (typeof WEEK)[number]

/** Consecutive days that share the same hours (null: closed). */
export interface HoursRun {
  from: WeekDay
  to: WeekDay
  hours: BrandDayHours | null
}

const sameHours = (a: BrandDayHours | null, b: BrandDayHours | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.open === b.open &&
    a.close === b.close &&
    (a.dinnerOpen ?? '') === (b.dinnerOpen ?? '') &&
    (a.dinnerClose ?? '') === (b.dinnerClose ?? ''))

/** The week, Monday first, as runs of identical days: seven identical days are one run (every day). */
export const collapseHours = (hours: BrandOpeningHours): HoursRun[] => {
  const runs: HoursRun[] = []
  for (const day of WEEK) {
    const today = hours[day] ?? null
    const last = runs.at(-1)
    if (last && sameHours(last.hours, today)) last.to = day
    else runs.push({ from: day, to: day, hours: today })
  }
  return runs
}

export const toMinutes = (hm: string): number => {
  const [hour = 0, minute = 0] = hm.split(':').map(Number)
  return hour * 60 + minute
}

/** "11:30" as the locale writes it: "11h30" in French, "11:30" elsewhere. */
export const formatHm = (hm: string, locale: string): string =>
  locale.startsWith('fr') ? hm.replace(':', 'h') : hm

/** A day's opening spans in minutes; a close at or before its opening runs past midnight. */
const spans = (hours: BrandDayHours | null | undefined): [number, number][] => {
  if (!hours) return []
  const pairs: [string, string][] = [[hours.open, hours.close]]
  if (hours.dinnerOpen !== undefined && hours.dinnerClose !== undefined)
    pairs.push([hours.dinnerOpen, hours.dinnerClose])
  return pairs.map(([open, close]) => {
    const start = toMinutes(open)
    const end = toMinutes(close)
    return [start, end <= start ? end + 24 * 60 : end]
  })
}

const clock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export type OpenState =
  | {
      kind: 'open'
      /** "22:00" */
      closesAt: string
      minutesLeft: number
      /** How far into today's opening hours (first opening to last closing), 0 to 1: the day bar. */
      progress: number
    }
  | {
      kind: 'closed'
      /** The next opening within a week, or null when the hours list none. */
      opensAt: { day: WeekDay; time: string; today: boolean } | null
    }

/** Open or closed at `now` (Brussels time), from the week's hours. */
export const openState = (hours: BrandOpeningHours, now: Date = new Date()): OpenState => {
  const parts = getBrusselsParts(now)
  // getBrusselsParts counts from Sunday (0); WEEK starts on Monday.
  const todayIndex = (parts.weekday + 6) % 7
  const minute = parts.hour * 60 + parts.minute
  const today = spans(hours[WEEK[todayIndex]!])

  const current = today.find(([start, end]) => minute >= start && minute < end)
  if (current) {
    const [first] = today[0]!
    const [, last] = today.at(-1)!
    return {
      kind: 'open',
      closesAt: clock(current[1]),
      minutesLeft: current[1] - minute,
      progress: (minute - first) / (last - first),
    }
  }

  const later = today.find(([start]) => start > minute)
  if (later)
    return {
      kind: 'closed',
      opensAt: { day: WEEK[todayIndex]!, time: clock(later[0]), today: true },
    }
  for (let offset = 1; offset <= 7; offset++) {
    const day = WEEK[(todayIndex + offset) % 7]!
    const [first] = spans(hours[day])
    if (first) return { kind: 'closed', opensAt: { day, time: clock(first[0]), today: false } }
  }
  return { kind: 'closed', opensAt: null }
}

/** The live ordering state of the shop (useOrderingAvailability), when the shop is on and the config has loaded. */
export type OrderingState = 'open' | 'preorder' | 'onsiteOnly' | 'closed'

export interface StatusView {
  /** Drives the dot: an orange pulse while open, a still one otherwise. */
  open: boolean
  /** i18n key of the bold word ("Ouvert", "Fermé"). */
  labelKey: string
  /** i18n key and values of what follows ("ferme à 22h00", "prêt en ~30 min"), if anything. */
  sub: { key: string; values: Record<string, string | number> } | null
}

/**
 * What the status chip says. The shop's live state wins when there is one (open: ready in ~N minutes; pre-order only;
 * walk-in only); otherwise, and for a closed shop, the opening hours do (open until, closing soon, opens at).
 * `time` and `day` format "HH:MM" and a weekday for the page's language.
 */
export const statusView = (
  state: OpenState,
  options: {
    ordering?: OrderingState | null
    preparationMinutes?: number | null
    preorderTime?: string | null
    time: (hm: string) => string
    day: (day: WeekDay) => string
  },
): StatusView => {
  const { ordering, preparationMinutes, preorderTime, time, day } = options
  if (ordering === 'open' && preparationMinutes !== undefined && preparationMinutes !== null)
    return {
      open: true,
      labelKey: 'mkt.status.open',
      sub: { key: 'mkt.status.readyIn', values: { minutes: preparationMinutes } },
    }
  if (ordering === 'preorder' && preorderTime !== undefined && preorderTime !== null)
    return {
      open: false,
      labelKey: 'mkt.status.closed',
      sub: { key: 'mkt.status.preorder', values: { time: preorderTime } },
    }
  if (ordering === 'onsiteOnly')
    return {
      open: true,
      labelKey: 'mkt.status.open',
      sub: { key: 'mkt.status.onsiteOnly', values: {} },
    }

  if (state.kind === 'open')
    return {
      open: true,
      labelKey: 'mkt.status.open',
      sub: {
        key: state.minutesLeft <= 30 ? 'mkt.status.closingSoon' : 'mkt.status.closesAt',
        values: { time: time(state.closesAt) },
      },
    }
  const next = state.opensAt
  if (next === null) return { open: false, labelKey: 'mkt.status.closed', sub: null }
  return {
    open: false,
    labelKey: 'mkt.status.closed',
    sub: next.today
      ? { key: 'mkt.status.opensToday', values: { time: time(next.time) } }
      : { key: 'mkt.status.opensOn', values: { day: day(next.day), time: time(next.time) } },
  }
}
