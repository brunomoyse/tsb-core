<script setup lang="ts">
import { computed, ref } from 'vue'
import { BRAND_FIGURES } from '~/data/brandFigures'
import { COMPOSER_CATEGORY_SLUG } from '~/data/composer'
import { COUNTER_PRICE_PER_100G_CENTS } from '~/data/estimator'
import MktEstimator from '~/components/mkt/MktEstimator.vue'
import MktIcon from '~/components/mkt/MktIcon.vue'
import MktOpenStatus from '~/components/mkt/MktOpenStatus.vue'
import MktPracticalInfo from '~/components/mkt/MktPracticalInfo.vue'
import { formatCents, formatPrice } from '#engine/lib/price'
import { toCents } from '#engine/utils/money'
import { useMenuOpen, useShopEnabled } from '#engine/composables/useShopEnabled'
import { useHeroMotion, useMagnetic } from '~/composables/useMktMotion'
// Phosphor icons (same set as the vitrine site); raw SVGs, tinted via
// CurrentColor. Never emojis or hand-drawn paths.
import bowlSteamIcon from '~/assets/icons/bowl-steam.svg?raw'
import leafIcon from '~/assets/icons/leaf.svg?raw'
import scalesIcon from '~/assets/icons/scales.svg?raw'

// Marketing homepage (audit 1a/1b/1c): hero with live status and price, how it works, the broths, the price estimator,
// the video band, why Yangguofu with the brand's figures, practical info with the map. Every ordering affordance shows
// only while the shop is on; with the shop off it is a complete showcase (menu, directions, call, hours).
definePageMeta({
  public: true,
  sitemap: { priority: 1, changefreq: 'weekly' },
})

const { t } = useI18n()
const { brand } = useAppConfig()
const shopEnabled = useShopEnabled()
// The menu link stays while the shop is switched off: /menu then shows the static menu (utils/shopGate.ts).
const menuOpen = useMenuOpen()

const { config: restaurantConfig } = await useOrderingAvailability({ lazy: true })
const preparationMinutes = computed(
  () => restaurantConfig.value?.restaurantConfig?.preparationMinutes ?? null,
)

// The online price rule ("En ligne : 2,50 € + vos ingrédients"), read from the composer product's own price: only
// asked for while the shop is on, and never in the server render's way.
const { data: composerData } = await useGqlQuery<{
  productCategories: { slug: string; products: { slug: string; price: string }[] }[]
}>(
  /* GraphQL */ `
    query HomeComposerPrice {
      productCategories {
        slug
        products {
          slug
          price
        }
      }
    }
  `,
  {},
  { immediate: shopEnabled, lazy: true, server: false, cache: true },
)
const onlinePrice = computed(() => {
  if (!shopEnabled) return null
  const composer = composerData.value?.productCategories.find(
    (category) => category.slug === COMPOSER_CATEGORY_SLUG,
  )?.products[0]
  if (!composer) return null
  return toCents(composer.price) > 0
    ? t('composer.onlinePrice', { base: formatPrice(composer.price) })
    : t('composer.onlinePriceNoBase')
})
const counterPrice = computed(() =>
  t('mkt.estimator.rate', { price: formatCents(COUNTER_PRICE_PER_100G_CENTS) }),
)

// Motion of the old site (client only, none under reduced motion): hero bowl pop-in and scroll parallax, magnetic CTA.
// The bowl's levitation is the CSS animation below.
const hero = ref<HTMLElement | null>(null)
const heroContent = ref<HTMLElement | null>(null)
const heroBowl = ref<HTMLElement | null>(null)
const heroBowlPop = ref<HTMLElement | null>(null)
const heroCta = ref<HTMLElement | null>(null)
useHeroMotion({ hero, bowl: heroBowl, bowlPop: heroBowlPop, content: heroContent })
useMagnetic(heroCta)

useSeoMeta({
  title: t('mkt.seo.home_title'),
  ogType: 'website',
  ogTitle: t('mkt.seo.home_title'),
  description: t('mkt.seo.home_desc'),
  ogDescription: t('mkt.seo.home_desc'),
  ...useLocaleSeoMeta(),
})
</script>

