import type { BrandConfig } from '#engine/types/brand'

// Single source of truth for Yangguofu Malatang Liège identity. Consumed by
// app.config (Vue side, via useAppConfig().brand) and by Nitro server routes
// (via the #brand alias) so both render from the same data.
//
// TODO(user): confirm the fields marked below — VAT, legal name, contact email,
// administrators, exact geo coordinates and Google Maps link. Placeholders are
// clearly fake so they can't ship unnoticed.
export const brand: BrandConfig = {
    name: 'Yangguofu Malatang Liège',
    // TODO(user): registered legal entity name.
    legalName: 'Yangguofu Malatang Liège — SRL',
    // TODO(user): real VAT number.
    vat: 'BE0000.000.000',
    address: {
        street: 'Rue de la Cathédrale 51',
        city: 'Liège',
        postal: '4000',
        region: 'Wallonie',
        country: 'BE',
    },
    phone: '+32 4 286 68 20',
    // TODO(user): public contact email.
    email: 'contact@ygfliege.be',
    domain: 'ygfliege.be',
    socials: {
        instagram: 'https://www.instagram.com/ygfmalatang_liege',
        tiktok: 'https://www.tiktok.com/@yangguofu.europe',
        rednote: 'https://www.xiaohongshu.com/user/profile/5cc5d7700000000011010db5',
    },
    // Rue de la Cathédrale 51 — two doors from Tokyo Sushi Bar (59).
    // TODO(user): confirm exact coordinates.
    geo: {
        lat: 50.6424,
        lng: 5.5745,
    },
    // TODO(user): Google Maps deep link for the Liège restaurant.
    mapsUrl: 'https://maps.app.goo.gl/PLACEHOLDER',
    // Brand founded 2003 in Harbin by Yang Guofu; Liège franchise opened 2026.
    foundingYear: 2003,
    // TODO(user): legal representatives listed on the terms page.
    administrators: ['À confirmer'],
    cuisine: 'Chinese',
    menuDescription: 'Our menu of malatang bowls, signature herbal broths, noodles and starters',
    priceRange: '€€',
    /*
     * `rating` is intentionally omitted: the Liège restaurant has no public
     * review aggregate yet, and schema.org aggregateRating must reflect real
     * reviews. Add it only once there are genuine numbers to report.
     */
    // TODO(user): confirm account-deletion contact address.
    deletionEmail: 'contact@ygfliege.be',
}
