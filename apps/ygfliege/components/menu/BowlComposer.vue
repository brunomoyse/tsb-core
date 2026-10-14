<template>
  <div
    ref="panelRef"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bowl-composer-title"
    data-testid="bowl-composer"
    class="bg-white w-full h-full sm:h-[min(92dvh,800px)] sm:max-w-6xl sm:rounded-ygf-lg shadow-ygf-lg flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px] overflow-hidden"
    @click.stop
  >
    <div class="flex flex-col flex-1 min-h-0 min-w-0">
      <!-- Header: back (phone), title, close; the step bars (phone) or tabs (desktop) under it -->
      <header
        class="shrink-0 bg-ygf-cream border-b border-ygf-border px-5 pt-4 pb-3 lg:bg-white lg:border-b-0 lg:px-9 lg:pt-8 lg:pb-4"
      >
        <div class="flex items-center gap-2">
          <button
            v-if="p && stepIndex > 0"
            type="button"
            data-testid="bowl-composer-back"
            :aria-label="$t('composer.back')"
            class="lg:hidden shrink-0 w-11 h-11 -ml-2.5 inline-flex items-center justify-center rounded-full text-ygf-black hover:bg-white transition-colors"
            @click="goTo(stepIndex - 1)"
          >
            <MktIcon name="caret-left" :size="22" />
          </button>
          <div class="flex-1 min-w-0">
            <span class="section-label !mb-0.5" data-testid="bowl-composer-eyebrow">{{
              $t(editItem ? 'menu.editing' : 'composer.eyebrow')
            }}</span>
            <h2
              id="bowl-composer-title"
              translate="no"
              class="section-title text-xl lg:text-3xl break-words"
            >
              {{ p?.name ?? $t('composer.title') }}
            </h2>
          </div>
          <button
            type="button"
            data-testid="bowl-composer-close"
            :aria-label="$t('common.close')"
            class="shrink-0 w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-full text-ygf-gray-600 hover:text-ygf-black hover:bg-ygf-bg transition-colors"
            @click="emit('close')"
          >
            <MktIcon name="x" :size="22" />
          </button>
        </div>

        <nav
          v-if="p && steps.length > 1"
          :aria-label="$t('composer.eyebrow')"
          class="mt-3 flex gap-1.5 lg:mt-6 lg:gap-2"
        >
          <button
            v-for="(step, i) in steps"
            :key="stepKey(step)"
            type="button"
            :data-testid="`bowl-composer-step-${i}`"
            :aria-current="i === stepIndex ? 'step' : undefined"
            class="group flex-1 py-2 lg:flex-none lg:py-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="goTo(i)"
          >
            <span
              aria-hidden="true"
              class="block h-1 rounded-full transition-colors duration-300 lg:hidden"
              :class="i <= stepIndex ? 'bg-ygf' : 'bg-ygf-orange/15'"
            />
            <span
              class="max-lg:sr-only lg:inline-flex lg:items-center lg:gap-2 lg:min-h-11 lg:px-5 lg:rounded-full lg:border lg:text-sm lg:font-semibold lg:transition-colors lg:duration-300"
              :class="
                i === stepIndex
                  ? 'lg:bg-ygf-black lg:border-ygf-black lg:text-white'
                  : 'lg:bg-white lg:border-ygf-orange/20 lg:text-ygf-black lg:group-hover:bg-ygf-bg'
              "
            >
              <span
                v-if="stepDone(step)"
                class="hidden lg:inline-flex"
                :class="i === stepIndex ? 'text-ygf' : 'text-primary'"
              >
                <MktIcon name="check-circle-fill" :size="16" />
              </span>
              {{ stepName(step) }}
            </span>
          </button>
        </nav>
        <p
          v-if="p && steps.length > 1"
          aria-live="polite"
          class="text-xs text-ygf-gray-600 mt-0.5 lg:sr-only"
        >
          {{ stepLabel }}
        </p>
      </header>

      <!-- The product could not be loaded (or no longer exists): say so instead of an empty composer -->
      <div v-if="!p" class="flex-1 px-5 py-8 lg:px-9">
        <LoadError
          :message="$t('menu.productLoadFailed')"
          data-testid="bowl-composer-load-error"
          class="px-4 py-3 bg-ygf-orange-50 border border-ygf-orange-200 rounded-lg text-ygf-black"
          @retry="emit('retry')"
        />
      </div>

      <!-- One panel per step on a sliding track; only the current one is reachable (the others are inert). -->
      <div v-else class="relative flex-1 min-h-0 overflow-hidden">
        <div
          class="composer-track flex h-full"
          :style="{ transform: `translateX(-${stepIndex * 100}%)` }"
        >
          <section
            v-for="(step, i) in steps"
            :key="stepKey(step)"
            :ref="(el) => setPanel(i, el)"
            :inert="i !== stepIndex"
            :aria-labelledby="`bowl-composer-step-title-${i}`"
            class="relative shrink-0 basis-full h-full overflow-y-auto overscroll-contain no-scrollbar"
            :data-testid="`bowl-composer-panel-${i}`"
            @scroll.passive="step.kind === 'ingredients' && onIngredientsScroll(i)"
          >
            <!-- Broth: one card per broth, its photo and allergens -->
            <div v-if="step.kind === 'broth'" class="px-5 py-5 lg:px-9 lg:py-3">
              <h3
                :id="`bowl-composer-step-title-${i}`"
                class="section-title text-[1.375rem] lg:text-2xl"
              >
                {{ $t('composer.brothTitle') }}
              </h3>
              <p class="text-sm text-ygf-gray-600 mt-1 mb-4">{{ $t('composer.brothSubtitle') }}</p>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 lg:gap-3.5">
                <button
                  v-for="broth in step.broths"
                  :key="broth.slug"
                  type="button"
                  :data-testid="`bowl-composer-choice-${broth.variants[0]!.id}`"
                  :data-composer-step="i"
                  :aria-pressed="pickedBrothSlug === broth.slug"
                  class="broth-card text-left flex flex-col gap-1.5 p-2.5 pb-3 rounded-ygf-card border-2 shadow-ygf-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  :class="
                    pickedBrothSlug === broth.slug
                      ? 'border-primary bg-ygf-bg'
                      : 'border-transparent bg-white'
                  "
                  @click="pickBroth(broth)"
                >
                  <MktPicture
                    :src="`/images/bowls/${broth.slug}-top`"
                    :widths="[320, 560]"
                    :fallback-width="320"
                    :fallback-height="320"
                    alt=""
                    sizes="(min-width: 1024px) 150px, (min-width: 640px) 30vw, 45vw"
                    class="block"
                    img-class="broth-card-img w-full aspect-square object-contain"
                  />
                  <span translate="no" class="text-sm font-semibold leading-snug text-ygf-black">
                    {{ brothName(broth) }}
                  </span>
                  <span
                    v-if="brothAllergens(broth.slug)"
                    class="text-xs leading-snug text-ygf-gray-600"
                  >
                    {{ $t('composer.allergens', { list: brothAllergens(broth.slug) }) }}
                  </span>
                  <span
                    v-if="toCents(broth.variants[0]!.priceModifier) !== 0"
                    class="text-xs text-ygf-orange-text"
                  >
                    {{ modifierLabel(broth.variants[0]!) }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Ingredients: category chips and the count stick on top, tiles below (tap = one more, "-" = one less) -->
            <div v-else-if="step.kind === 'ingredients'">
              <div class="px-5 pt-5 lg:px-9 lg:pt-3">
                <h3
                  :id="`bowl-composer-step-title-${i}`"
                  class="section-title text-[1.375rem] lg:text-2xl"
                >
                  {{ $t('composer.ingredientsTitle') }}
                </h3>
                <p class="text-sm text-ygf-gray-600 mt-1">
                  {{ $t('composer.ingredientsSubtitle') }}
                </p>
              </div>
              <div
                :ref="(el) => setIngredientsHeader(el)"
                class="sticky top-0 z-[2] bg-white px-5 pt-4 pb-3 lg:px-9 shadow-[0_6px_12px_-10px_rgba(242,123,32,0.3)]"
              >
                <div
                  v-if="categories.length > 1"
                  class="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0 lg:flex-wrap"
                >
                  <button
                    v-for="category in categories"
                    :key="category.id"
                    type="button"
                    class="chip shrink-0"
                    :class="{ 'chip-selected': activeCategory === category.id }"
                    :aria-current="activeCategory === category.id ? 'true' : undefined"
                    @click="scrollToCategory(i, category.id)"
                  >
                    <MktIcon :name="KIND_ICONS[categoryKind(category)]" :size="16" />
                    <span translate="no">{{ categoryLabel(category) }}</span>
                    <span
                      v-if="countIn(category) > 0"
                      class="min-w-5 h-5 px-1.5 rounded-full bg-ygf text-ygf-black text-xs font-bold leading-5 text-center tabular-nums"
                    >
                      {{ countIn(category) }}
                    </span>
                  </button>
                </div>
                <div
                  class="flex items-center gap-3.5 text-xs text-ygf-gray-600"
                  :class="{ 'mt-3': categories.length > 1 }"
                >
                  <div
                    v-if="progress.min > 0"
                    class="relative flex-1 lg:max-w-[360px] h-1.5 rounded-full bg-ygf-orange/15"
                    aria-hidden="true"
                  >
                    <div
                      class="h-full rounded-full composer-bar"
                      :class="progress.missing > 0 ? 'bg-ygf-orange-300' : 'bg-ygf'"
                      :style="{ width: `${progressPct(progress.count)}%` }"
                    />
                    <span
                      class="absolute -top-[3px] w-0.5 h-3 rounded-sm bg-ygf-black"
                      :style="{ left: `${progressPct(progress.min)}%` }"
                    />
                  </div>
                  <p class="tabular-nums" aria-live="polite">
                    <template v-if="progress.min > 0">
                      <span class="font-semibold text-ygf-black">{{
                        $t('composer.selectedCount', { count: progress.count, max: progress.max })
                      }}</span>
                      <template v-if="progress.missing > 0">
                        &middot; {{ $t('composer.missing', { count: progress.missing }) }}
                      </template>
                    </template>
                    <template v-else>{{
                      $t('composer.ingredientsSummary', { count: progress.count }, progress.count)
                    }}</template>
                  </p>
                </div>
              </div>

              <div class="px-5 pt-3 pb-6 lg:px-9 space-y-5">
                <section
                  v-for="category in categories"
                  :key="category.id"
                  :data-composer-category="category.id"
                  :aria-label="categories.length > 1 ? categoryLabel(category) : undefined"
                >
                  <h4
                    v-if="categories.length > 1"
                    translate="no"
                    class="text-sm font-semibold text-ygf-gray-600 mb-2"
                  >
                    {{ categoryLabel(category) }}
                  </h4>
                  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 lg:gap-3">
                    <div
                      v-for="choice in category.choices"
                      :key="choice.id"
                      :data-testid="`bowl-composer-choice-${choice.id}`"
                      :data-composer-step="i"
                      class="ingredient-tile relative min-h-[5.25rem] lg:min-h-24 rounded-ygf-card border-[1.5px]"
                      :class="[
                        quantityOf(choice) > 0
                          ? 'border-primary bg-ygf-bg'
                          : 'border-ygf-orange/15 bg-white',
                        { 'is-popped': popped === choice.id },
                      ]"
                    >
                      <button
                        type="button"
                        :data-testid="`bowl-composer-choice-inc-${choice.id}`"
                        :aria-label="$t('composer.addIngredient', { name: choice.name })"
                        :disabled="!canIncrement(choice)"
                        class="absolute inset-0 w-full rounded-ygf-card cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        @click="addIngredient(choice)"
                      />
                      <span
                        class="relative pointer-events-none flex flex-col justify-between h-full gap-2 p-3 lg:p-3.5"
                      >
                        <span
                          translate="no"
                          class="text-sm lg:text-[0.9375rem] font-semibold leading-snug text-ygf-black break-words pr-8"
                        >
                          {{ choice.name }}
                        </span>
                        <span class="text-xs text-ygf-gray-600">{{ priceLabel(choice) }}</span>
                      </span>
                      <span
                        :data-testid="`bowl-composer-choice-qty-${choice.id}`"
                        aria-hidden="true"
                        class="absolute top-2 right-2 min-w-6 h-6 px-1.5 rounded-full bg-ygf text-ygf-black text-xs font-bold leading-6 text-center tabular-nums pointer-events-none"
                        :class="{ invisible: quantityOf(choice) === 0 }"
                        >{{ quantityOf(choice) }}</span
                      >
                      <button
                        type="button"
                        :data-testid="`bowl-composer-choice-dec-${choice.id}`"
                        :aria-label="$t('composer.removeIngredient', { name: choice.name })"
                        :disabled="quantityOf(choice) === 0"
                        class="absolute right-1 bottom-1 w-9 h-9 rounded-full bg-white shadow-ygf-sm text-lg leading-none text-ygf-black inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        :class="{ invisible: quantityOf(choice) === 0 }"
                        @click="decrementChoice(choice)"
                      >
                        <MktIcon name="minus" :size="16" />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <!-- Pick-one: the heat of the chosen broth, or any other group (spice level, sauce) -->
            <div v-else class="px-5 py-5 lg:px-9 lg:py-3">
              <h3
                :id="`bowl-composer-step-title-${i}`"
                translate="no"
                class="section-title text-[1.375rem] lg:text-2xl"
              >
                {{ step.kind === 'variant' ? $t('composer.variantTitle') : step.group.name }}
              </h3>
              <p
                v-if="step.kind === 'variant' && pickedBroth"
                translate="no"
                class="text-sm text-ygf-gray-600 mt-1"
              >
                {{ brothName(pickedBroth) }}
              </p>
              <div
                class="mt-4 flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:gap-3.5 lg:max-w-2xl"
              >
                <button
                  v-for="choice in optionsOf(step)"
                  :key="choice.id"
                  type="button"
                  :data-testid="`bowl-composer-choice-${choice.id}`"
                  :data-composer-step="i"
                  :aria-pressed="quantityOf(choice) > 0"
                  class="flex items-center justify-between gap-3 min-h-16 px-4.5 py-3 rounded-ygf-card border-2 text-left transition-colors duration-200 lg:flex-col lg:items-start lg:justify-start lg:p-4.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  :class="
                    quantityOf(choice) > 0
                      ? 'border-primary bg-ygf-bg'
                      : 'border-ygf-orange/15 bg-white hover:bg-ygf-bg'
                  "
                  @click="selectExclusive(choice)"
                >
                  <span class="min-w-0">
                    <span
                      translate="no"
                      class="block text-base lg:text-[1.0625rem] font-semibold text-ygf-black"
                      >{{ step.kind === 'variant' ? variantLabel(choice.name) : choice.name }}</span
                    >
                    <span
                      v-if="toCents(choice.priceModifier) !== 0"
                      class="block text-xs text-ygf-gray-600"
                    >
                      {{ modifierLabel(choice) }}
                    </span>
                  </span>
                  <span
                    v-if="(heatLevel(choice.name) ?? 0) > 0"
                    class="inline-flex items-center gap-0.5 text-ygf-red shrink-0"
                    role="img"
                    :aria-label="$t('menu.spicy')"
                  >
                    <MktIcon
                      v-for="n in heatLevel(choice.name) ?? 0"
                      :key="n"
                      name="pepper-fill"
                      :size="18"
                    />
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- Summary: a sticky footer on a phone, the right-hand rail on a desktop. One element, so one set of controls. -->
    <footer
      v-if="p"
      class="shrink-0 bg-white border-t border-ygf-border shadow-[0_-8px_30px_rgba(242,123,32,0.12)] px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:bg-ygf-cream lg:border-t-0 lg:border-l lg:shadow-none lg:p-7 lg:flex lg:flex-col lg:gap-4 lg:min-h-0"
    >
      <div class="hidden lg:grid relative h-[190px] place-items-center" aria-hidden="true">
        <div class="composer-steam"><span /><span /><span /></div>
        <MktPicture
          :key="bowlPhoto"
          :src="bowlPhoto"
          :widths="[320, 560]"
          :fallback-width="320"
          :fallback-height="320"
          alt=""
          sizes="180px"
          class="block w-[180px] composer-bowl"
          img-class="w-full"
          :style="{ transform: `scale(${scale})` }"
        />
      </div>
      <div class="hidden lg:block">
        <p translate="no" class="text-[1.0625rem] font-bold leading-snug text-ygf-black">
          {{ pickedBroth ? brothName(pickedBroth) : $t('composer.pickBroth') }}
        </p>
        <p v-if="pickOneLine" translate="no" class="text-sm text-ygf-gray-600 mt-0.5">
          {{ pickOneLine }}
        </p>
      </div>
      <ul
        class="hidden lg:flex flex-1 min-h-0 flex-col gap-1.5 overflow-y-auto text-sm"
        data-testid="bowl-composer-lines"
      >
        <li
          v-for="line in ingredientLines"
          :key="line.id"
          class="grid grid-cols-[minmax(0,1fr)_2.25rem_4rem] gap-2 py-1 border-b border-ygf-border"
        >
          <span translate="no" class="break-words">{{ line.name }}</span>
          <span class="text-ygf-gray-600 tabular-nums">&times;{{ line.quantity }}</span>
          <span class="text-right tabular-nums">{{ line.price }}</span>
        </li>
      </ul>

      <div
        class="flex items-center gap-3 mb-2.5 lg:mb-0 lg:pt-2 lg:border-t lg:border-ygf-orange/20 lg:items-baseline"
      >
        <div class="w-13 h-13 grid place-items-center shrink-0 lg:hidden" aria-hidden="true">
          <MktPicture
            :key="bowlPhoto"
            :src="bowlPhoto"
            :widths="[320]"
            :fallback-width="320"
            :fallback-height="320"
            alt=""
            sizes="52px"
            class="block w-13 composer-bowl"
            img-class="w-full"
            :style="{ transform: `scale(${scale})` }"
          />
        </div>
        <p
          class="flex-1 min-w-0 text-xs leading-snug text-ygf-gray-600 truncate lg:hidden"
          aria-live="polite"
          data-testid="bowl-composer-summary"
        >
          <template v-if="blockingHint">
            <span translate="no" class="font-medium text-ygf-black">{{ blockingHint.name }}</span>
            &middot; {{ blockingHint.hint }}
          </template>
          <template v-else>{{ summaryLabel || $t('composer.pickBroth') }}</template>
        </p>
        <span class="hidden lg:block flex-1 text-sm text-ygf-gray-600">
          {{ $t('composer.total') }} &middot; {{ basePriceLine }}
        </span>
        <div class="text-right">
          <div
            data-testid="bowl-composer-total"
            class="text-[1.375rem] lg:text-[1.75rem] font-extrabold tracking-tight tabular-nums text-ygf-black"
          >
            {{ formatCents(lineTotalCents) }}
          </div>
          <div class="text-xs text-ygf-gray-600 lg:hidden">{{ basePriceLine }}</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="stepper stepper--sm shrink-0">
          <button
            type="button"
            class="stepper-btn"
            :aria-label="$t('cart.decreaseQtyOf', { name: p.name })"
            :disabled="quantity <= 1"
            @click="quantity--"
          >
            &minus;
          </button>
          <span class="stepper-value">{{ quantity }}</span>
          <button
            type="button"
            class="stepper-btn"
            :aria-label="$t('cart.increaseQtyOf', { name: p.name })"
            :disabled="quantity >= MAX_QUANTITY"
            @click="quantity++"
          >
            +
          </button>
        </div>
        <button
          v-if="!isLastStep"
          type="button"
          data-testid="bowl-composer-next"
          class="btn btn-primary flex-1 justify-center px-4"
          :disabled="!currentStepDone"
          @click="goTo(stepIndex + 1)"
        >
          <span>{{ $t('composer.next') }}</span>
          <MktIcon name="arrow-right" :size="18" />
        </button>
        <button
          v-else
          type="button"
          data-testid="bowl-composer-add-to-cart"
          class="btn btn-primary flex-1 justify-center px-4"
          :disabled="!canAddToCart"
          @click="addToCart"
        >
          <span>{{ $t(editItem ? 'menu.update' : 'menu.addToCart') }}</span>
          <span v-if="canAddToCart" class="tabular-nums">{{ formatCents(lineTotalCents) }}</span>
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { Product, ProductChoice } from '#engine/types'
import {
  type BrothOption,
  type ComposerStep,
  type IngredientCategory,
  type IngredientKind,
  bowlScale,
  heatLevel,
  ingredientCategories,
  ingredientKind,
  ingredientProgress,
  planComposerSteps,
  variantLabel,
} from '~/data/composerSteps'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { formatCents, formatPrice } from '#engine/lib/price'
import { BROTHS } from '~/data/broths'
import LoadError from '#engine/components/LoadError.vue'
import MktIcon from '~/components/mkt/MktIcon.vue'
import MktPicture from '~/components/mkt/MktPicture.vue'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { composerHero } from '~/data/composer'
import { lineSignature } from '#engine/utils/cartLines'
import { toCents } from '#engine/utils/money'
import { useCartItemEdit } from '#engine/composables/useCartItemEdit'
import { useCartStore } from '#engine/stores/cart'
import { useEventBus } from '@vueuse/core'
import { useFocusTrap } from '#engine/composables/useFocusTrap'
import { useGqlQuery } from '#imports'
import { useI18n } from 'vue-i18n'
import { useProductChoices } from '#engine/composables/useProductChoices'
import { useTracking } from '#engine/composables/useTracking'

