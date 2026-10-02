// Brand-side product photography overrides, keyed by product slug. Shared engine
// pages import this module through `#brand/data/productPhotos`, so every brand app
// provides it. Tokyo Sushi has none: each product image is the dashboard upload
// (S3, keyed by product id).
export interface ProductPhoto {
    /** Asset base (widths + ext appended). */
    base: string
    /** Available widths, when they differ from PRODUCT_PHOTO_WIDTHS. */
    widths?: number[]
    /** Width that has the .png fallback, when not 560. */
    fallbackWidth?: number
}

export const PRODUCT_PHOTO_WIDTHS: number[] = [320, 560, 800]

export const productPhoto = (_slug?: string | null): ProductPhoto | undefined => undefined
