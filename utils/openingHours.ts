type DaySlot = {
    open: string
    close: string
    dinnerOpen?: string
    dinnerClose?: string
} | null

type OpeningHours = Record<string, DaySlot>

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

/**
 * Parses an "HH:MM" string into total minutes since midnight.
 */
const parseTime = (time: string): number => {
    const [h, m] = time.split(':').map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
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
