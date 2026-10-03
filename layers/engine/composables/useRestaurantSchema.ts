import { type OpeningHoursByDay, buildRestaurantSchema } from '../utils/restaurantSchema'
import { useAppConfig, useHead, useRuntimeConfig } from '#imports'
import type { BrandConfig } from '../types/brand'
import { useI18n } from 'vue-i18n'

/**
 * The schema.org Restaurant JSON-LD of the whole site (audit PR 3.8, P8), called once from each brand's layout with
 * the opening hours of the restaurantConfig the layout already has (so no second request or subscription).
 *
 * It was a plugin that could not know the opening hours, so it hard-coded Tokyo Sushi Bar's for both brands. The hours
 * are the live ones; brand.ts is the fallback while they are not there (the API is down).
 */
export function useRestaurantSchema(openingHours: () => OpeningHoursByDay | null | undefined) {
  const config = useRuntimeConfig()
  const { brand } = useAppConfig() as { brand: BrandConfig }
  const { locale } = useI18n()

  useHead(() => ({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(
          buildRestaurantSchema({
            brand,
            baseUrl: (config.public.baseUrl as string).replace(/\/$/u, ''),
            locale: locale.value,
            openingHours: openingHours(),
          }),
        ),
        tagPosition: 'head',
        key: 'tsb-jsonld',
      },
    ],
  }))
}