/**
 * "Malatang sur mesure": the signature build-your-own-bowl flow, one step per screen (audit 2a on a phone, 2b on a
 * desktop): the broth, the ingredients, then the heat of that broth or any other pick-one group. The steps are planned
 * from the product's choice groups (data/composerSteps.ts), so the local seed and the Deliveroo copy both work. The
 * running total shows from the first tap.
 *
 * Selection state, gating and pricing come from useProductChoices, shared with ProductModal, so the cart receives an
 * identical payload from either surface. Opened from "Modifier" on a cart line, it starts from that line and replaces
 * it on confirm.
 */

const { product, orderingDisabled = false } = defineProps<{
  /** Product id; the full record with choice names/prices is fetched here. */
  product: string
  orderingDisabled?: boolean
}>()

const emit = defineEmits<{ close: []; retry: [] }>()

const MAX_QUANTITY = 99

const { t } = useI18n()
const { trackEvent } = useTracking()
const cartStore = useCartStore()
const cartItemAdded = useEventBus(cartItemAddedKey)

const panelRef = ref<HTMLElement | null>(null)
useFocusTrap(panelRef)

// Set when the composer was opened from a customized cart line ("Modifier"): prefill from that line and replace it on
// confirm instead of adding a second one.
const cartItemEdit = useCartItemEdit()
const editItem = cartItemEdit.value?.product.id === product ? cartItemEdit.value : null

