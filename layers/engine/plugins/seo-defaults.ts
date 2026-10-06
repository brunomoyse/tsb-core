import { OG_IMAGE_HEIGHT, OG_IMAGE_PATH, OG_IMAGE_WIDTH } from '../utils/seoDefaults'
import { defineNuxtPlugin, useAppConfig, useRuntimeConfig, useSeoMeta } from '#imports'

/*
 * Share-card defaults for every page (audit PR 3.8, P6): the brand's 1200x630 image with its dimensions and alt, the
 * site name and the large-image Twitter/X card. Pages only set what is theirs (title, description, a real
 * page-specific image with its own size); a page that sets og:image replaces this one.
 */
export default defineNuxtPlugin(() => {
  const baseUrl = (useRuntimeConfig().public.baseUrl as string).replace(/\/$/u, '')
  const { brand } = useAppConfig()
  const image = `${baseUrl}${OG_IMAGE_PATH}`
  const alt = `${brand.name}, ${brand.address.city}`

  useSeoMeta({
    ogSiteName: brand.name,
    ogImage: image,
    ogImageType: 'image/jpeg',
    ogImageWidth: OG_IMAGE_WIDTH,
    ogImageHeight: OG_IMAGE_HEIGHT,
    ogImageAlt: alt,
    // oxlint-disable typescript/no-deprecated -- unhead's successors (ogImage...) do not render the twitter:* tags: these three keep the tags this page has always had.
    twitterCard: 'summary_large_image',
    twitterImage: image,
    twitterImageAlt: alt,
    // oxlint-enable typescript/no-deprecated
  })
})
