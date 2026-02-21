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
    ogImage: config.public.baseUrl + '/images/about-hero.png',
    twitterCard: 'summary_large_image',
})
</script>

<template>
    <section class="max-w-5xl mx-auto p-6 pt-9 space-y-16">
        <!-- Hero Section -->
        <div class="relative h-64 sm:h-96 overflow-hidden rounded-lg shadow-lg">
            <img alt="Tokyo Sushi Bar" class="absolute inset-0 w-full h-full object-cover"
                 src="/images/about-hero.png"/>
            <div
                class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center text-white px-4">
                <h1 class="text-4xl font-bold">{{ $t('about.heroTitle') }}</h1>
                <p class="mt-4 text-lg">{{ $t('about.heroSubtitle') }}</p>
                <NuxtLinkLocale
                    to="/menu"
                    class="mt-6 inline-block bg-white/20 backdrop-blur-sm text-white border border-white/40 py-2.5 px-6 rounded-md text-lg font-semibold hover:bg-white/30 transition"
                >
                    {{ $t('about.heroButton') }}
                </NuxtLinkLocale>
            </div>
        </div>

        <!-- Our Story Section -->
        <div class="px-4 max-w-3xl mx-auto">
            <h2 class="text-3xl font-bold text-center mb-6">{{ $t('about.ourStoryTitle') }}</h2>
            <p class="text-gray-700 leading-relaxed mb-4">
                {{ $t('about.ourStoryText1') }}
            </p>
            <p class="text-gray-700 leading-relaxed">
                {{ $t('about.ourStoryText2') }}
            </p>
        </div>

        <!-- Info Cards Section -->
        <div class="px-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div class="bg-white rounded-lg shadow p-6 text-center">
                    <h3 class="font-semibold text-lg mb-2">{{ $t('about.infoCards.freeDelivery') }}</h3>
                    <p class="text-gray-600 text-sm">{{ $t('about.infoCards.freeDeliveryDesc') }}</p>
                </div>
                <div class="bg-white rounded-lg shadow p-6 text-center">
                    <h3 class="font-semibold text-lg mb-2">{{ $t('about.infoCards.takeawayDiscount') }}</h3>
                    <p class="text-gray-600 text-sm">{{ $t('about.infoCards.takeawayDiscountDesc') }}</p>
                </div>
                <div class="bg-white rounded-lg shadow p-6 text-center">
                    <h3 class="font-semibold text-lg mb-2">{{ $t('about.infoCards.freshDaily') }}</h3>
                    <p class="text-gray-600 text-sm">{{ $t('about.infoCards.freshDailyDesc') }}</p>
                </div>
            </div>
        </div>

        <!-- Meet the Team Section -->
        <div class="px-4">
            <h2 class="text-3xl font-bold text-center mb-6">{{ $t('about.meetTheTeamTitle') }}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 max-w-2xl mx-auto">
                <div class="flex flex-col items-center">
                    <img alt="Chef Zhu Mengmeng" class="w-32 h-32 rounded-full object-cover shadow-md"
                         src="/images/chef.png"/>
                    <h3 class="mt-4 font-semibold text-center">{{ $t('about.chefName') }}</h3>
                    <p class="text-gray-600 text-center">{{ $t('about.chefRole') }}</p>
                </div>
                <div class="flex flex-col items-center">
                    <img alt="Xu Sa" class="w-32 h-32 rounded-full object-cover shadow-md" src="/images/waitress.png"/>
                    <h3 class="mt-4 font-semibold text-center">{{ $t('about.waitressName') }}</h3>
                    <p class="text-gray-600 text-center">{{ $t('about.waitressRole') }}</p>
                </div>
            </div>
        </div>
    </section>
</template>
