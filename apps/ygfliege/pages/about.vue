<script setup lang="ts">
// Brand story: storytelling blocks, timeline (2003 Harbin → 2026 Liège),
// values, world map and counters. Ported from the ygfliege.be Vike site.
definePageMeta({
    public: true,
    sitemap: { priority: 0.7, changefreq: 'monthly' },
})

const { t } = useI18n()
const config = useRuntimeConfig()

const STORYTELLING = [
    { key: 'origin', reverse: false, image: '/images/about/origin' },
    { key: 'craft', reverse: true, image: '/images/about/craftsmanship' },
    { key: 'global', reverse: false, image: '/images/about/now-global' },
] as const

const TIMELINE = [
    { year: '2003', key: '2003' },
    { year: '2007', key: '2007' },
    { year: '2017', key: '2017' },
    { year: '2024', key: '2024' },
    { year: '2026', key: 'liege' },
] as const

const VALUES = [
    { emoji: '⭐', key: 'quality' },
    { emoji: '🌿', key: 'freshness' },
    { emoji: '👁️', key: 'transparency' },
    { emoji: '🧡', key: 'happiness' },
] as const

const COUNTERS = [
    { value: '7000+', key: 'restaurants' },
    { value: '25+', key: 'countries' },
    { value: '20+', key: 'years' },
] as const

useSeoMeta({
    title: `${t('mkt.about.title')} - ${t('brandName')}`,
    ogType: 'website',
    ogTitle: `${t('mkt.about.title')} - ${t('brandName')}`,
    description: t('mkt.about.subtitle'),
    ogDescription: t('mkt.about.subtitle'),
    ogImage: `${config.public.baseUrl}/images/about/origin-800.png`,
    twitterCard: 'summary_large_image',
    ...useLocaleSeoMeta(),
})
</script>

<template>
    <div>
        <!-- ── Hero ── -->
        <section class="bg-gradient-to-b from-ygf-bg to-white">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 text-center">
                <h1 v-reveal class="font-display font-black text-4xl sm:text-5xl text-ygf-black">{{ $t('mkt.about.title') }}</h1>
                <p v-reveal="1" class="mt-4 text-gray-600 text-lg max-w-2xl mx-auto">{{ $t('mkt.about.subtitle') }}</p>
            </div>
        </section>

        <!-- ── Storytelling ── -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-14 sm:gap-20">
            <div
                v-for="block in STORYTELLING"
                :key="block.key"
                v-reveal
                class="grid gap-8 lg:grid-cols-2 lg:items-center"
            >
                <div :class="block.reverse ? 'lg:order-2' : ''">
                    <MktPicture
                        :src="block.image"
                        :widths="[480, 800, 1200]"
                        :fallback-width="800"
                        :alt="$t(`mkt.about.storytelling.${block.key}.title`)"
                        sizes="(min-width: 1024px) 48vw, 92vw"
                        img-class="w-full rounded-ygf-lg shadow-ygf-md"
                    />
                </div>
                <div :class="block.reverse ? 'lg:order-1' : ''">
                    <h3 class="font-display font-bold text-2xl text-ygf-black mb-3">{{ $t(`mkt.about.storytelling.${block.key}.title`) }}</h3>
                    <p class="text-gray-600 leading-relaxed">{{ $t(`mkt.about.storytelling.${block.key}.text`) }}</p>
                </div>
            </div>
        </section>

        <!-- ── Timeline ── -->
        <section class="bg-ygf-cream">
            <div class="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                <ol class="relative border-l-2 border-ygf-orange-200 ml-3 sm:ml-6 flex flex-col gap-10">
                    <li
                        v-for="entry in TIMELINE"
                        :key="entry.key"
                        v-reveal
                        class="relative pl-8"
                    >
                        <span
                            class="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white"
                            :class="entry.key === 'liege' ? 'bg-ygf shadow-ygf-glow' : 'bg-ygf-orange-300'"
                        />
                        <div class="font-display font-black text-2xl text-ygf">{{ entry.year }}</div>
                        <h3 class="font-semibold text-ygf-black mt-1">{{ $t(`mkt.about.timeline.${entry.key}.title`) }}</h3>
                        <p class="text-sm text-gray-600 leading-relaxed mt-1">{{ $t(`mkt.about.timeline.${entry.key}.desc`) }}</p>
                        <div v-if="entry.key === 'liege'" class="mt-4 w-28" aria-hidden="true">
                            <MktPicture
                                src="/images/mascot/fuzi-wave"
                                :widths="[300, 600]"
                                :fallback-width="600"
                                alt=""
                                sizes="120px"
                                img-class="w-full"
                            />
                        </div>
                    </li>
                </ol>
            </div>
        </section>

        <!-- ── Values ── -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <h2 v-reveal class="text-center font-display font-bold text-3xl text-ygf-black mb-10">{{ $t('mkt.about.values.title') }}</h2>
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div
                    v-for="(val, i) in VALUES"
                    :key="val.key"
                    v-reveal="i + 1"
                    class="bg-white border border-ygf-orange-100 rounded-ygf-card shadow-ygf-sm p-6 text-center"
                >
                    <div class="text-3xl mb-3" aria-hidden="true">{{ val.emoji }}</div>
                    <h3 class="font-display font-bold text-lg text-ygf-black mb-2">{{ $t(`mkt.about.values.${val.key}.title`) }}</h3>
                    <p class="text-sm text-gray-600 leading-relaxed">{{ $t(`mkt.about.values.${val.key}.desc`) }}</p>
                </div>
            </div>
        </section>

        <!-- ── World map ── -->
        <section class="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
            <h2 v-reveal class="text-center font-display font-bold text-3xl text-ygf-black mb-8">{{ $t('mkt.about.world_map.title') }}</h2>
            <img v-reveal src="/images/icons/global-map.svg" :alt="$t('mkt.about.world_map.title')" class="w-full h-auto" loading="lazy" />
        </section>

        <!-- ── Counters ── -->
        <section class="bg-ygf">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-16 grid grid-cols-3 gap-6 text-center">
                <div v-for="(c, i) in COUNTERS" :key="c.key" v-reveal="i">
                    <div class="font-display font-black text-3xl sm:text-5xl text-white">{{ c.value }}</div>
                    <div class="mt-1 text-white/80 text-xs sm:text-sm">{{ $t(`mkt.about.counters.${c.key}`) }}</div>
                </div>
            </div>
        </section>
    </div>
</template>
