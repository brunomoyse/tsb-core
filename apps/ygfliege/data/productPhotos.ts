// Brand-side product photography overrides, keyed by product slug.
//
// Product images normally come from S3 by product id (uploaded via the
// dashboard); anything without an upload falls back to the logo placeholder.
// Every image here is official Yangguofu photography: the bowl/broth kit
// shipped with the app (same set as the vitrine site), plus dry-mix dishes
// from the official Europe site's store-page kit (v2.zuhecdn.com, 1200px
// cut-outs on transparency — same style as the rest). Slugs come from
// `tsb-service/seeds/ygfliege_menu.sql`; an S3 upload still wins for any
// product NOT listed here, so unmapped products keep the normal pipeline.
export interface ProductPhoto {
    /** Asset base, e.g. `/images/bowls/tomato-top` (widths + ext appended). */
    base: string
    /**
     * True for full-frame photographs (fill the card, object-cover); false
     * for cut-outs on transparency (object-contain on the tinted surface).
     */
    cover?: boolean
    /** Available widths, when they differ from PRODUCT_PHOTO_WIDTHS. */
    widths?: number[]
    /** Width that has the .png fallback, when not 560. */
    fallbackWidth?: number
}

export const PRODUCT_PHOTOS: Record<string, ProductPhoto> = {
    'malatang-decouverte': { base: '/images/bowls/tomato-top' },
    'malatang-gourmand': { base: '/images/bowls/beef-bone-top' },
    'malatang-vegetarien': { base: '/images/bowls/mushroom-top' },
    // Dry-mix sets, from the official Europe kit (1200px, zuhecdn CDN):
    // `saute_the_red_oil_until_fragrant` (red-oil mala ban, white plate) and
    // `herbal_mala_stir-fry_pot` (mala xiang guo). The vegetarian one reuses
    // the kit's mala-dry-mix bowl — the kit's `spicy_salad` looks near-
    // identical to it, and the other dry-style shots show shrimp or meat.
    'mala-mix-decouverte': { base: '/images/dishes/mala-mix-decouverte' },
    'mala-mix-gourmand': { base: '/images/dishes/mala-mix-gourmand' },
    'mala-mix-vegetarien': { base: '/images/bowls/mala-dry-mix-top' },
    // Same shot as the menu hero, deliberately: it IS the composer.
    'malatang-sur-mesure': { base: '/images/bowls/beef-bone-top' },
}

/** Default widths for mapped assets (avif + webp; 560 also png). */
export const PRODUCT_PHOTO_WIDTHS = [320, 560, 800]

export const productPhoto = (slug?: string | null): ProductPhoto | undefined =>
    slug ? PRODUCT_PHOTOS[slug] : undefined
