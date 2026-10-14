<template>
  <div>
    <!-- ── Hero: warm background, price per 100 g, top-view bowl under steam ── -->
    <section class="static-menu-hero overflow-hidden">
      <div
        class="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20 flex flex-col items-center gap-10 text-center md:flex-row md:justify-between md:gap-12 md:text-left"
      >
        <div class="max-w-[620px]">
          <h1
            v-reveal
            class="font-display font-bold text-4xl sm:text-5xl text-ygf-black leading-tight tracking-tight mb-3"
          >
            {{ $t('mkt.menu.title') }}
          </h1>
          <p v-reveal="1" class="text-gray-600 text-lg leading-relaxed max-w-[520px]">
            {{ $t('mkt.menu.subtitle') }}
          </p>
          <div
            v-reveal="2"
            class="inline-flex flex-wrap items-baseline gap-x-3 gap-y-2 mt-6 px-8 py-4 bg-ygf text-ygf-black rounded-ygf-lg shadow-ygf-md"
          >
            <strong class="text-2xl font-black leading-tight whitespace-nowrap">{{
              $t('mkt.menu.price_per_100g')
            }}</strong>
            <span class="text-sm font-medium text-ygf-black/85">{{
              $t('mkt.menu.price_tagline')
            }}</span>
          </div>
        </div>

        <div
          class="relative shrink-0 w-[min(60vw,280px)] md:w-[min(30vw,340px)]"
          aria-hidden="true"
        >
          <span class="steam-wisp" style="left: 42%; animation-delay: 0s" />
          <span class="steam-wisp" style="left: 50%; animation-delay: 1.1s" />
          <span class="steam-wisp" style="left: 58%; animation-delay: 2.2s" />
          <MktPicture
            :src="`/images/bowls/${BROTHS[0].slug}-top`"
            :widths="[320, 560, 800]"
            :fallback-width="560"
            :fallback-height="560"
            alt=""
            sizes="(min-width: 768px) 340px, 60vw"
            eager
            class="block w-full"
            img-class="static-menu-bowl w-full"
          />
        </div>
      </div>
    </section>

    <!-- ── First visit: where to start ── -->
    <section class="bg-white px-4 sm:px-6 py-20 md:py-28">
      <div
        v-reveal
        class="max-w-[760px] mx-auto bg-ygf-bg border border-ygf-orange/20 rounded-ygf-lg p-8 sm:p-10 text-center"
      >
        <span
          class="inline-block mb-4 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ygf-orange-text"
          >{{ $t('mkt.menu.newcomer.label') }}</span
        >
        <h2 class="font-display font-bold text-3xl sm:text-4xl text-ygf-black tracking-tight">
          {{ $t('mkt.menu.newcomer.title') }}
        </h2>
        <p class="text-gray-600 max-w-[560px] mx-auto mt-3 leading-relaxed">
          {{ $t('mkt.menu.newcomer.desc') }}
        </p>
      </div>
    </section>

    <!-- ── Broths ── -->
    <section class="bg-ygf-cream px-4 sm:px-6 py-20 md:py-28">
      <div class="max-w-5xl mx-auto">
        <div v-reveal class="mb-12">
          <h2
            class="font-display font-bold text-3xl sm:text-4xl text-ygf-black tracking-tight mb-3"
          >
            {{ $t('mkt.menu.broths_title') }}
          </h2>
          <p class="text-gray-600 text-lg leading-relaxed max-w-[540px]">
            {{ $t('mkt.menu.allergens_note') }}
          </p>
        </div>
        <div class="flex flex-col gap-4">
          <article
            v-for="broth in BROTHS"
            :key="broth.key"
            v-reveal
            class="broth-card grid gap-5 items-center p-6 rounded-ygf-card bg-white shadow-ygf-sm md:grid-cols-[auto_1fr]"
            data-testid="static-menu-broth"
          >
            <MktPicture
              :src="`/images/bowls/${broth.slug}-top`"
              :widths="[320, 560, 800]"
              :fallback-width="560"
              :fallback-height="560"
              :alt="$t(`mkt.broths.${broth.key}.name`)"
              sizes="110px"
              class="block w-[100px]"
              img-class="broth-card-photo w-[100px] h-[100px] object-cover rounded-ygf-card"
            />
            <div>
              <h3 class="font-display font-bold text-xl text-ygf-black tracking-tight mb-1">
                {{ $t(`mkt.broths.${broth.key}.name`) }}
              </h3>
              <p class="font-serifzh text-sm text-ygf-orange-text mb-3">
                {{ $t(`mkt.broths.${broth.key}.chinese`) }}
              </p>
              <p class="text-sm text-gray-600 leading-relaxed">
                {{ $t(`mkt.broths.${broth.key}.desc`) }}
              </p>
              <MktBrothMeta :broth="broth" class="mt-3" />
              <p class="mt-2 text-xs text-gray-600">
                <strong class="font-semibold text-ygf-black">{{
                  $t('mkt.broths.allergens_label')
                }}</strong>
                : {{ $t(`mkt.broths.${broth.key}.allergens`) }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ── Ingredients, filtered by category ── -->
    <section class="bg-white px-4 sm:px-6 py-20 md:py-28">
      <div class="max-w-5xl mx-auto">
        <div v-reveal class="mb-12">
          <h2
            class="font-display font-bold text-3xl sm:text-4xl text-ygf-black tracking-tight mb-3"
          >
            {{ $t('mkt.menu.ingredients_title') }}
          </h2>
          <p class="text-gray-600 text-lg leading-relaxed max-w-[540px]">
            {{ $t('mkt.menu.ingredients_subtitle') }}
          </p>
        </div>
        <p
          v-reveal
          class="inline-block mb-6 px-4 py-2 text-sm font-semibold text-ygf-orange-text bg-ygf-bg border border-ygf-orange/20 rounded-ygf-btn"
        >
          {{ $t('mkt.menu.veg_note') }}
        </p>
        <div v-reveal class="flex flex-wrap gap-2 mb-8">
          <button
            v-for="filter in INGREDIENT_FILTERS"
            :key="filter"
            type="button"
            :aria-pressed="filter === activeFilter"
            class="min-h-11 px-4 py-3 rounded-ygf-btn border text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            :class="
              filter === activeFilter
                ? 'bg-ygf border-ygf text-ygf-black'
                : 'bg-white border-ygf-orange/10 text-gray-600 hover:bg-ygf hover:border-ygf hover:text-ygf-black'
            "
            data-testid="static-menu-filter"
            @click="activeFilter = filter"
          >
            {{ $t(`mkt.menu.categories.${filter}`) }}
          </button>
        </div>
        <TransitionGroup
          tag="ul"
          name="ingredient"
          class="flex flex-wrap justify-center gap-x-3 gap-y-2"
          aria-live="polite"
        >
          <li
            v-for="ingredient in shownIngredients"
            :key="ingredient.key"
            class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-ygf-btn transition-colors duration-300 hover:border-ygf/45 hover:bg-ygf-bg"
            data-testid="static-menu-ingredient"
          >
            <span
              class="block w-4 h-4 text-ygf [&>svg]:w-full [&>svg]:h-full"
              aria-hidden="true"
              v-html="CATEGORY_ICONS[ingredient.category]"
            />
            <span class="text-sm font-medium text-ygf-black whitespace-nowrap">{{
              $t(`mkt.menu.ingredients.${ingredient.key}`)
            }}</span>
          </li>
        </TransitionGroup>
      </div>
    </section>

    <!-- ── Price by weight: fill, weigh, pay ── -->
    <section class="bg-ygf-cream px-4 sm:px-6 py-20 md:py-28 text-center">
      <div class="max-w-5xl mx-auto">
        <div v-reveal class="mb-12">
          <h2
            class="font-display font-bold text-3xl sm:text-4xl text-ygf-black tracking-tight mb-3"
          >
            {{ $t('mkt.menu.pricing_title') }}
          </h2>
          <p class="text-gray-600 text-lg leading-relaxed max-w-[540px] mx-auto">
            {{ $t('mkt.menu.pricing_desc') }}
          </p>
        </div>
        <div
          ref="pricingSteps"
          v-reveal
          class="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row sm:flex-wrap"
        >
          <template v-for="(step, i) in PRICING_STEPS" :key="step.label">
            <span
              v-if="i > 0"
              class="block w-5 h-5 text-gray-400 rotate-90 sm:rotate-0 [&>svg]:w-full [&>svg]:h-full"
              aria-hidden="true"
              v-html="arrowRightIcon"
            />
            <div class="flex flex-col items-center gap-3" data-pop-in>
              <span
                class="w-16 h-16 rounded-full bg-ygf text-ygf-black flex items-center justify-center"
                aria-hidden="true"
              >
                <span class="block w-12 h-12 [&>svg]:w-full [&>svg]:h-full" v-html="step.icon" />
              </span>
              <span class="text-sm font-medium text-ygf-black">{{ $t(step.label) }}</span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- ── How much is my bowl? (audit 1a/1b: the estimator on Home and Menu) ── -->
    <section class="bg-white px-4 sm:px-6 py-20 md:py-28">
      <div class="max-w-6xl mx-auto">
        <MktEstimator />
      </div>
    </section>

    <!-- ── The art of eating: moved from the home page, captioned, a swipe row on a phone ── -->
    <section class="bg-ygf-cream px-4 sm:px-6 py-20 md:py-28">
      <div class="max-w-6xl mx-auto">
        <h2
          v-reveal
          class="text-center font-display font-bold text-3xl sm:text-4xl text-ygf-black tracking-tight mb-10"
        >
          {{ $t('mkt.home.gallery.title') }}
        </h2>
        <MktGallery />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/*
 * The menu while the shop is switched off (NUXT_PUBLIC_SHOP_ENABLED=false, brand staticMenuWhenShopClosed): the static
 * menu of the old ygfliege.be (broths, ingredients, price by weight), with nothing to order. pages/menu.vue swaps in the
 * dynamic, orderable menu once the shop is on.
 */
import { computed, ref } from 'vue'
import MktBrothMeta from '~/components/mkt/MktBrothMeta.vue'
import MktEstimator from '~/components/mkt/MktEstimator.vue'
import MktGallery from '~/components/mkt/MktGallery.vue'
import MktPicture from '~/components/mkt/MktPicture.vue'
import { usePopInOnView } from '~/composables/useMktMotion'
import { BROTHS } from '~/data/broths'
import {
  INGREDIENT_FILTERS,
  type IngredientCategory,
  type IngredientFilter,
  ingredientsFor,
} from '~/data/menuIngredients'
// Phosphor icons (same set as the old site); raw SVGs, tinted via currentColor.
import arrowRightIcon from '~/assets/icons/arrow-right.svg?raw'
import bowlFoodIcon from '~/assets/icons/bowl-food.svg?raw'
import carrotIcon from '~/assets/icons/carrot.svg?raw'
import cowIcon from '~/assets/icons/cow.svg?raw'
import creditCardIcon from '~/assets/icons/credit-card.svg?raw'
import cubeIcon from '~/assets/icons/cube.svg?raw'
import fishIcon from '~/assets/icons/fish.svg?raw'
import packageIcon from '~/assets/icons/package.svg?raw'
import plantIcon from '~/assets/icons/plant.svg?raw'
import scalesIcon from '~/assets/icons/scales.svg?raw'

const CATEGORY_ICONS: Record<IngredientCategory, string> = {
  vegetables: carrotIcon,
  mushrooms: plantIcon,
  meat: cowIcon,
  seafood: fishIcon,
  tofu: cubeIcon,
  noodles: bowlFoodIcon,
}

const PRICING_STEPS = [
  { label: 'mkt.menu.pricing_step1', icon: packageIcon },
  { label: 'mkt.menu.pricing_step2', icon: scalesIcon },
  { label: 'mkt.menu.pricing_step3', icon: creditCardIcon },
] as const

const activeFilter = ref<IngredientFilter>('all')

// Fill, weigh, pay: the steps pop in one after the other as the diagram comes into view (old site's GSAP pop-in).
const pricingSteps = ref<HTMLElement | null>(null)
usePopInOnView(pricingSteps)
const shownIngredients = computed(() => ingredientsFor(activeFilter.value))

const { t } = useI18n()

useSeoMeta({
  title: `${t('mkt.menu.title')} - ${t('brandName')}`,
  ogType: 'website',
  ogTitle: `${t('mkt.menu.title')} - ${t('brandName')}`,
  description: t('mkt.menu.meta_desc'),
  ogDescription: t('mkt.menu.meta_desc'),
  ...useLocaleSeoMeta(),
})
</script>

<style scoped>
/* Same warm background as the home hero of the old site. */
.static-menu-hero {
  background: radial-gradient(
    120% 80% at 50% 0%,
    theme('colors.ygf.bg') 0%,
    theme('colors.ygf.cream') 55%,
    #fbe3cc 100%
  );
}

.static-menu-hero .steam-wisp {
  bottom: 88%;
}

:deep(.static-menu-bowl) {
  filter: drop-shadow(0 24px 48px theme('colors.ygf.DEFAULT / 28%'));
}

.broth-card {
  transition:
    transform 300ms ease-out,
    box-shadow 300ms ease-out;
}

.broth-card:hover {
  transform: translateY(-4px);
  box-shadow: theme('boxShadow.ygf-md');
}

:deep(.broth-card-photo) {
  transition: transform 0.5s ease-out;
}

.broth-card:hover :deep(.broth-card-photo) {
  transform: scale(1.08) rotate(2deg);
}

.ingredient-enter-active,
.ingredient-leave-active {
  transition:
    opacity 250ms ease,
    transform 250ms ease;
}

.ingredient-enter-from,
.ingredient-leave-to {
  opacity: 0;
  transform: scale(0.92);
}

.ingredient-leave-active {
  position: absolute;
}

@media (prefers-reduced-motion: reduce) {
  .broth-card,
  .broth-card:hover,
  .broth-card:hover :deep(.broth-card-photo),
  .ingredient-enter-active,
  .ingredient-leave-active {
    transition: none;
    transform: none;
  }
}
</style>
