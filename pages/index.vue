<script setup lang="ts">
import { RESTAURANT_TZ, getBrusselsParts, isSameBrusselsDay } from '~/utils/datetime'
import { useCartStore } from '@/stores/cart'

definePageMeta({
    sitemap: { priority: 1, changefreq: 'daily' },
})

const config = useRuntimeConfig()
const { t, locale } = useI18n()
const cartStore = useCartStore()

const yearsSince = getBrusselsParts().year - 2016

// Live ordering status for the hero order bar; lazy so the homepage renders without waiting on the config query.
const { config: restaurantConfig } = await useRestaurantConfig({ lazy: true })

// Three-state status: restaurant open for online orders / open walk-in only / closed.
type OrderingStatus = 'open' | 'onsiteOnly' | 'closed'
const orderingStatus = computed<OrderingStatus>(() => {
    const cfg = restaurantConfig.value?.restaurantConfig
    if (!cfg) return 'closed'
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

const collection = computed<'DELIVERY' | 'PICKUP'>({
    get: () => cartStore.collectionOption,
    set: (v: 'DELIVERY' | 'PICKUP') => { cartStore.collectionOption = v },
})

const scrollToOpeningHours = () => {
    if (!import.meta.client) return
    const el = document.getElementById('opening-hours')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => el.focus({ preventScroll: true }), 300)
}

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

        <!-- First fold on mobile: image card flexes so the second card stays fully visible. -->
        <div class="flex flex-col gap-3 h-[calc(100dvh-5rem-1.5rem)] min-h-[34rem] sm:h-auto sm:gap-5">
            <div class="relative flex-1 min-h-[clamp(11rem,30vh,14rem)] sm:h-96 overflow-hidden rounded-2xl">
                <picture>
                    <source srcset="/images/restaurant-illustrated.avif" type="image/avif" />
                    <source srcset="/images/restaurant-illustrated.webp" type="image/webp" />
                    <img
                        alt="Tokyo Sushi Bar Restaurant"
                        class="absolute inset-0 w-full h-full object-cover object-[72%_55%] sm:object-center"
                        src="/images/restaurant-illustrated.png"
                        width="1200"
                        height="805"
                    />
                </picture>
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div class="absolute inset-x-0 bottom-0 p-5 sm:p-8 text-white">
                    <h1 class="text-xs sm:text-sm text-white/90 font-semibold drop-shadow-md tracking-[0.25em] uppercase">
                        {{ $t('home.heroTagline') }}
                    </h1>
                </div>
            </div>

            <!-- Order bar remains fully visible in the first mobile viewport. -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-3 relative z-10">
            <!-- Live status row: green = fully open, amber = walk-in only (online orders paused), red = closed. -->
            <div class="flex items-center justify-between gap-3">
                <div class="inline-flex items-center gap-2.5 min-w-0">
                    <span class="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                        <span v-if="orderingStatus === 'open'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span
                            :class="[
                                'relative inline-flex rounded-full h-2.5 w-2.5',
                                orderingStatus === 'open' ? 'bg-emerald-500'
                                    : orderingStatus === 'onsiteOnly' ? 'bg-amber-400'
                                    : 'bg-red-500',
                            ]"
                        />
                    </span>
                    <span class="text-sm font-semibold text-gray-900 truncate">
                        {{ $t(`home.status.${orderingStatus}`) }}
                        <span v-if="orderingStatus === 'closed' && nextOpeningTime" class="font-normal text-gray-500">
                            · {{ $t('checkout.opensAt', { time: nextOpeningTime }) }}
                        </span>
                    </span>
                </div>
                <button
                    type="button"
                    class="shrink-0 min-h-11 inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-500 focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none rounded-md px-1 -mr-1"
                    @click="scrollToOpeningHours"
                >
                    {{ $t('home.schedule') }}
                </button>
            </div>

            <!-- Collection toggle (writes to persisted cart store; menu + checkout pick it up) -->
            <div class="flex gap-1 p-1 bg-gray-50 border border-gray-200 rounded-xl" role="radiogroup" :aria-label="$t('checkout.collection')">
                <button
                    type="button"
                    role="radio"
                    :aria-checked="collection === 'DELIVERY'"
                    @click="collection = 'DELIVERY'"
                    :class="[
                        'flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none',
                        collection === 'DELIVERY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    ]"
                >
                    <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 16v1a2 2 0 0 0 4 0v-5h-3a3 3 0 0 0 -3 3v1h10a6 6 0 0 1 5 -4v-5a2 2 0 0 0 -2 -2h-1"/><path d="M6 9l3 0"/></svg>
                    {{ $t('cart.delivery') }}
                </button>
                <button
                    type="button"
                    role="radio"
                    :aria-checked="collection === 'PICKUP'"
                    @click="collection = 'PICKUP'"
                    :class="[
                        'flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none',
                        collection === 'PICKUP' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    ]"
                >
                    <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/></svg>
                    {{ $t('cart.pickup') }}
                </button>
            </div>

            <!-- Primary CTA -->
            <NuxtLinkLocale
                to="/menu"
                class="w-full inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] shadow-sm focus-visible:ring-2 focus-visible:ring-red-300 focus:outline-none"
            >
                {{ $t('home.orderNow') }}
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
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
            <div id="opening-hours" tabindex="-1" class="bg-tsb-two rounded-2xl p-6 sm:p-8 scroll-mt-6">
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

        <!-- Accepted payment methods -->
        <div class="pt-4 pb-2 flex flex-col items-center gap-3">
            <div class="flex items-center gap-3 w-full max-w-xs">
                <div class="h-px flex-1 bg-gray-200" />
                <span class="text-gray-400 text-[10px] tracking-[0.25em] uppercase whitespace-nowrap">{{ $t('about.paymentsLabel') }}</span>
                <div class="h-px flex-1 bg-gray-200" />
            </div>
            <div class="flex items-center flex-wrap justify-center gap-2.5">
                <!-- Visa -->
                <div class="h-7 px-2.5 rounded-md border border-gray-200 bg-white flex items-center" aria-label="Visa">
                    <span class="font-black italic text-[11px] text-gray-500 tracking-tight leading-none">VISA</span>
                </div>
                <!-- Mastercard -->
                <div class="h-7 px-2.5 rounded-md border border-gray-200 bg-white flex items-center gap-0.5" aria-label="Mastercard">
                    <span class="w-3 h-3 rounded-full bg-gray-400/80" />
                    <span class="w-3 h-3 rounded-full bg-gray-300 -ml-1.5" />
                </div>
                <!-- Bancontact -->
                <div class="h-7 px-2.5 rounded-md border border-gray-200 bg-white flex items-center" aria-label="Bancontact">
                    <span class="font-extrabold text-[11px] text-gray-500 tracking-tight leading-none">bc</span>
                </div>
                <!-- Cash -->
                <div class="h-7 px-2.5 rounded-md border border-gray-200 bg-white flex items-center gap-1" aria-label="Cash">
                    <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25A2.25 2.25 0 014.5 6h15a2.25 2.25 0 012.25 2.25v7.5A2.25 2.25 0 0119.5 18h-15a2.25 2.25 0 01-2.25-2.25v-7.5zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span class="text-[11px] text-gray-500 font-medium leading-none">{{ $t('about.cash') }}</span>
                </div>
            </div>
        </div>

    </section>
</template>
