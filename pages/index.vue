<script setup lang="ts">
definePageMeta({
    sitemap: { priority: 1, changefreq: 'daily' },
})

const config = useRuntimeConfig()
const { t } = useI18n()

const yearsSince = new Date().getFullYear() - 2016

useSchemaOrg([
    defineWebSite({
        name: t('schema.siteName'),
        description: t('schema.siteDescription'),
        potentialAction: {
            '@type': 'SearchAction',
            'target': {
                '@type': 'EntryPoint',
                'urlTemplate': `${config.public.baseUrl}/menu?q={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
        }
    }),
    defineWebPage({
        '@type': 'WebPage',
        name: t('schema.home.title'),
        description: t('schema.home.description')
    })
])

useSeoMeta({
    title: t('schema.home.title'),
    ogTitle: t('schema.home.title'),
    description: t('schema.home.description'),
    ogDescription: t('schema.home.description'),
    ogImage: `${config.public.baseUrl}/images/restaurant-illustrated.png`,
    twitterCard: 'summary_large_image',
})
</script>

<template>
    <section class="max-w-5xl mx-auto pt-6 sm:pt-8 space-y-5">

        <!-- Hero -->
        <div class="relative h-72 sm:h-96 overflow-hidden rounded-2xl">
            <picture>
                <source srcset="/images/restaurant-illustrated.avif" type="image/avif" />
                <source srcset="/images/restaurant-illustrated.webp" type="image/webp" />
                <img
                    alt="Tokyo Sushi Bar Restaurant"
                    class="absolute inset-0 w-full h-full object-cover"
                    src="/images/restaurant-illustrated.png"
                    width="1200"
                    height="805"
                />
            </picture>
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div class="absolute inset-0 flex flex-col items-center justify-end pb-8 sm:pb-10 text-center text-white px-6">
                <h1 class="font-channel text-4xl sm:text-6xl tracking-wide drop-shadow-lg">Tokyo</h1>
                <p class="mt-4 text-sm sm:text-base text-white/90 font-light drop-shadow-md">{{ $t('about.heroSubtitle') }}</p>
                <NuxtLinkLocale
                    to="/menu"
                    class="mt-5 inline-flex items-center gap-2 bg-white text-gray-900 py-2 px-6 rounded-full text-sm font-semibold hover:bg-white/90 transition shadow-lg"
                >
                    {{ $t('about.heroButton') }}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </NuxtLinkLocale>
            </div>
        </div>

        <!-- Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="bg-tsb-two rounded-2xl p-5 text-center">
                <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <!-- Moped icon (Tabler Icons, same as OrdersWidget) -->
                    <svg aria-hidden="true" class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 16v1a2 2 0 0 0 4 0v-5h-3a3 3 0 0 0 -3 3v1h10a6 6 0 0 1 5 -4v-5a2 2 0 0 0 -2 -2h-1"/><path d="M6 9l3 0"/></svg>
                </div>
                <h3 class="font-semibold text-gray-900 mb-1 text-[15px]">{{ $t('about.infoCards.freeDelivery') }}</h3>
                <p class="text-gray-600 text-sm leading-relaxed">{{ $t('about.infoCards.freeDeliveryDesc') }}</p>
            </div>
            <div class="bg-tsb-two rounded-2xl p-5 text-center">
                <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <!-- Shopping bag icon (Heroicons, same as OrdersWidget) -->
                    <svg aria-hidden="true" class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
                </div>
                <h3 class="font-semibold text-gray-900 mb-1 text-[15px]">{{ $t('about.infoCards.takeawayDiscount') }}</h3>
                <p class="text-gray-600 text-sm leading-relaxed">{{ $t('about.infoCards.takeawayDiscountDesc') }}</p>
            </div>
            <div class="bg-tsb-two rounded-2xl p-5 text-center">
                <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <!-- Fish icon (Tabler Icons) -->
                    <svg aria-hidden="true" class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571"/><path d="M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504"/><path d="M18 11v.01"/><path d="M11.5 10.5c-.667 1 -.667 2 0 3"/></svg>
                </div>
                <h3 class="font-semibold text-gray-900 mb-1 text-[15px]">{{ $t('about.infoCards.freshDaily') }}</h3>
                <p class="text-gray-600 text-sm leading-relaxed">{{ $t('about.infoCards.freshDailyDesc') }}</p>
            </div>
        </div>

        <!-- Our Story -->
        <div class="bg-tsb-two rounded-2xl relative overflow-hidden">
            <!-- Decorative blurred background accents -->
            <div class="absolute -top-24 -right-24 w-80 h-80 bg-tsb-four/40 rounded-full blur-3xl pointer-events-none" />
            <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-tsb-four/30 rounded-full blur-3xl pointer-events-none" />
            <!-- Subtle kanji watermark: 物語 (story) -->
            <span class="absolute top-6 right-6 sm:top-8 sm:right-10 font-channel text-[80px] sm:text-[120px] text-red-200/[0.07] leading-none select-none pointer-events-none" aria-hidden="true">物語</span>

            <div class="relative px-8 sm:px-12 py-10 sm:py-14">
                <!-- Title -->
                <h2 class="text-2xl sm:text-3xl font-bold text-center">
                    {{ $t('about.ourStoryTitle') }}
                </h2>
                <!-- Decorative chopsticks divider -->
                <div class="flex justify-center items-center mt-3 mb-10 sm:mb-14" aria-hidden="true">
                    <svg class="w-16 h-5 text-red-400/40" viewBox="0 0 80 20" fill="none">
                        <line x1="5" y1="18" x2="38" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <line x1="42" y1="2" x2="75" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <circle cx="40" cy="2" r="1.5" fill="currentColor" opacity="0.6"/>
                    </svg>
                </div>

                <div class="max-w-2xl mx-auto">
                    <!-- Chapter 1: 2016 -->
                    <div class="mb-8 sm:mb-10">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="h-px flex-1 bg-gradient-to-r from-transparent to-red-200/50" />
                            <span class="font-channel text-3xl sm:text-4xl text-red-400/30 leading-none shrink-0">2016</span>
                            <div class="h-px flex-1 bg-gradient-to-l from-transparent to-red-200/50" />
                        </div>
                        <p class="text-gray-600 leading-relaxed text-[15px] text-center">
                            {{ $t('about.ourStoryText1') }}
                        </p>
                    </div>

                    <!-- Chapter 2: 2024 -->
                    <div class="mb-8 sm:mb-10">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="h-px flex-1 bg-gradient-to-r from-transparent to-red-200/50" />
                            <span class="font-channel text-3xl sm:text-4xl text-red-400/30 leading-none shrink-0">2024</span>
                            <div class="h-px flex-1 bg-gradient-to-l from-transparent to-red-200/50" />
                        </div>
                        <p class="text-gray-600 leading-relaxed text-[15px] text-center">
                            {{ $t('about.ourStoryText2') }}
                        </p>
                    </div>

                    <!-- Chapter 3: 2026 - Anniversary -->
                    <div>
                        <div class="flex items-center gap-4 mb-4">
                            <div class="h-px flex-1 bg-gradient-to-r from-transparent to-red-200/50" />
                            <span class="font-channel text-3xl sm:text-4xl text-red-400/30 leading-none shrink-0">2026</span>
                            <div class="h-px flex-1 bg-gradient-to-l from-transparent to-red-200/50" />
                        </div>
                        <p class="text-gray-600 leading-relaxed text-[15px] text-center mb-5">
                            {{ $t('about.ourStoryText3') }}
                        </p>
                        <!-- Years counter -->
                        <div class="flex justify-center">
                            <div class="bg-white/60 backdrop-blur-sm rounded-xl px-8 py-5 text-center shadow-sm">
                                <span class="font-channel text-5xl sm:text-6xl text-red-500/70 block leading-none">{{ yearsSince }}</span>
                                <span class="text-gray-600 text-xs tracking-widest uppercase mt-2 block">{{ $t('about.yearsOfPassion') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Visit Us -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <!-- Opening Hours -->
            <div class="bg-tsb-two rounded-2xl p-6 sm:p-8">
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-[15px]">
                    <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ $t('about.openingHoursLabel') }}
                </h3>
                <div class="space-y-2.5 text-sm text-gray-600">
                    <div class="flex justify-between gap-4">
                        <span>{{ $t('contact.weekdays') }}</span>
                        <span class="text-gray-900 tabular-nums">12h-14h30 / 18h-22h30</span>
                    </div>
                    <div class="flex justify-between gap-4">
                        <span>{{ $t('contact.weekends') }}</span>
                        <span class="text-gray-900 tabular-nums">12h-15h / 18h-23h</span>
                    </div>
                    <p class="text-red-500 text-xs pt-1">{{ $t('contact.closedTuesday') }}</p>
                </div>
            </div>
            <!-- Address -->
            <div class="bg-tsb-two rounded-2xl p-6 sm:p-8">
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-[15px]">
                    <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg>
                    {{ $t('contact.addressTitle') }}
                </h3>
                <p class="text-sm text-gray-600 mb-4">{{ $t('contact.address') }}</p>
                <NuxtLinkLocale
                    to="/contact"
                    class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-gray-600 transition underline underline-offset-2"
                >
                    {{ $t('about.contactLink') }}
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </NuxtLinkLocale>
            </div>
        </div>

    </section>
</template>
