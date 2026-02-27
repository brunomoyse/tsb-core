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
        logo: `${config.public.baseUrl}/images/tsb-black-font-400.png`,
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
    ogImage: `${config.public.baseUrl}/images/about-hero.png`,
    twitterCard: 'summary_large_image',
})
</script>

<template>
    <section class="max-w-5xl mx-auto pt-6 sm:pt-8 pb-8 px-4 sm:px-6">

        <!-- Header -->
        <div class="text-center mb-6 sm:mb-8 bento-cell" style="--delay: 0">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900">{{ $t('contact.title') }}</h1>
            <p class="mt-2 text-sm sm:text-base text-gray-500 font-light">{{ $t('contact.subtitle') }}</p>
            <!-- Decorative noren curtain lines -->
            <div class="flex justify-center items-end gap-1.5 mt-3" aria-hidden="true">
                <div class="w-px h-3 bg-red-300/30 rounded-full" />
                <div class="w-px h-5 bg-red-300/40 rounded-full" />
                <div class="w-px h-4 bg-red-300/30 rounded-full" />
                <div class="w-px h-6 bg-red-300/50 rounded-full" />
                <div class="w-px h-4 bg-red-300/30 rounded-full" />
                <div class="w-px h-5 bg-red-300/40 rounded-full" />
                <div class="w-px h-3 bg-red-300/30 rounded-full" />
            </div>
        </div>

        <!-- Bento Grid -->
        <div class="bento-grid">

            <!-- Map — large featured cell -->
            <div class="bento-map bento-cell" style="--delay: 1">
                <div class="relative h-full rounded-2xl overflow-hidden group">
                    <iframe
                        :src="osmEmbedUrl"
                        class="w-full h-full min-h-[280px] sm:min-h-0"
                        title="Tokyo Sushi Bar Location"
                        frameborder="0"
                        allowfullscreen
                        loading="lazy"
                    />
                    <a
                        :href="googleMapsLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white shadow-sm"
                    >
                        {{ $t('contact.viewLargerMap') }}
                        <svg class="w-3 h-3 inline-block ml-1 -mt-px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/></svg>
                    </a>
                </div>
            </div>

            <!-- Opening Hours — tall side cell -->
            <div class="bento-hours bento-cell" style="--delay: 2">
                <div class="bg-tsb-two rounded-2xl p-6 sm:p-7 h-full flex flex-col">
                    <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4">
                        <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <h2 class="font-semibold text-gray-900 text-[15px] mb-5">{{ $t('contact.openingHoursTitle') }}</h2>
                    <div class="space-y-4 text-sm flex-1">
                        <div>
                            <span class="text-gray-500 text-xs uppercase tracking-wider">{{ $t('contact.weekdays') }}</span>
                            <div class="text-gray-900 tabular-nums mt-1 font-medium">12:00 – 14:30</div>
                            <div class="text-gray-900 tabular-nums font-medium">18:00 – 22:30</div>
                        </div>
                        <div>
                            <span class="text-gray-500 text-xs uppercase tracking-wider">{{ $t('contact.weekends') }}</span>
                            <div class="text-gray-900 tabular-nums mt-1 font-medium">12:00 – 15:00</div>
                            <div class="text-gray-900 tabular-nums font-medium">18:00 – 23:00</div>
                        </div>
                    </div>
                    <div class="mt-5 pt-4 border-t border-gray-200/60">
                        <p class="text-red-500/80 text-xs font-medium">{{ $t('contact.closedTuesday') }}</p>
                    </div>
                </div>
            </div>

            <!-- Address -->
            <div class="bento-address bento-cell" style="--delay: 3">
                <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col">
                    <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4">
                        <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/>
                        </svg>
                    </div>
                    <h2 class="font-semibold text-gray-900 text-[15px] mb-2">{{ $t('contact.addressTitle') }}</h2>
                    <p class="text-sm text-gray-600 leading-relaxed flex-1">{{ $t('contact.address') }}</p>
                    <a
                        :href="googleMapsLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-900 hover:text-red-600 transition group/link"
                    >
                        {{ $t('contact.viewLargerMap') }}
                        <svg class="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </a>
                </div>
            </div>

            <!-- Phone -->
            <div class="bento-phone bento-cell" style="--delay: 4">
                <a href="tel:+32422298888" class="block h-full">
                    <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col hover:bg-tsb-four/40 transition-colors duration-300">
                        <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4">
                            <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                            </svg>
                        </div>
                        <h2 class="font-semibold text-gray-900 text-[15px] mb-1">{{ $t('contact.phoneTitle') }}</h2>
                        <span class="text-sm text-gray-600 tabular-nums">+32 4 222 98 88</span>
                    </div>
                </a>
            </div>

            <!-- Email -->
            <div class="bento-email bento-cell" style="--delay: 5">
                <a href="mailto:tokyosushibar888@gmail.com" class="block h-full">
                    <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col hover:bg-tsb-four/40 transition-colors duration-300">
                        <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4">
                            <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                            </svg>
                        </div>
                        <h2 class="font-semibold text-gray-900 text-[15px] mb-1">{{ $t('contact.emailTitle') }}</h2>
                        <span class="text-sm text-gray-600 break-all">tokyosushibar888@gmail.com</span>
                    </div>
                </a>
            </div>

            <!-- Social Media -->
            <div class="bento-social bento-cell" style="--delay: 6">
                <div class="bg-tsb-two rounded-2xl p-6 h-full flex items-center justify-between gap-4">
                    <h2 class="font-semibold text-gray-900 text-[15px]">{{ $t('contact.followUs', 'Follow Us') }}</h2>
                    <div class="flex items-center gap-4">
                        <a
                            href="https://www.instagram.com/tokyo_sushi_bar_liege/"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-tsb-four transition-colors duration-300"
                        >
                            <img src="/icons/instagram-icon.svg" alt="Instagram" class="w-5 h-5"/>
                        </a>
                        <a
                            href="https://www.facebook.com/sushiliege"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-tsb-four transition-colors duration-300"
                        >
                            <img src="/icons/facebook-icon.svg" alt="Facebook" class="w-5 h-5"/>
                        </a>
                    </div>
                </div>
            </div>

        </div>
    </section>
</template>

<style scoped>
/* ── Bento Grid ── */
.bento-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
}

/* Named grid areas — mobile (stacked) */
.bento-map { grid-area: map; }
.bento-hours { grid-area: hours; }
.bento-address { grid-area: address; }
.bento-phone { grid-area: phone; }
.bento-email { grid-area: email; }
.bento-social { grid-area: social; }

.bento-grid {
    grid-template-areas:
        "map"
        "hours"
        "address"
        "phone"
        "email"
        "social";
}

/* Tablet: 2 columns */
@media (min-width: 640px) {
    .bento-grid {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto auto;
        grid-template-areas:
            "map     hours"
            "address phone"
            "email   social";
    }

    .bento-map iframe {
        min-height: 100%;
    }
}

/* Desktop: 3 columns, asymmetric */
@media (min-width: 1024px) {
    .bento-grid {
        grid-template-columns: 1.2fr 0.8fr 1fr;
        grid-template-rows: auto auto;
        grid-template-areas:
            "map     map     hours"
            "address phone   email"
            "social  social  social";
    }

    .bento-map iframe {
        min-height: 320px;
    }
}

/* ── Staggered entrance ── */
.bento-cell {
    animation: bento-enter 0.5s ease-out both;
    animation-delay: calc(var(--delay, 0) * 80ms);
}

@keyframes bento-enter {
    from {
        opacity: 0;
        transform: translateY(16px) scale(0.97);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .bento-cell {
        animation: none;
    }
}
</style>