const quantity = ref(editItem?.quantity ?? 1)

const PRODUCT_QUERY = /* GraphQL */ `
  query Product($id: ID!) {
    product(id: $id) {
      id
      name
      description
      price
      slug
      isAvailable
      category {
        name
        slug
      }
      choices {
        id
        productId
        choiceGroupId
        priceModifier
        sortOrder
        name
      }
      choiceGroups {
        id
        productId
        minSelections
        maxSelections
        sortOrder
        name
        choices {
          id
          productId
          choiceGroupId
          priceModifier
          sortOrder
          name
        }
      }
    }
  }
`

const { data: dataProduct } = await useGqlQuery<{ product: Product }>(
  PRODUCT_QUERY,
  { id: product },
  { immediate: true, cache: true },
)

const p = dataProduct.value?.product

const {
  choiceGroups,
  isMultiSelectGroup,
  selectedCountIn,
  quantityOf,
  selectedChoiceQuantities,
  selectionList,
  selectedChoice,
  lineTotalCents,
  isGroupSatisfied,
  allGroupsSatisfied,
  groupHint,
  blockingGroup,
  canIncrement,
  incrementChoice,
  decrementChoice,
  selectExclusive,
} = useProductChoices(p, quantity)

// Editing a cart line: start from its selections.
if (editItem?.selectedChoices?.length) {
  selectedChoiceQuantities.value = Object.fromEntries(
    editItem.selectedChoices.map((selection) => [selection.choiceId, selection.quantity]),
  )
}

