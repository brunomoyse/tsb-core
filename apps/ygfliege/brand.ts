import type { BrandConfig } from '#engine/types/brand'

// Single source of truth for Yangguofu Malatang Liège identity. Consumed by
// app.config (Vue side, via useAppConfig().brand) and by Nitro server routes
// (via the #brand alias) so both render from the same data.
//
// Contact details, address, coordinates and socials are taken from the existing
// ygfliege.be site (../../../malatang), which this app replaces at cutover.
//
// TODO(user): `vat` and `administrators` are deliberately absent — the legal
// pages on the old site were never written ("bientôt disponible"), so no real
// company number or list of representatives exists yet. Add them here once
// registered and the legal pages will render them automatically. Do not fill in
// placeholders: these render publicly as company identifiers.
export const brand: BrandConfig = {
    name: 'Yangguofu Malatang Liège',
    // Trading name only — the legal form (SRL/SA/…) is not confirmed yet.
    legalName: 'Yangguofu Malatang Liège',
    address: {
        street: 'Rue de la Cathédrale 51',
        city: 'Liège',
        postal: '4000',
        region: 'Wallonie',
        country: 'BE',
    },
    phone: '+32 4 286 68 20',
    email: 'ygfliege@gmail.com',
    domain: 'ygfliege.be',
    socials: {
        instagram: 'https://www.instagram.com/ygfmalatang_liege',
        tiktok: 'https://www.tiktok.com/@yangguofu.europe',
        rednote: 'https://www.xiaohongshu.com/user/profile/5cc5d7700000000011010db5',
    },
    // Rue de la Cathédrale 51 — a few doors from Tokyo Sushi Bar (59).
    // Geocoded via OSM Nominatim (same values the old site's Leaflet map used).
    geo: {
        lat: 50.64255,
        lng: 5.57505,
    },
    // Google Maps URL API search by address. The old site used an OSM/Leaflet
    // map and had no Google place link; this resolves to the same address
    // without inventing a place ID.
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rue%20de%20la%20Cath%C3%A9drale%2051%2C%204000%20Li%C3%A8ge',
    // Brand founded 2003 in Harbin by Yang Guofu; Liège franchise opened 2026.
    foundingYear: 2003,
    cuisine: 'Chinese',
    // Takeaway-only at launch: delivery toggles show "available soon" and the
    // cart is forced to PICKUP (plugins/pickup-only.ts). Flip to true (or
    // remove) when delivery starts.
    deliveryEnabled: false,
    menuDescription: 'Our menu of malatang bowls, signature herbal broths, noodles and starters',
    priceRange: '€€',
    /*
     * `rating` is intentionally omitted: the Liège restaurant has no public
     * review aggregate yet, and schema.org aggregateRating must reflect real
     * reviews. Add it only once there are genuine numbers to report.
     */
    deletionEmail: 'ygfliege@gmail.com',
}
