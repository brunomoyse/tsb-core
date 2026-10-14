<template>
  <div>
    <!-- Sur place / En ligne (audit, "still open from turn 1"): the counter steps, and the online ones while the shop is on -->
    <div
      v-if="online"
      role="tablist"
      :aria-label="$t('mkt.home.steps.title')"
      class="mb-6 inline-flex rounded-ygf-btn bg-ygf-cream p-1"
      data-testid="steps-mode"
    >
      <button
        v-for="option in MODES"
        :id="`steps-tab-${option}`"
        :key="option"
        type="button"
        role="tab"
        :aria-selected="mode === option"
        aria-controls="steps-panel"
        class="min-h-11 rounded-ygf-btn px-5 text-sm font-semibold transition-colors duration-300"
        :class="mode === option ? 'bg-ygf-black text-white' : 'text-ygf-black hover:bg-white'"
        @click="setMode(option)"
      >
        {{ $t(`mkt.home.steps.mode.${option}`) }}
      </button>
    </div>

    <!-- A swipe row on a phone (scroll-snap, with a progress line), a grid from 640px -->
    <div
      id="steps-panel"
      :role="online ? 'tabpanel' : undefined"
      :aria-labelledby="online ? `steps-tab-${mode}` : undefined"
    >
      <ol
        ref="row"
        class="steps-row flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 no-scrollbar swipe-row -mx-4 px-4 pb-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 sm:overflow-visible"
        @scroll.passive="onScroll"
      >
        <li
          v-for="step in STEP_NUMBERS"
          :key="`${mode}-${step}`"
          v-reveal="step"
          class="shrink-0 basis-[17rem] snap-start sm:basis-auto bg-white rounded-ygf-card shadow-ygf-md overflow-hidden"
        >
          <MktPicture
            v-if="mode === 'onsite'"
            :src="`/images/steps/step-${step}`"
            :widths="[400, 800]"
            :fallback-width="400"
            :fallback-height="792"
            :alt="$t(`${keyPrefix}.step${step}.title`)"
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 272px"
            :eager="eagerFirst && step === 1"
            img-class="w-full aspect-[4/3] sm:aspect-square object-cover"
          />
          <div
            v-else
            class="aspect-[4/3] sm:aspect-square grid place-items-center bg-ygf-bg text-ygf-orange-on-white"
            aria-hidden="true"
          >
            <MktIcon :name="ONLINE_ICONS[step - 1]!" :size="72" />
          </div>
          <div class="p-5">
            <div class="flex items-center gap-2.5 mb-2">
              <span
                class="w-7 h-7 rounded-full bg-ygf text-ygf-black text-sm font-bold flex items-center justify-center shrink-0"
                >{{ step }}</span
              >
              <component :is="headingTag" class="font-display font-bold text-lg text-ygf-black">
                {{ $t(`${prefix}.step${step}.title`) }}
              </component>
            </div>
            <p class="text-sm text-gray-600 leading-relaxed">
              {{ $t(`${prefix}.step${step}.desc`, { minutes: preparationMinutes ?? 30 }) }}
            </p>
          </div>
        </li>
      </ol>
      <div
        class="sm:hidden mt-2 h-[3px] rounded-full bg-ygf-orange/15 overflow-hidden"
        aria-hidden="true"
      >
        <div class="h-full rounded-full bg-ygf steps-progress" :style="{ width: `${progress}%` }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The 4-step "how it works". Home and concept use different locale namespaces for the counter steps (keyPrefix); the
// home also offers the online steps (`switchable`, while the shop is on).
import { computed, ref } from 'vue'
import MktIcon from '~/components/mkt/MktIcon.vue'
import MktPicture from '~/components/mkt/MktPicture.vue'

const {
  keyPrefix,
  headingTag = 'h3',
  eagerFirst = false,
  switchable = false,
  preparationMinutes = null,
} = defineProps<{
  /** E.g. "mkt.home.steps" or "mkt.concept" */
  keyPrefix: string
  /** The level of the step titles: one under the page's own title is h2, one under a section heading is h3. */
  headingTag?: 'h2' | 'h3'
  /** The first step's picture is on the first screen of a phone and is the page's largest image: load it at once. */
  eagerFirst?: boolean
  /** Offer the online steps (Sur place / En ligne); the page passes it only while the shop is on. */
  switchable?: boolean
  /** The kitchen's preparation time, for "prêt en ~30 min" in the online steps. */
  preparationMinutes?: number | null
}>()

const STEP_NUMBERS = [1, 2, 3, 4] as const
const MODES = ['onsite', 'online'] as const
const ONLINE_ICONS = ['bowl-food', 'credit-card', 'bowl-steam', 'storefront'] as const

const online = computed(() => switchable)
const mode = ref<(typeof MODES)[number]>('onsite')
const prefix = computed(() => (mode.value === 'online' ? 'mkt.home.steps.online' : keyPrefix))

const row = ref<HTMLElement | null>(null)
const progress = ref(25)
/** The progress line follows the swipe: how much of the row has been seen. */
const onScroll = () => {
  const el = row.value
  if (!el) return
  const seen = (el.scrollLeft + el.clientWidth) / el.scrollWidth
  progress.value = Math.min(100, Math.max(25, Math.round(seen * 100)))
}
const setMode = (next: (typeof MODES)[number]) => {
  mode.value = next
  row.value?.scrollTo({ left: 0 })
  progress.value = 25
}
</script>

<style scoped>
.steps-progress {
  transition: width 120ms linear;
}
</style>