// ── Steps ────────────────────────────────────────────────────────────────────

/** The broth step of the plan without a pick (its options do not depend on one). */
const brothStep = computed(() =>
  planComposerSteps(choiceGroups.value).find((step) => step.kind === 'broth'),
)
const brothChoices = computed(() =>
  brothStep.value?.kind === 'broth' ? brothStep.value.broths : [],
)
const pickedBroth = computed((): BrothOption | undefined =>
  brothChoices.value.find((broth) => broth.variants.some((choice) => quantityOf(choice) > 0)),
)
const pickedBrothSlug = computed(() => pickedBroth.value?.slug ?? null)

const steps = computed(() => planComposerSteps(choiceGroups.value, pickedBrothSlug.value))
const stepIndex = ref(0)
const isLastStep = computed(() => stepIndex.value >= steps.value.length - 1)

const stepKey = (step: ComposerStep): string =>
  step.kind === 'ingredients' ? 'ingredients' : `${step.kind}-${step.group.id}`

const stepName = (step: ComposerStep): string =>
  step.kind === 'single' ? step.group.name : t(`composer.steps.${step.kind}`)

const stepDone = (step: ComposerStep): boolean =>
  step.kind === 'ingredients' ? step.groups.every(isGroupSatisfied) : isGroupSatisfied(step.group)

