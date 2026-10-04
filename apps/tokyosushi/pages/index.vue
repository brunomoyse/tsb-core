<script setup lang="ts">
import { RESTAURANT_TZ, getBrusselsParts, isSameBrusselsDay } from '#engine/utils/datetime'
import { useCartStore } from '#engine/stores/cart'
import { useBrandPhone } from '#engine/composables/useBrandPhone'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'

definePageMeta({
  sitemap: { priority: 1, changefreq: 'daily' },
})

const localizedUrl = useLocalizedUrl()
const { t, locale } = useI18n()
const cartStore = useCartStore()
const { policyParams } = useOrderingPolicy()
const { brand } = useAppConfig()
const { phoneHref } = useBrandPhone()

const yearsSince = getBrusselsParts().year - brand.foundingYear

// Live ordering status for the hero order bar; lazy so the homepage renders without waiting on the config query.
const {
  config: restaurantConfig,
  status: availability,
  preorderTime,
} = await useOrderingAvailability({ lazy: true })

// Status states: online-ordering open / closed but pre-orderable today / walk-in only / closed / still loading from backend.
// Same rule as the menu, the cart and the checkout (useOrderingAvailability), not isOrderingCurrentlyOpen alone: in the pre-order window it says "order now for {time}", and it never says "open" while ordering is switched off.
type OrderingStatus = 'open' | 'preorder' | 'onsiteOnly' | 'closed' | 'loading'
const orderingStatus = computed<OrderingStatus>(() => {
  const cfg = restaurantConfig.value?.restaurantConfig
  if (!cfg || availability.value === null) return 'loading'
  if (availability.value === 'open') return 'open'
  if (availability.value === 'preorder' && preorderTime.value) return 'preorder'
  return cfg.isCurrentlyOpen ? 'onsiteOnly' : 'closed'
})

const nextOpeningTime = computed(() => {
  const iso = restaurantConfig.value?.restaurantConfig?.nextOpeningAt
  if (!iso) return null
  const next = new Date(iso)
  const sameDay = isSameBrusselsDay(next, new Date())
  return new Intl.DateTimeFormat(locale.value, {
    ...(sameDay ? {} : { weekday: 'long' }),
    hour: '2-digit',
    minute: '2-digit',
    timeZone: RESTAURANT_TZ,
  }).format(next)
})

// SSR can't read the persisted store value (lives in localStorage), so it always renders the default 'DELIVERY'. We mirror that during SSR/hydration, then switch to the real store value after mount to avoid a hydration class mismatch on the toggle buttons.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const collection = computed<'DELIVERY' | 'PICKUP'>({
  get: () => (hydrated.value ? cartStore.collectionOption : 'DELIVERY'),
  set: (v: 'DELIVERY' | 'PICKUP') => {
    cartStore.collectionOption = v
  },
})

const scrollToOpeningHours = () => {
  if (!import.meta.client) return
  const el = document.getElementById('opening-hours')
  if (!el) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  window.setTimeout(() => el.focus({ preventScroll: true }), reduceMotion ? 0 : 300)
}

const firstFoldClass = computed(() => {
  const base =
    'flex flex-col gap-3 min-h-[34rem] sm:h-auto sm:gap-5 lg:block lg:relative lg:gap-0 lg:min-h-0'
  return `${base} h-[calc(100dvh-var(--nav-h)-1.5rem)]`
})

useJsonLd(
  [
    {
      '@type': 'WebSite',
      url: localizedUrl(),
      name: t('schema.siteName'),
      description: t('schema.siteDescription'),
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${localizedUrl('/menu')}?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebPage',
      name: t('schema.home.title'),
      description: t('schema.home.description'),
    },
  ],
  'page-jsonld',
)

useSeoMeta({
  title: t('schema.home.title'),
  ogType: 'website',
  ogTitle: t('schema.home.title'),
  description: t('schema.home.description'),
  ogDescription: t('schema.home.description'),
  ...useLocaleSeoMeta(),
})

