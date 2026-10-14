<template>
  <!-- "Combien coûte mon bol ?": the counter's price by weight as a meal price (audit 1a/1b). In-store rule only. -->
  <div class="estimator" data-testid="estimator">
    <div v-reveal class="estimator-copy">
      <span class="section-label">{{ $t('mkt.estimator.label') }}</span>
      <h2 class="font-display font-bold text-3xl sm:text-4xl text-ygf-black tracking-tight">
        {{ $t('mkt.estimator.title') }}
      </h2>
      <p class="mt-3 text-gray-600 leading-relaxed max-w-[46ch]">
        {{ $t('mkt.estimator.desc') }}
      </p>
    </div>

    <div v-reveal="1" class="rounded-ygf-lg bg-ygf-bg px-5 py-6 sm:px-8 sm:py-8 text-center">
      <div class="h-[170px] grid place-items-center" aria-hidden="true">
        <MktPicture
          src="/images/bowls/beef-bone-top"
          :widths="[320, 560]"
          :fallback-width="320"
          :fallback-height="320"
          alt=""
          sizes="170px"
          class="block w-[170px] estimator-bowl"
          img-class="w-full"
          :style="{ transform: `scale(${estimatorBowlScale(grams)})` }"
        />
      </div>
      <p
        class="mt-2 text-5xl font-black tracking-tight tabular-nums text-ygf-black"
        aria-live="polite"
        data-testid="estimator-price"
      >
        {{ formatCents(estimateCents(grams)) }}
      </p>
      <p class="mt-1.5 mb-5 text-sm text-ygf-gray-600">
        <i18n-t keypath="mkt.estimator.for" tag="span" scope="global">
          <template #weight>
            <strong class="text-ygf-black tabular-nums">{{ grams }} g</strong>
          </template>
          <template #rate>{{ rateLabel }}</template>
        </i18n-t>
      </p>
      <label class="sr-only" for="estimator-weight">{{ $t('mkt.estimator.weight') }}</label>
      <input
        id="estimator-weight"
        v-model.number="grams"
        type="range"
        :min="ESTIMATOR_RANGE_G.min"
        :max="ESTIMATOR_RANGE_G.max"
        :step="ESTIMATOR_RANGE_G.step"
        :aria-valuetext="`${grams} g`"
        class="estimator-range w-full"
      />
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <button
          v-for="(preset, i) in ESTIMATOR_PRESETS_G"
          :key="preset"
          type="button"
          class="chip"
          :aria-pressed="grams === preset"
          @click="grams = preset"
        >
          {{ $t(`mkt.estimator.presets.${i}`, { grams: preset }) }}
        </button>
      </div>
      <p class="mt-4 text-xs text-ygf-gray-600">{{ $t('mkt.estimator.note') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  COUNTER_PRICE_PER_100G_CENTS,
  ESTIMATOR_PRESETS_G,
  ESTIMATOR_RANGE_G,
  estimateCents,
  estimatorBowlScale,
} from '~/data/estimator'
import { computed, ref } from 'vue'
import MktPicture from '~/components/mkt/MktPicture.vue'
import { formatCents } from '#engine/lib/price'

const { t } = useI18n()
const grams = ref<number>(ESTIMATOR_PRESETS_G[1])
const rateLabel = computed(() =>
  t('mkt.estimator.rate', { price: formatCents(COUNTER_PRICE_PER_100G_CENTS) }),
)
</script>

<style scoped>
.estimator {
  display: grid;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .estimator {
    grid-template-columns: 1fr 1.1fr;
    align-items: center;
    gap: 4rem;
  }
}

.estimator-bowl {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
  filter: drop-shadow(0 14px 28px theme('colors.ygf.DEFAULT / 24%'));
}

@media (prefers-reduced-motion: reduce) {
  .estimator-bowl {
    transition: none;
  }
}

/* Orange track and thumb, 28px tall for the thumb (a comfortable touch target). */
.estimator-range {
  height: 28px;
  accent-color: theme('colors.primary.DEFAULT');
  cursor: pointer;
}
</style>