const currentStepDone = computed(() => {
  const step = steps.value[stepIndex.value]
  return step ? stepDone(step) : false
})

const stepLabel = computed(() => {
  const step = steps.value[stepIndex.value]
  return step
    ? t('composer.stepLabel', {
        n: stepIndex.value + 1,
        total: steps.value.length,
        name: stepName(step),
      })
    : ''
})

const panels: (HTMLElement | undefined)[] = []
const setPanel = (index: number, el: unknown) => {
  panels[index] = el instanceof HTMLElement ? el : undefined
}

const goTo = (index: number) => {
  stepIndex.value = Math.min(Math.max(index, 0), steps.value.length - 1)
}

// ── Broths ───────────────────────────────────────────────────────────────────

/** A broth's own name: the choice's, without the heat qualifier when it has several variants. */
const brothName = (broth: BrothOption): string => {
  const { name } = broth.variants[0]!
  if (broth.variants.length === 1) return name
  const comma = name.indexOf(',')
  return comma === -1 ? name : name.slice(0, comma)
}

const brothAllergens = (slug: string): string => {
  const broth = BROTHS.find((item) => item.slug === slug)
  return broth ? t(`mkt.broths.${broth.key}.allergens`) : ''
}

/** A card keeps the heat already chosen for its broth; otherwise it picks the broth's first variant. */
const pickBroth = (broth: BrothOption) => {
  if (broth.variants.some((choice) => quantityOf(choice) > 0)) return
  selectExclusive(broth.variants[0]!)
}

