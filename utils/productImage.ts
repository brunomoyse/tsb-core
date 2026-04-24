const PRODUCT_IMAGE_FALLBACK = '/images/tokyo-sushi-takeaway-bag.png'
const PRODUCT_IMAGE_FALLBACK_BASE = '/images/tokyo-sushi-takeaway-bag'

type ProductImageExt = 'avif' | 'webp' | 'png'

export const productImageUrl = (
    s3BaseUrl?: string,
    slug?: string | null,
    ext: ProductImageExt = 'png',
): string => {
    if (!s3BaseUrl || !slug) {
        return PRODUCT_IMAGE_FALLBACK
    }

    return `${s3BaseUrl}/images/thumbnails/${slug}.${ext}`
}

export const productImageBase = (s3BaseUrl?: string, slug?: string | null): string => {
    if (!s3BaseUrl || !slug) {
        return PRODUCT_IMAGE_FALLBACK_BASE
    }

    return `${s3BaseUrl}/images/thumbnails/${slug}`
}

export const handleProductImageError = (event: Event): void => {
    const img = event.target as HTMLImageElement | null
    if (!img) return
    if (img.dataset.fallbackApplied === 'true') return

    img.dataset.fallbackApplied = 'true'
    img.src = PRODUCT_IMAGE_FALLBACK
}

export { PRODUCT_IMAGE_FALLBACK }