<template>
  <div>
    <!-- ── 1 · Hero: status, levitating bowl, price, two actions (motion: useHeroMotion, as on the old site) ── -->
    <section ref="hero" class="hero relative overflow-hidden">
      <div
        class="max-w-6xl mx-auto px-6 pt-5 pb-10 sm:pt-10 lg:py-20 grid gap-6 lg:gap-10 lg:grid-cols-2 lg:items-center"
      >
        <!-- Phone: the live status sits above the bowl (desktop: in the info row under the actions) -->
        <div class="lg:hidden flex justify-center">
          <MktOpenStatus />
        </div>

        <div
          ref="heroContent"
          class="relative z-[2] text-center lg:text-left order-2 lg:order-none"
        >
          <span class="section-label">{{ $t('mkt.home.broth_hero.label') }}</span>
          <h1
            class="font-display font-bold text-[2.75rem] sm:text-5xl lg:text-6xl text-ygf-black leading-[1.02] tracking-tight text-balance"
          >
            {{ $t('mkt.hero.slogan') }}
          </h1>
          <p
            class="mt-4 text-gray-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 text-pretty"
          >
            {{ $t('mkt.hero.subtitle') }}
          </p>

          <!-- The price: online base + ingredients while the shop is on, and the counter's rule, labelled as such -->
          <p
            class="mt-4 flex flex-wrap items-baseline justify-center lg:justify-start gap-x-2 gap-y-1 text-sm text-ygf-gray-600"
            data-testid="hero-price"
          >
            <template v-if="onlinePrice">
              <strong class="text-[1.0625rem] text-ygf-black">{{ onlinePrice }}</strong>
              <span>{{ $t('mkt.hero.counterPrice', { price: counterPrice }) }}</span>
            </template>
            <template v-else>
              <strong class="text-[1.0625rem] text-ygf-black">{{ counterPrice }}</strong>
              <span>{{ $t('mkt.hero.payWhatYouWeigh') }}</span>
            </template>
          </p>

          <div
            class="mt-6 grid grid-cols-[1.4fr_1fr] gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center lg:justify-start sm:gap-4"
          >
            <!-- Magnetic on desktop: drifts toward the pointer (useMagnetic). -->
            <span ref="heroCta" class="inline-flex">
              <NuxtLinkLocale
                v-if="shopEnabled"
                to="/menu?compose"
                data-testid="hero-order"
                class="hero-btn hero-btn-primary w-full"
              >
                {{ $t('mkt.hero.order') }}
                <MktIcon name="arrow-right" :size="18" />
              </NuxtLinkLocale>
              <NuxtLinkLocale
                v-else
                :to="menuOpen ? '/menu' : '/concept'"
                data-testid="hero-menu"
                class="hero-btn hero-btn-primary w-full"
              >
                {{ menuOpen ? $t('mkt.hero.cta') : $t('mkt.hero.ctaConcept') }}
              </NuxtLinkLocale>
            </span>
            <NuxtLinkLocale
              v-if="shopEnabled"
              to="/menu"
              class="hero-btn hero-btn-secondary"
              data-testid="hero-see-menu"
            >
              {{ $t('mkt.hero.seeMenu') }}
            </NuxtLinkLocale>
            <a
              v-else
              :href="brand.mapsUrl"
              target="_blank"
              rel="noopener"
              class="hero-btn hero-btn-secondary"
              data-testid="hero-directions"
            >
              <MktIcon name="map-pin" :size="18" />
              {{ $t('mkt.actionBar.directions') }}
            </a>
          </div>

          <!-- Desktop: status, address, price at a glance -->
          <div
            class="hidden lg:flex mt-8 flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ygf-gray-600"
          >
            <MktOpenStatus />
            <span class="inline-flex items-center gap-1.5">
              <span class="text-ygf-orange-on-white"
                ><MktIcon name="map-pin-fill" :size="16"
              /></span>
              {{ brand.address.street }}, {{ brand.address.city }}
            </span>
          </div>
        </div>

        <!-- Three layers: scroll parallax (outer), pop-in (middle), levitation of the image (.hero-bowl-float). -->
        <div ref="heroBowl" class="relative z-[1] flex justify-center order-1 lg:order-none">
          <div ref="heroBowlPop" class="relative">
            <!-- Rising steam -->
            <div aria-hidden="true">
              <span class="steam-wisp" style="left: 42%; animation-delay: 0s" />
              <span class="steam-wisp" style="left: 50%; animation-delay: 1.1s" />
              <span class="steam-wisp" style="left: 58%; animation-delay: 2.2s" />
            </div>
            <!-- The width is on the <picture> (a flex item: a percentage width on the image alone resolved to 0 until
                 the file arrived and the hero jumped). `sizes` is what that box really measures. -->
            <div class="hero-bowl-float">
              <MktPicture
                src="/images/hero/bowl-creative"
                :widths="[640, 1000, 1400]"
                :fallback-width="1000"
                :fallback-height="1299"
                :alt="$t('mkt.hero.bowl_alt')"
                sizes="(min-width: 1024px) min(38vw, 532px), min(66vw, 300px)"
                eager
                class="block w-[66vw] max-w-[300px] lg:w-[38vw] lg:max-w-xl"
                img-class="w-full drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 2 · How it works: before choosing a broth, a newcomer needs the counter explained (Sur place / En ligne) ── -->
    <section class="bg-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <div v-reveal class="mb-6 sm:mb-10 sm:text-center">
          <h2 class="font-display font-bold text-3xl sm:text-4xl text-ygf-black tracking-tight">
            {{ $t('mkt.home.steps.title') }}
          </h2>
          <p class="mt-2 text-gray-600">{{ $t('mkt.home.steps.subtitle') }}</p>
        </div>
        <MktSteps
          key-prefix="mkt.home.steps"
          :switchable="shopEnabled"
          :preparation-minutes="preparationMinutes"
        />
      </div>
    </section>

    <!-- ── 3 · Signature broths: the bowls are the tabs; the broth story is on Concept ── -->
    <section class="bg-ygf-cream">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <div v-reveal class="text-center mb-8 sm:mb-10">
          <span class="section-label">{{ $t('mkt.broths.label') }}</span>
          <h2 class="font-display font-bold text-3xl sm:text-4xl text-ygf-black tracking-tight">
            {{ $t('mkt.broths.title') }}
          </h2>
          <p class="mt-3 text-gray-600 max-w-2xl mx-auto">{{ $t('mkt.broths.subtitle') }}</p>
        </div>
        <MktBrothSelector />
      </div>
    </section>

    <!-- ── 4 · How much is my bowl? (the counter's price by weight) ── -->
    <section class="bg-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <MktEstimator />
      </div>
    </section>

    <!-- ── 5 · Cinematic ingredient loop ── -->
    <MktVideoBand />

    <!-- ── 6 · Why Yangguofu, with the brand's figures ── -->
    <section class="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
      <p v-reveal class="text-center font-serifzh text-ygf-orange-text mb-2">
        {{ $t('mkt.home.stats.slogan') }}
      </p>
      <h2
        v-reveal="1"
        class="text-center font-display font-bold text-3xl sm:text-4xl text-ygf-black mb-10"
      >
        {{ $t('mkt.home.why.title') }}
      </h2>
      <div class="grid gap-6 sm:grid-cols-3">
        <article
          v-for="(pillar, i) in ['broth', 'fresh', 'custom']"
          :key="pillar"
          v-reveal="i + 1"
          class="bg-white border border-ygf-orange-100 rounded-ygf-card shadow-ygf-sm p-6 text-center"
        >
          <div
            class="w-12 h-12 mx-auto mb-3 text-ygf [&>svg]:w-full [&>svg]:h-full"
            aria-hidden="true"
            v-html="[bowlSteamIcon, leafIcon, scalesIcon][i]"
          />
          <h3 class="font-display font-bold text-lg text-ygf-black mb-2">
            {{ $t(`mkt.home.why.${pillar}.title`) }}
          </h3>
          <p class="text-sm text-gray-600 leading-relaxed">
            {{ $t(`mkt.home.why.${pillar}.desc`) }}
          </p>
        </article>
      </div>
      <dl class="mt-10 grid grid-cols-3 gap-4 text-center" data-testid="brand-figures">
        <div v-for="figure in BRAND_FIGURES" :key="figure.key" class="flex flex-col">
          <dt class="order-2 text-sm text-gray-600">
            {{ $t(`mkt.about.counters.${figure.key}`) }}
          </dt>
          <dd
            class="font-display font-black text-3xl sm:text-4xl text-ygf-orange-text tabular-nums"
          >
            {{ figure.value }}
          </dd>
        </div>
      </dl>
    </section>

    <!-- ── 7 · Practical info and the map ── -->
    <section class="bg-ygf-cream">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <h2
          v-reveal
          class="font-display font-bold text-3xl sm:text-4xl text-ygf-black tracking-tight mb-6"
        >
          {{ $t('mkt.practical.title') }}
        </h2>
        <MktPracticalInfo />
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  background: radial-gradient(
    120% 80% at 50% 0%,
    var(--ygf-orange-bg) 0%,
    var(--ygf-cream) 55%,
    #fbe3cc 100%
  );
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0.75rem 1.5rem;
  border: 2px solid transparent;
  border-radius: var(--radius-btn);
  font-weight: 600;
  transition:
    background-color 300ms ease-out,
    border-color 300ms ease-out,
    color 300ms ease-out;
}

.hero-btn:focus-visible {
  outline: 2px solid var(--ygf-focus);
  outline-offset: 2px;
}

/* Ink on the brand orange (6.7:1): white on it would be 2.6:1. */
.hero-btn-primary {
  background: var(--ygf-orange);
  border-color: var(--ygf-orange);
  color: var(--ygf-black);
  box-shadow: 0 4px 20px rgb(242 123 32 / 20%);
}

.hero-btn-secondary {
  background: var(--ygf-white);
  border-color: var(--ygf-orange);
  color: var(--ygf-orange-text);
}

@media (hover: hover) {
  .hero-btn-primary:hover {
    background: var(--ygf-orange-light);
    border-color: var(--ygf-orange-light);
  }

  .hero-btn-secondary:hover {
    background: var(--ygf-orange-bg);
  }
}

/* Hero bowl levitation, as on the old site: up 10px and back, 2.2s each way (GSAP sine.inOut yoyo). */
@media (prefers-reduced-motion: no-preference) {
  .hero-bowl-float {
    animation: hero-bowl-levitate 2.2s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite alternate;
  }
}

@keyframes hero-bowl-levitate {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-10px);
  }
}
</style>