const optionsOf = (step: ComposerStep): ProductChoice[] => {
  if (step.kind === 'variant') return pickedBroth.value?.variants ?? []
  if (step.kind === 'single')
    return step.group.choices.toSorted((a, b) => a.sortOrder - b.sortOrder)
  return []
}

// ── Ingredients ──────────────────────────────────────────────────────────────

const ingredientGroups = computed(() => {
  const step = steps.value.find((item) => item.kind === 'ingredients')
  return step?.kind === 'ingredients' ? step.groups : []
})
const categories = computed(() => ingredientCategories(ingredientGroups.value))
const progress = computed(() =>
  ingredientProgress(ingredientGroups.value, selectedCountIn, quantity.value),
)
const progressPct = (value: number) =>
  progress.value.max > 0 ? Math.min(100, (value / progress.value.max) * 100) : 0

const KIND_ICONS: Record<IngredientKind, string> = {
  vegetables: 'carrot',
  mushrooms: 'plant',
  tofu: 'cube',
  noodles: 'bowl-food',
  meat: 'cow',
  seafood: 'fish',
  other: 'package',
}
const categoryKind = (category: IngredientCategory): IngredientKind =>
  category.kind ?? ingredientKind(category.label ?? '')
const categoryLabel = (category: IngredientCategory): string =>
  category.labelKey ? t(category.labelKey) : (category.label ?? '')
