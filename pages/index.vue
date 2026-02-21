<script setup lang="ts">
const config = useRuntimeConfig()
const { t } = useI18n()

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
    ogImage: config.public.baseUrl + '/images/restaurant.jpg',
    twitterCard: 'summary_large_image',
})
</script>

<template>
    <section class="max-w-5xl mx-auto pt-6 sm:pt-8 space-y-5">

        <!-- Hero -->
        <div class="relative h-72 sm:h-96 overflow-hidden rounded-2xl">
            <img
                alt="Tokyo Sushi Bar Restaurant"
                class="absolute inset-0 w-full h-full object-cover"
                src="/images/restaurant.jpg"
            />
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
                    <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h17.25M3.375 14.25L6 3.75h12l2.625 10.5"/></svg>
                </div>
                <h3 class="font-semibold text-gray-900 mb-1 text-[15px]">{{ $t('about.infoCards.freeDelivery') }}</h3>
                <p class="text-gray-500 text-sm leading-relaxed">{{ $t('about.infoCards.freeDeliveryDesc') }}</p>
            </div>
            <div class="bg-tsb-two rounded-2xl p-5 text-center">
                <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z"/></svg>
                </div>
                <h3 class="font-semibold text-gray-900 mb-1 text-[15px]">{{ $t('about.infoCards.takeawayDiscount') }}</h3>
                <p class="text-gray-500 text-sm leading-relaxed">{{ $t('about.infoCards.takeawayDiscountDesc') }}</p>
            </div>
            <div class="bg-tsb-two rounded-2xl p-5 text-center">
                <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>
                </div>
                <h3 class="font-semibold text-gray-900 mb-1 text-[15px]">{{ $t('about.infoCards.freshDaily') }}</h3>
                <p class="text-gray-500 text-sm leading-relaxed">{{ $t('about.infoCards.freshDailyDesc') }}</p>
            </div>
        </div>

        <!-- Our Story -->
        <div class="bg-tsb-two rounded-2xl p-8 sm:p-10">
            <h2 class="text-2xl sm:text-3xl font-bold text-center mb-6">{{ $t('about.ourStoryTitle') }}</h2>
            <div class="max-w-2xl mx-auto space-y-4 text-gray-600 leading-relaxed text-[15px] text-center">
                <p>{{ $t('about.ourStoryText1') }}</p>
                <p>{{ $t('about.ourStoryText2') }}</p>
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
