import { PRODUCT_IMAGE_FALLBACK, productImageUrl } from './productImage.ts'

/*
 * The schema.org Menu of the /menu page (audit PR 3.8, P9), shared by both brands (it was two copies).
 *
 * Product images are the shared productImage util keyed by product.id, like every other surface: the copies used
 * product.slug, so every image URL in the JSON-LD pointed at a file that does not exist. A brand with its own
 * photography (YGF's PRODUCT_PHOTOS) passes `photoFor`. All ids and URLs are the localized menu URL.
 * Pure: unit-tested with node, layers/engine/utils/menuSchema.test.mjs.
 */

export interface MenuSchemaProduct {
  id: string
  slug?: string | null
  name: string
  price: string
  isAvailable: boolean
  isHalal?: boolean
  isVegetarian?: boolean
  category?: { id: string; name: string } | null
}

/** Site-relative image paths of a brand's own photo of a product, if it has one. */
export interface BrandPhotoUrls {
  png: string
  webp: string
}

export interface MenuSchemaInput {
  products: MenuSchemaProduct[]
  /** Absolute localized menu URL, e.g. https://shop.be/fr/menu */
  menuUrl: string
  /** Origin of the site, for the images served by the app itself. */
  baseUrl: string
  s3BaseUrl?: string
  name: string
  description: string
  /** BCP 47 tag of the page language. */
  inLanguage: string
  photoFor?: (slug: string | null | undefined) => BrandPhotoUrls | undefined
}

const absolute = (baseUrl: string, url: string): string =>
  url.startsWith('/') ? `${baseUrl}${url}` : url

const imageObject = (url: string, contentUrl: string) => ({
  '@type': 'ImageObject',
  url,
  contentUrl,
  thumbnail: url,
})

export const menuItemImage = (
  product: Pick<MenuSchemaProduct, 'id' | 'slug'>,
  { baseUrl, s3BaseUrl, photoFor }: Pick<MenuSchemaInput, 'baseUrl' | 's3BaseUrl' | 'photoFor'>,
) => {
  const photo = photoFor?.(product.slug)
  if (photo) return imageObject(absolute(baseUrl, photo.png), absolute(baseUrl, photo.webp))
  if (!s3BaseUrl || !product.id)
    return imageObject(`${baseUrl}${PRODUCT_IMAGE_FALLBACK}`, `${baseUrl}${PRODUCT_IMAGE_FALLBACK}`)
  return imageObject(
    productImageUrl(s3BaseUrl, product.id, 'png'),
    productImageUrl(s3BaseUrl, product.id, 'webp'),
  )
}

export const buildMenuSchema = (input: MenuSchemaInput) => {
  const { products, menuUrl, name, description, inLanguage } = input
  const sections = new Map<string, { id: string; name: string; items: Record<string, unknown>[] }>()
  for (const product of products) {
    if (!product.category) continue
    if (!sections.has(product.category.id)) {
      sections.set(product.category.id, {
        id: product.category.id,
        name: product.category.name,
        items: [],
      })
    }
    const diets: string[] = []
    if (product.isHalal) diets.push('https://schema.org/HalalDiet')
    if (product.isVegetarian) diets.push('https://schema.org/VegetarianDiet')

    sections.get(product.category.id)!.items.push({
      '@type': 'MenuItem',
      '@id': `${menuUrl}#${product.id}`,
      name: product.name,
      image: menuItemImage(product, input),
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'EUR',
        availability: product.isAvailable
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
      ...(diets.length ? { suitableForDiet: diets } : {}),
    })
  }

  return {
    '@type': 'Menu',
    '@id': `${menuUrl}#menu`,
    url: menuUrl,
    name,
    description,
    inLanguage,
    hasMenuSection: [...sections.values()].map((section) => ({
      '@type': 'MenuSection',
      '@id': `${menuUrl}#section-${section.id}`,
      name: section.name,
      hasMenuItem: section.items,
    })),
  }
}