const countIn = (category: IngredientCategory): number =>
  category.choices.reduce((sum, choice) => sum + quantityOf(choice), 0)

const activeCategory = ref<string | null>(null)
let ingredientsHeader: HTMLElement | undefined
const setIngredientsHeader = (el: unknown) => {
  ingredientsHeader = el instanceof HTMLElement ? el : undefined
}

/** Scrolls the ingredients panel to a category, under the sticky chips. */
const scrollToCategory = (panelIndex: number, id: string) => {
  activeCategory.value = id
  const panel = panels[panelIndex]
  const section = panel?.querySelector<HTMLElement>(`[data-composer-category="${id}"]`)
  if (!panel || !section) return
  const top = section.offsetTop - (ingredientsHeader?.offsetHeight ?? 0) - 8
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  panel.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

/** The chip of the category at the top of the panel follows the scroll. */
const onIngredientsScroll = (panelIndex: number) => {
  const panel = panels[panelIndex]
  if (!panel || categories.value.length < 2) return
  const line = panel.scrollTop + (ingredientsHeader?.offsetHeight ?? 0) + 16
  let current = categories.value[0]?.id ?? null
  for (const section of panel.querySelectorAll<HTMLElement>('[data-composer-category]')) {
    if (section.offsetTop <= line) current = section.dataset.composerCategory ?? current
  }
  activeCategory.value = current
}

/** The tile that just got one more, drawn 4 % bigger for 180 ms. */
const popped = ref<string | null>(null)
let popTimer: ReturnType<typeof setTimeout> | undefined
const addIngredient = (choice: ProductChoice) => {
  incrementChoice(choice)
  popped.value = choice.id
  clearTimeout(popTimer)
  popTimer = setTimeout(() => (popped.value = null), 180)
}

const modifierLabel = (choice: ProductChoice) =>
  `${toCents(choice.priceModifier) > 0 ? '+' : ''}${formatPrice(choice.priceModifier)}`
const priceLabel = (choice: ProductChoice) =>
  toCents(choice.priceModifier) === 0 ? t('composer.included') : modifierLabel(choice)

// ── Summary ──────────────────────────────────────────────────────────────────

const bowlPhoto = computed(() =>
  pickedBrothSlug.value
    ? `/images/bowls/${pickedBrothSlug.value}-top`
    : composerHero(p?.slug ?? '').photo,
)
const scale = computed(() => bowlScale(progress.value.count))

/** "2,50 € + vos ingrédients", read from the product's own base price. */
const basePriceLine = computed(() =>
  p && toCents(p.price) > 0
    ? t('composer.priceBase', { base: formatPrice(p.price) })
    : t('composer.priceFromIngredients'),
)

/** "Bouillon tomate mijoté · 5 ingrédients · Moyen" */
const summaryLabel = computed(() =>
  choiceGroups.value
    .map((group) => {
      if (isMultiSelectGroup(group)) {
        const count = selectedCountIn(group)
        return count > 0 ? t('composer.ingredientsSummary', { count }, count) : ''
      }
      return group.choices.find((choice) => quantityOf(choice) > 0)?.name ?? ''
    })
    .filter(Boolean)
    .join(' · '),
)

/** On the last step, what still blocks the bowl ("Bouillon · Choisissez 1 option"). */
const blockingHint = computed(() => {
  const group = blockingGroup.value
  if (!isLastStep.value || !group) return null
  return { name: group.name, hint: groupHint(group) }
})

/** The rail's line under the broth: the heat and the other pick-one choices. */
const pickOneLine = computed(() =>
  choiceGroups.value
    .filter((group) => !isMultiSelectGroup(group))
    .flatMap((group) => group.choices.filter((choice) => quantityOf(choice) > 0))
    .filter((choice) => !pickedBroth.value || !pickedBroth.value.variants.includes(choice))
    .map((choice) => choice.name)
    .concat(
      pickedBroth.value && pickedBroth.value.variants.length > 1
        ? pickedBroth.value.variants
            .filter((choice) => quantityOf(choice) > 0)
            .map((choice) => variantLabel(choice.name))
        : [],
    )
    .join(' · '),
)

const ingredientLines = computed(() =>
  ingredientGroups.value.flatMap((group) =>
    group.choices
      .filter((choice) => quantityOf(choice) > 0)
      .map((choice) => ({
        id: choice.id,
        name: choice.name,
        quantity: quantityOf(choice),
        price:
          toCents(choice.priceModifier) === 0
            ? t('composer.included')
            : formatCents(toCents(choice.priceModifier) * quantityOf(choice)),
      })),
  ),
)

// ── Cart ─────────────────────────────────────────────────────────────────────

const canAddToCart = computed(() => {
  if (orderingDisabled) return false
  if (!p?.isAvailable) return false
  return allGroupsSatisfied.value
})

const addToCart = () => {
  if (!p || !canAddToCart.value) return

  // An edited line is replaced where it is (it keeps its place in the cart), a new one is added.
  const composed = { choice: selectedChoice.value, selections: selectionList.value }
  if (editItem) cartStore.replaceLine(editItem, p, quantity.value, composed)
  else cartStore.addProduct(p, quantity.value, composed)
  trackEvent('product_added_to_cart', {
    product_id: p.id,
    product_name: p.name,
    price: p.price,
    quantity: quantity.value,
    choice_id: selectedChoice.value?.id,
    selections_count: selectionList.value.reduce((sum, selection) => sum + selection.quantity, 0),
    source: 'composer',
  })
  cartItemAdded.emit({
    productName: p.name,
    productId: p.id,
    choiceId: selectedChoice.value?.id,
    selectionSignature: lineSignature(selectionList.value, quantity.value),
  })

  emit('close')
}

onMounted(() => {
  if (p) {
    trackEvent('product_viewed', {
      product_id: p.id,
      product_name: p.name,
      category_name: p.category?.name,
      price: p.price,
    })
  }

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') emit('close')
  }
  document.addEventListener('keydown', handleEscape)
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
    clearTimeout(popTimer)
    cartItemEdit.value = null
  })
})
</script>

