<script setup>
definePageMeta({
    sitemap: { priority: 0.7, changefreq: 'monthly' },
})

const config = useRuntimeConfig()
const { t } = useI18n()
const { brand } = useAppConfig()

const latitude = brand.geo.lat;
const longitude = brand.geo.lng;
const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.001},${latitude - 0.001},${longitude + 0.001},${latitude + 0.001}&layer=mapnik&marker=${latitude},${longitude}`;
const googleMapsLink = brand.mapsUrl;

useJsonLd([
    {
        '@type': 'ContactPage',
        name: t('schema.contact.title'),
        description: t('schema.contact.description'),
    },
    breadcrumbList([
        { name: t('schema.breadcrumb.home'), item: `${config.public.baseUrl}/` },
        { name: t('schema.breadcrumb.contact'), item: `${config.public.baseUrl}/contact` },
    ]),
], 'page-jsonld')

useSeoMeta({
    title: t('schema.contact.title'),
    ogType: 'website',
    ogTitle: t('schema.contact.title'),
    description: t('schema.contact.description'),
    ogDescription: t('schema.contact.description'),
    ogImage: `${config.public.baseUrl}/images/about-hero.png`,
    twitterCard: 'summary_large_image',
    ...useLocaleSeoMeta(),
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
                        :title="`${brand.name} Location`"
                        frameborder="0"
                        allowfullscreen
                        loading="lazy"
                    />
                    <a
                        :href="googleMapsLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="absolute bottom-3 right-3 inline-flex min-h-11 items-center bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                        {{ $t('contact.viewLargerMap') }}
                        <svg class="w-3 h-3 inline-block ml-1 -mt-px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/></svg>
                    </a>
                </div>
            </div>

            <!-- Opening Hours — shared with homepage -->
            <div class="bento-hours bento-cell" style="--delay: 2">
                <OpeningHoursCard as="h2" />
            </div>

            <!-- Address -->
            <div class="bento-address bento-cell" style="--delay: 3">
                <div class="bg-tsb-two rounded-2xl p-6 sm:p-8 h-full flex flex-col">
                    <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-[15px]">
                        <svg aria-hidden="true" class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg>
                        {{ $t('contact.addressTitle') }}
                    </h2>
                    <p class="text-sm text-gray-600 leading-relaxed flex-1">{{ $t('contact.address') }}</p>
                    <a
                        :href="googleMapsLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mt-4 inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-gray-900 hover:text-red-600 transition group/link rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                        {{ $t('contact.viewLargerMap') }}
                        <svg class="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </a>
                </div>
            </div>

            <!-- Phone -->
            <div class="bento-phone bento-cell" style="--delay: 4">
                <a :href="`tel:${brand.phone.replace(/\s/gu, '')}`" class="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                    <div class="bg-tsb-two rounded-2xl p-6 sm:p-8 h-full flex flex-col hover:bg-tsb-four/40 transition-colors duration-300">
                        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-[15px]">
                            <svg aria-hidden="true" class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
                            {{ $t('contact.phoneTitle') }}
                        </h2>
                        <span class="text-sm text-gray-600 tabular-nums">{{ brand.phone }}</span>
                    </div>
                </a>
            </div>

            <!-- Email -->
            <div class="bento-email bento-cell" style="--delay: 5">
                <a :href="`mailto:${brand.email}`" class="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                    <div class="bg-tsb-two rounded-2xl p-6 sm:p-8 h-full flex flex-col hover:bg-tsb-four/40 transition-colors duration-300">
                        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-[15px]">
                            <svg aria-hidden="true" class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                            {{ $t('contact.emailTitle') }}
                        </h2>
                        <span class="text-sm text-gray-600 break-all">{{ brand.email }}</span>
                        <p class="mt-4 flex items-start gap-2 text-xs leading-relaxed text-amber-700">
                            <svg aria-hidden="true" class="w-4 h-4 shrink-0 mt-px" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                            <span>{{ $t('contact.reservationNotice') }}</span>
                        </p>
                    </div>
                </a>
            </div>

            <!-- Social Media -->
            <div class="bento-social bento-cell" style="--delay: 6">
                <div class="bg-tsb-two rounded-2xl p-6 sm:p-8 h-full flex items-center justify-between gap-4 flex-wrap">
                    <h2 class="font-semibold text-gray-900 text-[15px]">{{ $t('contact.followUs', 'Follow Us') }}</h2>
                    <div class="flex items-center gap-3">
                        <a
                            :href="brand.socials.instagram"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            class="w-11 h-11 rounded-full bg-white flex items-center justify-center hover:bg-tsb-four transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        >
                            <img src="/icons/instagram-icon.svg" alt="" aria-hidden="true" class="w-5 h-5"/>
                        </a>
                        <a
                            :href="brand.socials.facebook"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            class="w-11 h-11 rounded-full bg-white flex items-center justify-center hover:bg-tsb-four transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        >
                            <img src="/icons/facebook-icon.svg" alt="" aria-hidden="true" class="w-5 h-5"/>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Feedback Form -->
            <div class="bento-feedback bento-cell" style="--delay: 7">
                <ContactFeedbackForm />
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
.bento-feedback { grid-area: feedback; }

.bento-grid {
    grid-template-areas:
        "map"
        "hours"
        "address"
        "phone"
        "email"
        "social"
        "feedback";
}

/* Tablet: 2 columns */
@media (min-width: 640px) {
    .bento-grid {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto auto auto;
        grid-template-areas:
            "map      hours"
            "address  phone"
            "email    social"
            "feedback feedback";
    }

    .bento-map iframe {
        min-height: 100%;
    }
}

/* Desktop: 3 columns, asymmetric */
@media (min-width: 1024px) {
    .bento-grid {
        grid-template-columns: 1.2fr 0.8fr 1fr;
        grid-template-rows: auto auto auto auto;
        grid-template-areas:
            "map      map      hours"
            "address  phone    email"
            "social   social   social"
            "feedback feedback feedback";
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
