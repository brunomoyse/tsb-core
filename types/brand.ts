// BrandConfig is the per-restaurant identity consumed across the app via
// `useAppConfig().brand`. Each white-label brand supplies one of these from
// its Nuxt layer (`brands/<name>/app.config.ts`). Non-secret, build-time data.
export interface BrandConfig {
    /** Customer-facing display name, e.g. "Tokyo Sushi Bar". */
    name: string
    /** Registered legal entity, e.g. "Tokyo Sushi Bar — SRL". */
    legalName: string
    /** VAT / company registration number. */
    vat: string
    address: {
        street: string
        city: string
        postal: string
        region: string
        /** ISO 3166-1 alpha-2 country code, e.g. "BE". */
        country: string
    }
    phone: string
    email: string
    /** Public website domain (no scheme), e.g. "tokyosushibarliege.be". */
    domain: string
    socials: {
        instagram: string
        facebook: string
    }
    geo: {
        lat: number
        lng: number
    }
    /** Deep link to the restaurant on Google Maps. */
    mapsUrl: string
    /** Year the restaurant opened; drives "X years" copy on the homepage. */
    foundingYear: number
    /** Legal representatives listed on the terms page. */
    administrators: string[]
    /** schema.org servesCuisine value, e.g. "Japanese". */
    cuisine: string
    /** schema.org priceRange value, e.g. "€€". */
    priceRange: string
    rating: {
        value: number
        count: number
    }
    /** Email address handling account-deletion requests. */
    deletionEmail: string
}