<style scoped>
/* The step slide of the mockup: 450 ms on the brand ease. */
.composer-track {
  transition: transform 450ms cubic-bezier(0.16, 1, 0.3, 1);
}

.composer-bar {
  transition: width 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

.composer-bowl {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
  filter: drop-shadow(0 10px 20px theme('colors.ygf.DEFAULT / 25%'));
}

.broth-card {
  transition:
    border-color 200ms ease-out,
    background-color 200ms ease-out,
    transform 200ms ease-out;
}

:deep(.broth-card-img) {
  filter: drop-shadow(0 8px 16px theme('colors.ygf.DEFAULT / 20%'));
}

@media (hover: hover) {
  .broth-card:hover {
    transform: translateY(-4px);
  }
}

.ingredient-tile {
  transition:
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
    background-color 200ms ease-out,
    border-color 200ms ease-out;
}

.ingredient-tile.is-popped {
  transform: scale(1.04);
}

/* Steam over the rail's bowl (as on the home broth selector). */
.composer-steam {
  position: absolute;
  top: -4%;
  left: 50%;
  z-index: 1;
  display: flex;
  gap: 0.75rem;
  transform: translateX(-50%);
  pointer-events: none;
}

.composer-steam span {
  width: 7px;
  height: 22px;
  border-radius: 9999px;
  background: theme('colors.ygf.DEFAULT / 22%');
  opacity: 0;
}

@media (prefers-reduced-motion: no-preference) {
  .composer-steam span {
    animation: composer-steam-rise 2.6s ease-out infinite;
  }

  .composer-steam span:nth-child(2) {
    height: 30px;
    animation-delay: 0.7s;
  }

  .composer-steam span:nth-child(3) {
    animation-delay: 1.3s;
  }
}

@media (prefers-reduced-motion: reduce) {
  .composer-track,
  .composer-bar,
  .composer-bowl,
  .broth-card,
  .ingredient-tile {
    transition: none;
  }
}

@keyframes composer-steam-rise {
  0% {
    opacity: 0;
    transform: translateY(8px) scaleY(0.6);
  }

  35% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-30px) scaleY(1.15) translateX(4px);
  }
}
</style>
