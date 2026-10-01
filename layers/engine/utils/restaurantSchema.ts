import type { BrandConfig, BrandDayHours } from '../types/brand.ts'
import { OG_IMAGE_PATH } from './seoDefaults.ts'

/*
 * The schema.org Restaurant JSON-LD of a brand (audit PR 3.8, P8).
 *
 * It used to be one plugin with Tokyo Sushi Bar's opening hours, a "10% pickup discount" Offer (with a property that
 * does not exist in schema.org and a price of 0) and `acceptsReservations: true` hard-coded for BOTH brands. Now:
 *  - the hours are the live restaurantConfig.openingHours (what the restaurant has configured), brand.openingHours
 *    only when the config is not available;
 *  - cuisine, price range, reservations and logo come from brand.ts;
 *  - there is no custom Offer;
 *  - every URL is the localized one (`/fr/menu`, not the `/menu` that redirects).
 *
 * Pure (no Nuxt imports) so it is unit-tested with node: layers/engine/utils/restaurantSchema.test.mjs.
 */

export type OpeningHoursByDay = Record<string, BrandDayHours | null | undefined>

const DAYS: [string, string][] = [
    ['monday', 'Monday'],
    ['tuesday', 'Tuesday'],
    ['wednesday', 'Wednesday'],
    ['thursday', 'Thursday'],
    ['friday', 'Friday'],
    ['saturday', 'Saturday'],
    ['sunday', 'Sunday'],
]

const HHMM = /^(?<hour>[01]?\d|2[0-3]):[0-5]\d$/u
const pad = (hhmm: string): string => (hhmm.length === 4 ? `0${hhmm}` : hhmm)
const validRange = (open?: string, close?: string): [string, string] | null =>
    open && close && HHMM.test(open) && HHMM.test(close) ? [pad(open), pad(close)] : null

/**
 * OpeningHoursSpecification entries from a monday..sunday map: one entry per distinct opening range, listing every
 * day it applies to (so "Mon, Wed-Fri 12:00-14:30" is one entry, not four). A split day gives two ranges; a null or
 * absent day, or a malformed time, is closed.
 */
export const openingHoursSpecification = (hours: OpeningHoursByDay | null | undefined) => {
    const byRange = new Map<string, { opens: string; closes: string; days: string[] }>()
    for (const [key, name] of DAYS) {
        const day = hours?.[key]
        if (!day) continue
        for (const range of [validRange(day.open, day.close), validRange(day.dinnerOpen, day.dinnerClose)]) {
            if (!range) continue
            const id = range.join('-')
            const entry = byRange.get(id) ?? { opens: range[0], closes: range[1], days: [] }
            entry.days.push(name)
            byRange.set(id, entry)
        }
    }
    return [...byRange.values()].map(({ opens, closes, days }) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: days,
        opens,
        closes,
    }))
}

export interface RestaurantSchemaInput {
    brand: BrandConfig
    /** Origin of the site, without a trailing slash. */
    baseUrl: string
    /** Active locale code (fr, en, nl, zh). */
    locale: string
    /** Live restaurantConfig.openingHours; `brand.openingHours` is used when it is missing or has no day at all. */
    openingHours?: OpeningHoursByDay | null
}

export const buildRestaurantSchema = ({ brand, baseUrl, locale, openingHours }: RestaurantSchemaInput) => {
    const menuUrl = `${baseUrl}/${locale}/menu`
    const live = openingHours && Object.keys(openingHours).length > 0 ? openingHours : null
    const specification = openingHoursSpecification(live ?? brand.openingHours)

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Restaurant',
                '@id': `${baseUrl}#restaurant`,
                name: brand.name,
                image: [`${baseUrl}${OG_IMAGE_PATH}`],
                logo: `${baseUrl}${brand.logo}`,
                telephone: brand.phone.replace(/\s/gu, ''),
                email: brand.email,
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: brand.address.street,
                    addressLocality: brand.address.city,
                    addressRegion: brand.address.region,
                    postalCode: brand.address.postal,
                    addressCountry: brand.address.country,
                },
                geo: {
                    '@type': 'GeoCoordinates',
                    latitude: brand.geo.lat,
                    longitude: brand.geo.lng,
                },
                url: baseUrl,
                // Whichever social profiles the brand has set (all optional).
                sameAs: Object.values(brand.socials).filter(Boolean),
                servesCuisine: brand.cuisine,
                priceRange: brand.priceRange,
                acceptsReservations: brand.acceptsReservations,
                // A reference only: the menu page declares the Menu node itself (name, description, sections), a second description here would conflict with it.
                hasMenu: { '@id': `${menuUrl}#menu` },
                // Only emitted when the brand has a real review aggregate.
                ...(brand.rating
                    ? {
                        aggregateRating: {
                            '@type': 'AggregateRating',
                            ratingValue: brand.rating.value,
                            reviewCount: brand.rating.count,
                            bestRating: 5,
                            worstRating: 1,
                        },
                    }
                    : {}),
                ...(specification.length ? { openingHoursSpecification: specification } : {}),
            },
        ],
    }
}
