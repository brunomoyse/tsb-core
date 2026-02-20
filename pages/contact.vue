<template>
    <section class="max-w-5xl mx-auto p-6 pt-8 space-y-12">
        <!-- Header -->
        <div class="text-center space-y-2">
            <h1 class="text-4xl font-bold">{{ $t('contact.title') }}</h1>
            <p class="text-lg text-gray-600">{{ $t('contact.subtitle') }}</p>
        </div>

        <!-- Two-column grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

            <!-- Left column: Map + Hours + Social -->
            <div class="space-y-6">

                <!-- Map -->
                <div class="rounded-lg overflow-hidden shadow-lg">
                    <iframe
                        :src="osmEmbedUrl"
                        class="w-full h-96"
                        title="Tokyo Sushi Bar Location"
                        frameborder="0"
                        allowfullscreen
                        loading="lazy">
                    </iframe>
                    <div class="p-2 text-right text-sm bg-gray-50">
                        <a
                            :href="googleMapsLink"
                            class="text-blue-500 hover:underline"
                            target="_blank"
                            rel="noopener">
                            {{ $t('contact.viewLargerMap') }}
                        </a>
                    </div>
                </div>

                <!-- Social Media -->
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <h2 class="font-semibold mb-3">{{ $t('contact.followUs', 'Follow Us') }}</h2>
                    <div class="flex justify-center space-x-6">
                        <a
                            href="https://www.instagram.com/tokyo_sushi_bar_liege/"
                            target="_blank"
                            rel="noopener"
                            class="transform hover:scale-110 transition">
                            <img src="/icons/instagram-icon.svg" alt="Instagram" class="w-8 h-8"/>
                        </a>
                        <a
                            href="https://www.facebook.com/sushiliege"
                            target="_blank"
                            rel="noopener"
                            class="transform hover:scale-110 transition">
                            <img src="/icons/facebook-icon.svg" alt="Facebook" class="w-8 h-8"/>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Right column: Address + Phone + Email -->
            <div class="space-y-6">

                <!-- Opening Hours -->
                <div class="flex items-start space-x-4 bg-white p-4 rounded-lg shadow">
                    <span class="text-3xl">🕒</span>
                    <div class="flex-1">
                        <h2 class="font-semibold mb-2">{{ $t('contact.openingHoursTitle') }}</h2>
                        <dl class="text-gray-700 leading-relaxed">
                            <div>
                                <dt class="font-medium">{{ $t('contact.weekdays') }}</dt>
                                <dd>12:00 – 14:30 | 18:00 – 22:30</dd>
                            </div>
                            <div class="mt-1">
                                <dt class="font-medium">{{ $t('contact.weekends') }}</dt>
                                <dd>12:00 – 15:00 | 18:00 – 23:00</dd>
                            </div>
                            <div class="mt-1">
                                <dt class="font-medium">{{ $t('contact.closedTuesday') }}</dt>
                            </div>
                        </dl>
                    </div>
                </div>

                <!-- Address -->
                <div class="flex items-start space-x-4 bg-white p-4 rounded-lg shadow">
                    <span class="text-3xl">📌</span>
                    <div class="flex-1">
                        <h2 class="font-semibold">{{ $t('contact.addressTitle') }}</h2>
                        <a
                            :href="googleMapsLink"
                            class="text-blue-500 hover:underline"
                            target="_blank"
                            rel="noopener">
                            {{ $t('contact.address') }}
                        </a>
                    </div>
                </div>

                <!-- Phone -->
                <div class="flex items-start space-x-4 bg-white p-4 rounded-lg shadow">
                    <span class="text-3xl">📞</span>
                    <div class="flex-1">
                        <h2 class="font-semibold">{{ $t('contact.phoneTitle') }}</h2>
                        <a
                            href="tel:+32422298888"
                            class="text-blue-500 hover:underline">
                            +32 4 222 98 88
                        </a>
                    </div>
                </div>

                <!-- Email -->
                <div class="flex items-start space-x-4 bg-white p-4 rounded-lg shadow">
                    <span class="text-3xl">✉️</span>
                    <div class="flex-1">
                        <h2 class="font-semibold">{{ $t('contact.emailTitle') }}</h2>
                        <a
                            href="mailto:tokyosushibar888@gmail.com"
                            class="text-blue-500 hover:underline">
                            tokyosushibar888@gmail.com
                        </a>
                    </div>
                </div>

            </div>
        </div>
    </section>
</template>

<script setup>
const latitude = 50.642394;
const longitude = 5.574711;
const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.001},${latitude - 0.001},${longitude + 0.001},${latitude + 0.001}&layer=mapnik&marker=${latitude},${longitude}`;
const googleMapsLink = `https://maps.app.goo.gl/XFqBuvzaAPzev7Tn7`;

// Schema.org structured data
const config = useRuntimeConfig()
const { t } = useI18n()

useSchemaOrg([
    defineWebPage({
        '@type': 'ContactPage',
        name: t('schema.contact.title'),
        description: t('schema.contact.description')
    }),
    {
        '@type': 'Restaurant',
        name: t('schema.restaurantName'),
        url: config.public.baseUrl,
        logo: `${config.public.baseUrl}/images/tsb-logo-b.png`,
        image: `${config.public.baseUrl}/images/about-hero.png`,
        telephone: '+32 4 222 98 88',
        email: 'tokyosushibar888@gmail.com',
        servesCuisine: [t('schema.cuisine')],
        priceRange: '€€',
        acceptsReservations: false,
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'Rue de la Cathédrale 59',
            addressLocality: 'Liège',
            postalCode: '4000',
            addressCountry: 'BE'
        },
        geo: {
            '@type': 'GeoCoordinates',
            latitude: latitude,
            longitude: longitude
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
        ],
        sameAs: [
            'https://www.instagram.com/tokyo_sushi_bar_liege/',
            'https://www.facebook.com/sushiliege'
        ]
    },
    {
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: t('schema.breadcrumb.home'),
                item: config.public.baseUrl
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: t('schema.breadcrumb.contact'),
                item: `${config.public.baseUrl}/contact`
            }
        ]
    }
])

useSeoMeta({
    title: t('schema.contact.title'),
    ogTitle: t('schema.contact.title'),
    description: t('schema.contact.description'),
    ogDescription: t('schema.contact.description'),
    ogImage: config.public.baseUrl + '/images/about-hero.png',
    twitterCard: 'summary_large_image',
})
</script>

<style scoped>
table {
    border-collapse: collapse;
}

th, td {
    border: 1px solid #e5e7eb; /* Tailwind gray-200 */
}
</style>
