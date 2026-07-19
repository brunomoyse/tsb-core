<script setup lang="ts">
import { computed } from 'vue'
import { RESTAURANT_TZ, isSameBrusselsDay } from '#engine/utils/datetime'

// Marketing homepage ported from the ygfliege.be Vike site (hero, broth
// selector, broth story, steps, video band, why, gallery, CTA) with the shop's
// live ordering status wired into the hero.
definePageMeta({
    public: true,
    sitemap: { priority: 1, changefreq: 'weekly' },
})

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const { brand } = useAppConfig()

// Live ordering status for the hero; lazy so the page renders without waiting
// on the config query.
const { config: restaurantConfig } = await useRestaurantConfig({ lazy: true })

type OrderingStatus = 'open' | 'onsiteOnly' | 'closed' | 'loading'
const orderingStatus = computed<OrderingStatus>(() => {
    const cfg = restaurantConfig.value?.restaurantConfig
    if (!cfg) return 'loading'
    if (cfg.isOrderingCurrentlyOpen) return 'open'
    if (cfg.isCurrentlyOpen) return 'onsiteOnly'
    return 'closed'
})

const nextOpeningTime = computed(() => {
    const iso = restaurantConfig.value?.restaurantConfig?.nextOpeningAt
    if (!iso) return null
    const next = new Date(iso)
    const sameDay = isSameBrusselsDay(next, new Date())
    return new Intl.DateTimeFormat(locale.value, {
        ...(sameDay ? {} : { weekday: 'long' }),
        hour: '2-digit', minute: '2-digit',
        timeZone: RESTAURANT_TZ,
    }).format(next)
})

useSeoMeta({
    title: t('mkt.seo.home_title'),
    ogType: 'website',
    ogTitle: t('mkt.seo.home_title'),
    description: t('mkt.seo.home_desc'),
    ogDescription: t('mkt.seo.home_desc'),
    ogImage: `${config.public.baseUrl}/images/hero/bowl-creative-1000.png`,
    twitterCard: 'summary_large_image',
    ...useLocaleSeoMeta(),
})
</script>

