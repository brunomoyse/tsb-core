export const RESTAURANT_TZ = 'Europe/Brussels'

export function formatDateTime(iso: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        timeZone: RESTAURANT_TZ,
    }).format(new Date(iso))
}

export function formatTime(iso: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        hour: '2-digit', minute: '2-digit',
        timeZone: RESTAURANT_TZ,
    }).format(new Date(iso))
}

export function formatDate(iso: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: RESTAURANT_TZ,
    }).format(new Date(iso))
}

export interface BrusselsParts {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    weekday: number
}

const WEEKDAY_MAP: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: RESTAURANT_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
    hourCycle: 'h23',
})

export function getBrusselsParts(date: Date = new Date()): BrusselsParts {
    const parts = partsFormatter.formatToParts(date)
    const get = (type: Intl.DateTimeFormatPartTypes): string =>
        parts.find(p => p.type === type)?.value ?? '0'
    return {
        year: Number(get('year')),
        month: Number(get('month')),
        day: Number(get('day')),
        hour: Number(get('hour')),
        minute: Number(get('minute')),
        weekday: WEEKDAY_MAP[get('weekday')] ?? 0,
    }
}

export function isSameBrusselsDay(a: Date, b: Date): boolean {
    const pa = getBrusselsParts(a)
    const pb = getBrusselsParts(b)
    return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day
}
