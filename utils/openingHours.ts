type DaySlot = {
    open: string
    close: string
    dinnerOpen?: string
    dinnerClose?: string
} | null

type OpeningHours = Record<string, DaySlot>

export interface FixedTimeSlot {
    label: string
    value: string
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

/**
 * Parses an "HH:MM" string into total minutes since midnight.
 */
const parseTime = (time: string): number => {
    const [h, m] = time.split(':').map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
}

const formatRFC3339Local = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')

    const tzOffsetMin = -date.getTimezoneOffset()
    const sign = tzOffsetMin >= 0 ? '+' : '-'
    const absOffset = Math.abs(tzOffsetMin)
    const offHour = Math.floor(absOffset / 60).toString().padStart(2, '0')
    const offMin = (absOffset % 60).toString().padStart(2, '0')

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offHour}:${offMin}`
}

const roundUpToNextQuarter = (date: Date): Date => {
    const rounded = new Date(date)
    rounded.setSeconds(0, 0)
    const minutes = rounded.getMinutes()
    const remainder = minutes % 15
    if (remainder !== 0) {
        rounded.setMinutes(minutes + (15 - remainder))
    }
    return rounded
}

const toDateAtMinutes = (base: Date, minutes: number): Date => {
    const next = new Date(base)
    next.setHours(0, 0, 0, 0)
    next.setMinutes(minutes)
    return next
}

const maxDate = (a: Date, b: Date): Date => (a > b ? a : b)

export function getAvailableFixedSlotsToday(openingHours: OpeningHours, now = new Date(), orderingHours?: OpeningHours | null): FixedTimeSlot[] {
    const hours = orderingHours ?? openingHours
    const dayKey = DAY_KEYS[now.getDay()]!
    const daySchedule = hours[dayKey]
    if (!daySchedule) return []

    const minAllowed = roundUpToNextQuarter(new Date(now.getTime() + 60 * 60 * 1000))
    const intervals: [string, string][] = [[daySchedule.open, daySchedule.close]]
    if (daySchedule.dinnerOpen && daySchedule.dinnerClose) {
        intervals.push([daySchedule.dinnerOpen, daySchedule.dinnerClose])
    }

    const slots: FixedTimeSlot[] = []
    const seen = new Set<string>()

    for (const [open, close] of intervals) {
        const openMins = parseTime(open)
        const closeMins = parseTime(close)
        const openPlusPreparation = toDateAtMinutes(now, openMins + 30)
        const intervalEnd = toDateAtMinutes(now, closeMins)

        if (intervalEnd < openPlusPreparation) {
            continue
        }

        let current = roundUpToNextQuarter(maxDate(openPlusPreparation, minAllowed))
        while (current <= intervalEnd) {
            const value = formatRFC3339Local(current)
            if (!seen.has(value)) {
                seen.add(value)
                slots.push({
                    label: formatMinutes(current.getHours() * 60 + current.getMinutes()),
                    value,
                })
            }
            current = new Date(current.getTime() + 15 * 60 * 1000)
        }
    }

    return slots
}

export function hasAvailableFixedSlotsToday(openingHours: OpeningHours, now = new Date(), orderingHours?: OpeningHours | null): boolean {
    return getAvailableFixedSlotsToday(openingHours, now, orderingHours).length > 0
}

/**
 * Formats total minutes since midnight as "HH:MM".
 */
const formatMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * Returns the next opening time string for a given set of opening hours.
 *
 * - If the restaurant opens later today, returns "HH:MM"
 * - If it opens on a future day (within 7 days), returns the localized day name + "HH:MM"
 * - Returns null if no opening time is found within the next 7 days
 *
 * @param openingHours - The opening hours config from the backend
 * @param dayLabels - Map of day keys to localized day names
 */
export function getNextOpeningTime(
    openingHours: OpeningHours,
    dayLabels: Record<string, string>,
): string | null {
    const now = new Date()
    const currentDay = now.getDay() // 0=Sunday
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    // Check up to 7 days ahead (today + 6)
    for (let offset = 0; offset < 7; offset++) {
        const dayIndex = (currentDay + offset) % 7
        const dayKey = DAY_KEYS[dayIndex]!
        const slot = openingHours[dayKey]

        if (!slot) continue

        // Collect all opening times for this day
        const openings: number[] = [parseTime(slot.open)]
        if (slot.dinnerOpen) {
            openings.push(parseTime(slot.dinnerOpen))
        }

        for (const openMinutes of openings) {
            // For today, only consider future times
            if (offset === 0 && openMinutes <= currentMinutes) continue

            const timeStr = formatMinutes(openMinutes)
            if (offset === 0) {
                return timeStr
            }
            const label = dayLabels[dayKey] ?? dayKey
            return `${label} ${timeStr}`
        }
    }

    return null
}
