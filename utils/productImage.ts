const PRODUCT_IMAGE_FALLBACK = '/images/placeholder-product.png'
const PRODUCT_IMAGE_FALLBACK_BASE = '/images/placeholder-product'

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
    applyProductImageFallback(img)
}

export const ensureProductImageFallback = (img: HTMLImageElement | null | undefined): void => {
    if (!img) return
    if (!img.complete) return
    if (img.naturalWidth > 0) return

    applyProductImageFallback(img)
}

const applyProductImageFallback = (img: HTMLImageElement | null): void => {
    if (!img) return
    if (img.dataset.fallbackApplied === 'true') return

    img.dataset.fallbackApplied = 'true'

    const picture = img.parentElement
    if (picture?.tagName === 'PICTURE') {
        const sources = picture.querySelectorAll('source')
        for (const source of sources) {
            source.removeAttribute('srcset')
        }
    }

    img.src = PRODUCT_IMAGE_FALLBACK
}

export { PRODUCT_IMAGE_FALLBACK }
