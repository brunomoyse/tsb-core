const PRODUCT_IMAGE_FALLBACK_THUMBNAIL = '/images/placeholder-product-thumbnail.png'
const PRODUCT_IMAGE_FALLBACK_CLASSIC = '/images/placeholder-product-classic.png'
const PRODUCT_IMAGE_FALLBACK_THUMBNAIL_BASE = '/images/placeholder-product-thumbnail'
const PRODUCT_IMAGE_FALLBACK_CLASSIC_BASE = '/images/placeholder-product-classic'

type ProductImageVariant = 'thumbnail' | 'classic'

type ProductImageExt = 'avif' | 'webp' | 'png'

const fallbackBaseByVariant = (variant: ProductImageVariant): string =>
    variant === 'classic' ? PRODUCT_IMAGE_FALLBACK_CLASSIC_BASE : PRODUCT_IMAGE_FALLBACK_THUMBNAIL_BASE

const fallbackPngByVariant = (variant: ProductImageVariant): string =>
    variant === 'classic' ? PRODUCT_IMAGE_FALLBACK_CLASSIC : PRODUCT_IMAGE_FALLBACK_THUMBNAIL

export const productImageUrl = (
    s3BaseUrl?: string,
    id?: string | null,
    format: ProductImageExt | { ext?: ProductImageExt; variant?: ProductImageVariant } = 'png',
): string => {
    const ext = typeof format === 'string' ? format : (format.ext ?? 'png')
    const variant = typeof format === 'string' ? 'thumbnail' : (format.variant ?? 'thumbnail')

    if (!s3BaseUrl || !id) {
        return `${fallbackBaseByVariant(variant)}.${ext}`
    }

    return `${s3BaseUrl}/images/thumbnails/${id}.${ext}`
}

export const productImageBase = (
    s3BaseUrl?: string,
    id?: string | null,
    variant: ProductImageVariant = 'thumbnail',
): string => {
    if (!s3BaseUrl || !id) {
        return fallbackBaseByVariant(variant)
    }

    return `${s3BaseUrl}/images/thumbnails/${id}`
}

export const handleProductImageError = (event: Event, variant: ProductImageVariant = 'thumbnail'): void => {
    const img = event.target as HTMLImageElement | null
    applyProductImageFallback(img, variant)
}

export const ensureProductImageFallback = (
    img: HTMLImageElement | null | undefined,
    variant: ProductImageVariant = 'thumbnail',
): void => {
    if (!img) return
    if (!img.complete) return
    if (img.naturalWidth > 0) return

    applyProductImageFallback(img, variant)
}

const applyProductImageFallback = (img: HTMLImageElement | null, variant: ProductImageVariant): void => {
    if (!img) return
    if (img.dataset.fallbackApplied === 'true') return

    img.dataset.fallbackApplied = 'true'
    const fallbackBase = fallbackBaseByVariant(variant)
    const fallbackPng = fallbackPngByVariant(variant)

    const picture = img.parentElement
    if (picture?.tagName === 'PICTURE') {
        const sources = picture.querySelectorAll('source')
        for (const source of sources) {
            const sourceType = source.getAttribute('type')
            if (sourceType === 'image/avif') {
                source.setAttribute('srcset', `${fallbackBase}.avif`)
            } else if (sourceType === 'image/webp') {
                source.setAttribute('srcset', `${fallbackBase}.webp`)
            } else {
                source.removeAttribute('srcset')
            }
        }
    }

    img.src = fallbackPng
}

export {
    PRODUCT_IMAGE_FALLBACK_CLASSIC,
    PRODUCT_IMAGE_FALLBACK_THUMBNAIL as PRODUCT_IMAGE_FALLBACK,
}