<template>
    <div>
        <!-- ── Hero: levitating bowl, warm background ── -->
        <section class="relative overflow-hidden bg-gradient-to-b from-ygf-bg to-white">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid gap-10 lg:grid-cols-2 lg:items-center">
                <div class="text-center lg:text-left">
                    <h1 v-reveal class="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-ygf-black leading-tight">
                        {{ $t('mkt.hero.slogan') }}
                    </h1>
                    <p v-reveal="1" class="mt-5 text-gray-600 text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                        {{ $t('mkt.hero.subtitle') }}
                    </p>
                    <div v-reveal="2" class="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                        <NuxtLinkLocale
                            to="/menu"
                            class="inline-flex items-center justify-center min-h-12 px-8 py-3 rounded-ygf-btn bg-ygf text-white font-semibold shadow-ygf-md hover:bg-ygf-dark transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange-300"
                        >
                            {{ $t('mkt.hero.cta') }}
                        </NuxtLinkLocale>
                        <!-- Live ordering status pill -->
                        <span
                            v-if="orderingStatus !== 'loading'"
                            class="inline-flex items-center gap-2 text-sm font-medium rounded-full px-4 py-2"
                            :class="orderingStatus === 'open'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-ygf-orange-50 text-ygf-orange-700'"
                        >
                            <span
                                class="w-2 h-2 rounded-full"
                                :class="orderingStatus === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-ygf-orange-400'"
                            />
                            <template v-if="orderingStatus === 'open'">{{ $t('home.status.open') }}</template>
                            <template v-else-if="orderingStatus === 'onsiteOnly'">{{ $t('home.status.onsiteOnly') }}</template>
                            <template v-else-if="nextOpeningTime">{{ $t('checkout.opensAt', { time: nextOpeningTime }) }}</template>
                            <template v-else>{{ $t('home.status.closed') }}</template>
                        </span>
                    </div>
                </div>

                <div class="relative flex justify-center" aria-hidden="false">
                    <!-- Rising steam -->
                    <div aria-hidden="true">
                        <span class="steam-wisp" style="left: 42%; animation-delay: 0s" />
                        <span class="steam-wisp" style="left: 50%; animation-delay: 1.1s" />
                        <span class="steam-wisp" style="left: 58%; animation-delay: 2.2s" />
                    </div>
                    <MktPicture
                        src="/images/hero/bowl-creative"
                        :widths="[640, 1000, 1400]"
                        :fallback-width="1000"
                        :alt="$t('mkt.hero.bowl_alt')"
                        sizes="(min-width: 1024px) 38vw, 72vw"
                        eager
                        img-class="w-full max-w-md lg:max-w-xl drop-shadow-2xl"
                    />
                </div>
            </div>
        </section>

        <!-- ── Signature broths: interactive selector ── -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div v-reveal class="text-center mb-10">
                <span class="text-ygf text-sm font-semibold uppercase tracking-widest">{{ $t('mkt.broths.label') }}</span>
                <h2 class="font-display font-bold text-3xl sm:text-4xl text-ygf-black mt-2">{{ $t('mkt.broths.title') }}</h2>
                <p class="mt-3 text-gray-600 max-w-2xl mx-auto">{{ $t('mkt.broths.subtitle') }}</p>
            </div>
            <MktBrothSelector />
        </section>

        <!-- ── Herbal broth story (草本骨汤) ── -->
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
                    <span class="text-ygf text-sm font-semibold uppercase tracking-widest">{{ $t('mkt.home.broth_hero.label') }}</span>
                    <h2 class="font-display font-bold text-3xl text-ygf-black mt-2 mb-1">{{ $t('mkt.concept.broth_story.title') }}</h2>
                    <p class="font-serifzh text-lg text-ygf-dark mb-4">{{ $t('mkt.concept.broth_story.chinese_title') }} · {{ $t('mkt.home.broth_hero.translit') }}</p>
                    <p class="text-gray-600 leading-relaxed mb-3">{{ $t('mkt.concept.broth_story.p1') }}</p>
                    <p class="text-gray-600 leading-relaxed mb-5">{{ $t('mkt.concept.broth_story.p2') }}</p>
                    <NuxtLinkLocale to="/concept" class="inline-flex items-center gap-1.5 font-semibold text-ygf hover:text-ygf-dark transition-colors">
                        {{ $t('mkt.home.broth_hero.cta') }}
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </NuxtLinkLocale>
                </div>
            </div>
        </section>

        <!-- ── How it works ── -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div v-reveal class="text-center mb-10">
                <h2 class="font-display font-bold text-3xl sm:text-4xl text-ygf-black">{{ $t('mkt.home.steps.title') }}</h2>
                <p class="mt-3 text-gray-600">{{ $t('mkt.home.steps.subtitle') }}</p>
            </div>
            <MktSteps key-prefix="mkt.home.steps" />
        </section>

        <!-- ── Cinematic ingredient loop ── -->
        <MktVideoBand />

        <!-- ── Why Yangguofu ── -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <p v-reveal class="text-center font-serifzh text-ygf-dark mb-2">{{ $t('mkt.home.stats.slogan') }}</p>
            <h2 v-reveal="1" class="text-center font-display font-bold text-3xl sm:text-4xl text-ygf-black mb-10">{{ $t('mkt.home.why.title') }}</h2>
            <div class="grid gap-6 sm:grid-cols-3">
                <article
                    v-for="(pillar, i) in ['broth', 'fresh', 'custom']"
                    :key="pillar"
                    v-reveal="i + 1"
                    class="bg-white border border-ygf-orange-100 rounded-ygf-card shadow-ygf-sm p-6 text-center"
                >
                    <div class="text-3xl mb-3" aria-hidden="true">{{ ['🍲', '🌿', '⚖️'][i] }}</div>
                    <h3 class="font-display font-bold text-lg text-ygf-black mb-2">{{ $t(`mkt.home.why.${pillar}.title`) }}</h3>
                    <p class="text-sm text-gray-600 leading-relaxed">{{ $t(`mkt.home.why.${pillar}.desc`) }}</p>
                </article>
            </div>
        </section>

        <!-- ── Gallery: the art of eating ── -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
            <h2 v-reveal class="text-center font-display font-bold text-3xl sm:text-4xl text-ygf-black mb-10">{{ $t('mkt.home.gallery.title') }}</h2>
            <MktGallery />
        </section>

        <!-- ── CTA + address ── -->
        <section class="bg-ygf">
            <div v-reveal class="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
                <h2 class="font-display font-bold text-3xl sm:text-4xl text-white">{{ $t('mkt.cta.title') }}</h2>
                <p class="mt-3 text-white/85">{{ $t('mkt.cta.subtitle') }}</p>
                <p class="mt-1 text-white/70 text-sm">{{ $t('contact.address') }}</p>
                <NuxtLinkLocale
                    to="/menu"
                    class="mt-8 inline-flex items-center justify-center min-h-12 px-8 py-3 rounded-ygf-btn bg-white text-ygf font-semibold hover:bg-ygf-orange-50 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                    {{ $t('mkt.cta.button') }}
                </NuxtLinkLocale>
            </div>
        </section>
    </div>
</template>
