import { defineNuxtPlugin, useHead, useRuntimeConfig, useAppConfig } from '#imports'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const baseUrl = config.public.baseUrl as string
    const { brand } = useAppConfig()

    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Offer',
                '@id': `${baseUrl}#pickup-discount`,
                name: '10% Pickup Discount',
                description: 'Get 10% off on all discountable items when you choose pickup',
                discount: '10%',
                availableAtOrFrom: {
                    '@type': 'Restaurant',
                    name: brand.name,
                },
                validFrom: '2024-01-01',
                priceSpecification: {
                    '@type': 'UnitPriceSpecification',
                    priceCurrency: 'EUR',
                    price: 0,
                    referenceQuantity: {
                        '@type': 'QuantitativeValue',
                        value: 1,
                    },
                },
            },
            {
                '@type': 'Restaurant',
                '@id': `${baseUrl}#restaurant`,
                name: brand.name,
                image: `${baseUrl}/logo.png`,
                telephone: brand.phone.replace(/\s/gu, ''),
                email: brand.email,
                makesOffer: {
                    '@type': 'Offer',
                    name: '10% Pickup Discount',
                    description: 'Get 10% off on all discountable items when you choose pickup',
                    discount: '10%',
                },
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: brand.address.street,
                    addressLocality: brand.address.city,
                    addressRegion: brand.address.region,
                    postalCode: brand.address.postal,
                    addressCountry: brand.address.country,
                },
                geo: {
                    '@type': 'GeoCoordinates',
                    latitude: brand.geo.lat,
                    longitude: brand.geo.lng,
                },
                url: baseUrl,
                sameAs: [
                    brand.socials.instagram,
                    brand.socials.facebook,
                ],
                servesCuisine: brand.cuisine,
                priceRange: brand.priceRange,
                acceptsReservations: true,
                hasMenu: {
                    '@type': 'Menu',
                    '@id': `${baseUrl}/menu#menu`,
                    name: `${brand.name} Menu`,
                    description: 'Our menu of fresh sushi, sashimi, and authentic Japanese cuisine',
                    inLanguage: ['fr-BE', 'en-US', 'zh-CN', 'nl-BE'],
                },
                aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: brand.rating.value,
                    reviewCount: brand.rating.count,
                    bestRating: 5,
                    worstRating: 1,
                },
                openingHoursSpecification: [
                    {
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: ['Monday', 'Wednesday', 'Thursday', 'Friday'],
                        opens: '12:00',
                        closes: '14:30',
                    },
                    {
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: ['Monday', 'Wednesday', 'Thursday', 'Friday'],
                        opens: '18:00',
                        closes: '22:30',
                    },
                    {
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: ['Saturday', 'Sunday'],
                        opens: '12:00',
                        closes: '15:00',
                    },
                    {
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: ['Saturday', 'Sunday'],
                        opens: '18:00',
                        closes: '23:00',
                    },
                ],
            },
        ],
    }

    useHead({
        script: [
            {
                type: 'application/ld+json',
                innerHTML: JSON.stringify(schema),
                tagPosition: 'head',
                key: 'tsb-jsonld',
            },
        ],
    })
})
