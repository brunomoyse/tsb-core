<script setup lang="ts">
// The malatang concept: 4 steps, the grass-bone broth story, and the concept
// FAQ. Ported from the ygfliege.be Vike site.
definePageMeta({
    public: true,
    sitemap: { priority: 0.8, changefreq: 'monthly' },
})

const { t } = useI18n()
const config = useRuntimeConfig()

const FAQ_ITEMS = ['spicy', 'what', 'vegan'] as const

useSeoMeta({
    title: `${t('mkt.concept.title')} - ${t('brandName')}`,
    ogType: 'website',
    ogTitle: `${t('mkt.concept.title')} - ${t('brandName')}`,
    description: t('mkt.concept.subtitle'),
    ogDescription: t('mkt.concept.subtitle'),
    ogImage: `${config.public.baseUrl}/images/about/herbs-grid-1080.png`,
    twitterCard: 'summary_large_image',
    ...useLocaleSeoMeta(),
})
</script>

<template>
    <div>
        <!-- ── Steps ── -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16 sm:pb-24">
            <div v-reveal class="text-center mb-10">
                <h1 class="font-display font-bold text-3xl sm:text-4xl text-ygf-black">{{ $t('mkt.concept.title') }}</h1>
                <p class="mt-3 text-gray-600 max-w-2xl mx-auto">{{ $t('mkt.concept.subtitle') }}</p>
            </div>
            <MktSteps key-prefix="mkt.concept" />
        </section>

        <!-- ── Broth story ── -->
        <section class="bg-ygf-cream">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-10 lg:grid-cols-2 lg:items-center">
                <div v-reveal>
                    <MktPicture
                        src="/images/about/herbs-grid"
                        :widths="[640, 1080, 1600]"
                        :fallback-width="1080"
                        :alt="$t('mkt.concept.broth_story.title')"
                        sizes="(min-width: 1024px) 48vw, 92vw"
                        img-class="w-full rounded-ygf-lg shadow-ygf-lg"
                    />
                </div>
                <div v-reveal="1">
                    <h2 class="font-display font-bold text-3xl text-ygf-black mb-1">{{ $t('mkt.concept.broth_story.title') }}</h2>
                    <p class="font-serifzh text-lg text-ygf-dark mb-4">{{ $t('mkt.concept.broth_story.chinese_title') }}</p>
                    <p class="text-gray-600 leading-relaxed mb-3">{{ $t('mkt.concept.broth_story.p1') }}</p>
                    <p class="text-gray-600 leading-relaxed mb-3">{{ $t('mkt.concept.broth_story.p2') }}</p>
                    <p class="text-gray-600 leading-relaxed">{{ $t('mkt.concept.broth_story.p3') }}</p>
                </div>
            </div>
        </section>

        <!-- ── FAQ ── -->
        <section class="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <h2 v-reveal class="text-center font-display font-bold text-3xl text-ygf-black mb-8">{{ $t('mkt.concept.faq.title') }}</h2>
            <div class="flex flex-col gap-3">
                <details
                    v-for="item in FAQ_ITEMS"
                    :key="item"
                    v-reveal
                    class="group bg-white border border-ygf-orange-100 rounded-ygf-card shadow-ygf-sm overflow-hidden"
                >
                    <summary class="flex items-center justify-between gap-4 cursor-pointer select-none px-5 py-4 font-semibold text-ygf-black">
                        {{ $t(`mkt.concept.faq.${item}.question`) }}
                        <svg class="w-4 h-4 shrink-0 text-ygf transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </summary>
                    <p class="px-5 pb-5 text-gray-600 leading-relaxed">{{ $t(`mkt.concept.faq.${item}.answer`) }}</p>
                </details>
            </div>
            <p class="text-center mt-8">
                <NuxtLinkLocale to="/faq" class="text-sm font-medium text-ygf hover:text-ygf-dark transition-colors">
                    {{ $t('faq.title') }} →
                </NuxtLinkLocale>
            </p>
        </section>
    </div>
</template>
