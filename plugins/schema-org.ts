export default defineNuxtPlugin(() => {
    useSchemaOrg([
        defineOrganization({
            name: 'Tokyo Sushi Bar',
            logo: '/logo.png',
            url: useRuntimeConfig().public.baseUrl,
            sameAs: [
                'https://www.instagram.com/tokyo_sushi_bar_liege/',
                'https://www.facebook.com/sushiliege'
            ]
        }),
        defineLocalBusiness({
            '@type': 'Restaurant',
            name: 'Tokyo Sushi Bar',
            image: '/logo.png',
            telephone: '+3242229888',
            email: 'tokyosushibar888@gmail.com',
            address: {
                '@type': 'PostalAddress',
                streetAddress: 'Rue de la Cathédrale 59',
                addressLocality: 'Liège',
                addressRegion: 'Wallonie',
                postalCode: '4000',
                addressCountry: 'BE'
            },
            geo: {
                '@type': 'GeoCoordinates',
                latitude: 50.642394,
                longitude: 5.574711
            },
            url: useRuntimeConfig().public.baseUrl,
            servesCuisine: 'Japanese',
            priceRange: '$$',
            acceptsReservations: true,
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: 4.7,
                reviewCount: 248,
                bestRating: 5,
                worstRating: 1
            },
            openingHoursSpecification: [
                {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: ['Monday', 'Wednesday', 'Thursday', 'Friday'],
                    opens: '12:00',
                    closes: '14:30'
                },
                {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: ['Monday', 'Wednesday', 'Thursday', 'Friday'],
                    opens: '18:00',
                    closes: '22:30'
                },
                {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: ['Saturday', 'Sunday'],
                    opens: '12:00',
                    closes: '15:00'
                },
                {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: ['Saturday', 'Sunday'],
                    opens: '18:00',
                    closes: '23:00'
                }
            ]
        })
    ])
})