useHead({
  link: [
    {
      rel: 'preload',
      as: 'image',
      href: '/images/restaurant-illustrated-mobile.avif',
      media: '(max-width: 640px)',
      type: 'image/avif',
      fetchpriority: 'high',
    },
    {
      rel: 'preload',
      as: 'image',
      href: '/images/restaurant-illustrated.avif',
      media: '(min-width: 641px)',
      type: 'image/avif',
      fetchpriority: 'high',
    },
  ],
})
</script>

<template>
  <section class="max-w-5xl mx-auto pt-6 sm:pt-8 space-y-5">
    <!-- First fold: image card flexes on mobile; at lg the order panel floats as overlay on the image. -->
    <div :class="firstFoldClass">
      <div
        class="relative flex-1 min-h-[clamp(11rem,30dvh,14rem)] sm:h-96 lg:h-[32rem] lg:min-h-0 overflow-hidden rounded-2xl"
      >
        <picture>
          <source
            media="(max-width: 640px)"
            srcset="/images/restaurant-illustrated-mobile.avif"
            type="image/avif"
          />
          <source
            media="(max-width: 640px)"
            srcset="/images/restaurant-illustrated-mobile.webp"
            type="image/webp"
          />
          <source srcset="/images/restaurant-illustrated.avif" type="image/avif" />
          <source srcset="/images/restaurant-illustrated.webp" type="image/webp" />
          <img
            :alt="$t('home.restaurantImageAlt', { name: brand.name })"
            class="absolute inset-0 w-full h-full object-cover object-[72%_55%] sm:object-center"
            src="/images/restaurant-illustrated.png"
            width="1024"
            height="687"
            fetchpriority="high"
            decoding="async"
          />
        </picture>
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div class="absolute inset-x-0 bottom-0 p-5 sm:p-8 text-white">
          <h1 class="text-3xl sm:text-4xl font-bold drop-shadow-md">
            {{ brand.name }}
          </h1>
          <p
            class="mt-1 sm:mt-2 text-xs sm:text-sm text-white/90 font-semibold drop-shadow-md tracking-[0.25em] uppercase"
          >
            {{ $t('home.heroTagline') }}
          </p>
        </div>
      </div>

      <!-- Order bar: stacked below image on mobile/sm; floats as overlay at top-right of image on lg (keeps the lucky cat visible below). -->
      <div
        class="card lg:shadow-xl p-4 sm:p-5 space-y-3 relative z-10 lg:absolute lg:right-8 lg:top-8 lg:w-96"
      >
        <!-- Live status row: green = fully open, amber = walk-in only (online orders paused), red = closed, gray shimmer = awaiting backend. -->
        <div class="flex items-center justify-between gap-3">
          <div class="inline-flex items-center gap-2.5 min-w-0">
            <span class="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span
                v-if="orderingStatus === 'open'"
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              />
              <span
                :class="[
                  'relative inline-flex rounded-full h-2.5 w-2.5',
                  orderingStatus === 'open'
                    ? 'bg-emerald-500'
                    : orderingStatus === 'onsiteOnly' || orderingStatus === 'preorder'
                      ? 'bg-amber-400'
                      : orderingStatus === 'closed'
                        ? 'bg-red-500'
                        : 'bg-neutral-300',
                ]"
              />
            </span>
            <span
              v-if="orderingStatus === 'loading'"
              class="h-4 w-28 rounded animate-shimmer"
              style="
                background-size: 200% 100%;
                background-image: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
              "
              aria-hidden="true"
            />
            <span v-else class="text-sm font-semibold text-neutral-900 truncate">
              {{ $t(`home.status.${orderingStatus}`, { time: preorderTime ?? '' }) }}
              <span
                v-if="orderingStatus === 'closed' && nextOpeningTime"
                class="font-normal text-neutral-600"
              >
                · {{ $t('checkout.opensAt', { time: nextOpeningTime }) }}
              </span>
            </span>
          </div>
          <button
            type="button"
            class="shrink-0 min-h-11 inline-flex items-center text-xs font-medium text-neutral-600 hover:text-neutral-700 underline underline-offset-2 decoration-neutral-300 hover:decoration-neutral-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none rounded-md px-1 -mr-1"
            @click="scrollToOpeningHours"
          >
            {{ $t('home.schedule') }}
          </button>
        </div>

        <!-- Collection toggle (writes to persisted cart store; menu + checkout pick it up) -->
        <div
          class="flex gap-1 p-1 bg-neutral-50 border border-neutral-200 rounded-xl"
          role="radiogroup"
          :aria-label="$t('checkout.collection')"
        >
          <button
            type="button"
            role="radio"
            :aria-checked="collection === 'DELIVERY'"
            @click="collection = 'DELIVERY'"
            :class="[
              'flex-1 inline-flex min-h-11 items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none',
              collection === 'DELIVERY'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-700',
            ]"
          >
            <svg
              aria-hidden="true"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path
                d="M5 16v1a2 2 0 0 0 4 0v-5h-3a3 3 0 0 0 -3 3v1h10a6 6 0 0 1 5 -4v-5a2 2 0 0 0 -2 -2h-1"
              />
              <path d="M6 9l3 0" />
            </svg>
            {{ $t('cart.delivery') }}
          </button>
          <button
            type="button"
            role="radio"
            :aria-checked="collection === 'PICKUP'"
            @click="collection = 'PICKUP'"
            :class="[
              'flex-1 inline-flex min-h-11 items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none',
              collection === 'PICKUP'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-700',
            ]"
          >
            <svg
              aria-hidden="true"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
              />
            </svg>
            {{ $t('cart.pickup') }}
          </button>
        </div>

        <!-- Primary CTA -->
        <UiButton to="/menu" size="lg" block>
          {{ $t('home.orderNow') }}
          <svg
            aria-hidden="true"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </UiButton>
      </div>
    </div>

    <!-- Info Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div class="bg-tsb-two rounded-2xl p-5 text-center">
        <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <!-- Moped icon (Tabler Icons, same as OrdersWidget) -->
          <svg
            aria-hidden="true"
            class="w-5 h-5 text-neutral-700"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path
              d="M5 16v1a2 2 0 0 0 4 0v-5h-3a3 3 0 0 0 -3 3v1h10a6 6 0 0 1 5 -4v-5a2 2 0 0 0 -2 -2h-1"
            />
            <path d="M6 9l3 0" />
          </svg>
        </div>
        <p class="font-semibold text-neutral-900 mb-1 text-[15px]">
          {{ $t('about.infoCards.freeDelivery') }}
        </p>
        <p class="text-neutral-600 text-sm leading-relaxed">
          {{ $t('about.infoCards.freeDeliveryDesc', policyParams) }}
        </p>
      </div>
      <div class="bg-tsb-two rounded-2xl p-5 text-center">
        <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <!-- Shopping bag icon (Heroicons, same as OrdersWidget) -->
          <svg
            aria-hidden="true"
            class="w-5 h-5 text-neutral-700"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </div>
        <p class="font-semibold text-neutral-900 mb-1 text-[15px]">
          {{ $t('about.infoCards.takeawayDiscount', policyParams) }}
        </p>
        <p class="text-neutral-600 text-sm leading-relaxed">
          {{ $t('about.infoCards.takeawayDiscountDesc', policyParams) }}
        </p>
      </div>
      <div class="bg-tsb-two rounded-2xl p-5 text-center">
        <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <!-- Fish icon (Tabler Icons) -->
          <svg
            aria-hidden="true"
            class="w-5 h-5 text-neutral-700"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571" />
            <path
              d="M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504"
            />
            <path d="M18 11v.01" />
            <path d="M11.5 10.5c-.667 1 -.667 2 0 3" />
          </svg>
        </div>
        <p class="font-semibold text-neutral-900 mb-1 text-[15px]">
          {{ $t('about.infoCards.freshDaily') }}
        </p>
        <p class="text-neutral-600 text-sm leading-relaxed">
          {{ $t('about.infoCards.freshDailyDesc') }}
        </p>
      </div>
    </div>

    <!-- Our Story -->
    <div class="bg-tsb-two rounded-2xl relative overflow-hidden">
      <!-- Decorative blurred background accents -->
      <div
        class="absolute -top-24 -right-24 w-80 h-80 bg-tsb-four/40 rounded-full blur-3xl pointer-events-none"
      />
      <div
        class="absolute -bottom-24 -left-24 w-64 h-64 bg-tsb-four/30 rounded-full blur-3xl pointer-events-none"
      />
      <!-- Subtle kanji watermark: 物語 (story) -->
      <span
        class="absolute top-6 right-6 sm:top-8 sm:right-10 font-channel text-[80px] sm:text-[120px] text-primary-200/[0.07] leading-none select-none pointer-events-none"
        aria-hidden="true"
        >物語</span
      >

      <div class="relative px-8 sm:px-12 py-10 sm:py-14">
        <!-- Title -->
        <h2 class="text-2xl sm:text-3xl font-bold text-center">
          {{ $t('about.ourStoryTitle') }}
        </h2>
        <!-- Decorative chopsticks divider -->
        <div class="flex justify-center items-center mt-3 mb-10 sm:mb-14" aria-hidden="true">
          <svg class="w-16 h-5 text-primary-400/40" viewBox="0 0 80 20" fill="none">
            <line
              x1="5"
              y1="18"
              x2="38"
              y2="2"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <line
              x1="42"
              y1="2"
              x2="75"
              y2="18"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <circle cx="40" cy="2" r="1.5" fill="currentColor" opacity="0.6" />
          </svg>
        </div>

        <div class="max-w-2xl mx-auto">
          <!-- Chapter 1: founding year -->
          <div class="mb-8 sm:mb-10">
            <div class="flex items-center gap-4 mb-4">
              <div class="h-px flex-1 bg-gradient-to-r from-transparent to-primary-200/50" />
              <span
                class="font-channel text-3xl sm:text-4xl text-primary-700 leading-none shrink-0"
                >{{ brand.foundingYear }}</span
              >
              <div class="h-px flex-1 bg-gradient-to-l from-transparent to-primary-200/50" />
            </div>
            <p class="text-neutral-600 leading-relaxed text-[15px] text-center">
              {{ $t('about.ourStoryText1') }}
            </p>
          </div>

          <!-- Chapter 2: 2024 -->
          <div class="mb-8 sm:mb-10">
            <div class="flex items-center gap-4 mb-4">
              <div class="h-px flex-1 bg-gradient-to-r from-transparent to-primary-200/50" />
              <span class="font-channel text-3xl sm:text-4xl text-primary-700 leading-none shrink-0"
                >2024</span
              >
              <div class="h-px flex-1 bg-gradient-to-l from-transparent to-primary-200/50" />
            </div>
            <p class="text-neutral-600 leading-relaxed text-[15px] text-center">
              {{ $t('about.ourStoryText2') }}
            </p>
          </div>

          <!-- Chapter 3: 2026 - Anniversary -->
          <div>
            <div class="flex items-center gap-4 mb-4">
              <div class="h-px flex-1 bg-gradient-to-r from-transparent to-primary-200/50" />
              <span class="font-channel text-3xl sm:text-4xl text-primary-700 leading-none shrink-0"
                >2026</span
              >
              <div class="h-px flex-1 bg-gradient-to-l from-transparent to-primary-200/50" />
            </div>
            <p class="text-neutral-600 leading-relaxed text-[15px] text-center mb-5">
              {{ $t('about.ourStoryText3') }}
            </p>
            <!-- Years counter -->
            <div class="flex justify-center">
              <div class="bg-white/60 backdrop-blur-sm rounded-xl px-8 py-5 text-center shadow-sm">
                <span
                  class="font-channel text-5xl sm:text-6xl text-primary-700 block leading-none"
                  >{{ yearsSince }}</span
                >
                <span class="text-neutral-600 text-xs tracking-widest uppercase mt-2 block">{{
                  $t('about.yearsOfPassion')
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Visit Us -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <!-- Opening Hours -->
      <OpeningHoursCard id="opening-hours" tabindex="-1" />
      <!-- Address -->
      <div class="bg-tsb-two rounded-2xl p-6 sm:p-8">
        <h3 class="font-semibold text-neutral-900 mb-4 flex items-center gap-2 text-[15px]">
          <svg
            class="w-5 h-5 text-neutral-700"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"
            />
          </svg>
          {{ $t('contact.title') }}
        </h3>
        <p class="text-sm text-neutral-600 mb-4">{{ $t('contact.address') }}</p>
        <a
          :href="phoneHref"
          :aria-label="`${$t('about.callUs')} ${brand.phone}`"
          class="inline-flex items-center gap-2 min-h-11 px-3 rounded-lg bg-white border border-neutral-200 text-sm font-medium text-neutral-900 hover:bg-tsb-four/40 hover:border-neutral-300 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none mb-3"
        >
          <svg
            aria-hidden="true"
            class="w-4 h-4 text-primary-500"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
            />
          </svg>
          <span class="tabular-nums">{{ brand.phone }}</span>
        </a>
        <div>
          <NuxtLinkLocale
            to="/contact"
            class="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-neutral-900 hover:text-neutral-600 transition underline underline-offset-2"
          >
            {{ $t('about.contactLink') }}
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </NuxtLinkLocale>
        </div>
      </div>
    </div>

    <!-- Accepted payment methods -->
    <div class="pt-4 pb-2 flex flex-col items-center gap-3">
      <div class="flex items-center gap-3 w-full max-w-xs">
        <div class="h-px flex-1 bg-neutral-200" />
        <span class="text-neutral-600 text-[10px] tracking-[0.25em] uppercase whitespace-nowrap">{{
          $t('about.paymentsLabel')
        }}</span>
        <div class="h-px flex-1 bg-neutral-200" />
      </div>
      <div class="flex items-center flex-wrap justify-center gap-2.5">
        <!-- Visa -->
        <div
          role="img"
          aria-label="Visa"
          class="h-7 px-2.5 rounded-md border border-neutral-200 bg-white flex items-center"
        >
          <span class="font-black italic text-[11px] text-neutral-600 tracking-tight leading-none"
            >VISA</span
          >
        </div>
        <!-- Mastercard -->
        <div
          role="img"
          aria-label="Mastercard"
          class="h-7 px-2.5 rounded-md border border-neutral-200 bg-white flex items-center gap-0.5"
        >
          <span class="w-3 h-3 rounded-full bg-neutral-400/80" />
          <span class="w-3 h-3 rounded-full bg-neutral-300 -ml-1.5" />
        </div>
        <!-- Bancontact -->
        <div
          role="img"
          aria-label="Bancontact"
          class="h-7 px-2.5 rounded-md border border-neutral-200 bg-white flex items-center"
        >
          <img
            src="/icons/bancontact-logo.svg"
            alt=""
            aria-hidden="true"
            class="h-3.5 w-auto grayscale contrast-125 brightness-75 opacity-80"
            loading="lazy"
          />
        </div>
        <!-- Cash -->
        <div
          class="h-7 px-2.5 rounded-md border border-neutral-200 bg-white flex items-center gap-1"
        >
          <svg
            class="w-3.5 h-3.5 text-neutral-500"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M2.25 8.25A2.25 2.25 0 014.5 6h15a2.25 2.25 0 012.25 2.25v7.5A2.25 2.25 0 0119.5 18h-15a2.25 2.25 0 01-2.25-2.25v-7.5zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span class="text-[11px] text-neutral-600 font-medium leading-none">{{
            $t('about.cash')
          }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  :deep(.animate-ping),
  :deep(.animate-shimmer) {
    animation: none;
  }
  :deep(.transition),
  :deep(.transition-all) {
    transition: none;
  }
}
</style>
