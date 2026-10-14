<template>
  <div v-reveal class="broth-selector" data-testid="broth-selector">
    <!-- Round top-view bowls, stacked: the active one shows, swaps turn and fade. Swipe on it (mobile) to change. -->
    <div
      class="broth-selector-stage"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div class="selector-steam" aria-hidden="true"><span /><span /><span /></div>
      <div
        v-for="(broth, i) in BROTHS"
        :key="broth.key"
        :ref="(el) => setRef(bowls, i, el)"
        class="selector-bowl"
        :class="{ active: i === shownBowl }"
        :aria-hidden="i !== shownBowl"
        data-testid="broth-selector-bowl"
      >
        <MktPicture
          :src="`/images/bowls/${broth.slug}-top`"
          :widths="[320, 560, 800]"
          :fallback-width="560"
          :fallback-height="560"
          :alt="$t(`mkt.broths.${broth.key}.name`)"
          sizes="(min-width: 769px) 460px, 78vw"
          :eager="i === 0"
          class="block w-full"
          img-class="selector-bowl-img w-full"
        />
      </div>
    </div>

    <div class="broth-selector-side">
      <div
        ref="rail"
        class="broth-selector-tabs"
        role="tablist"
        :aria-label="$t('mkt.menu.broths_title')"
      >
        <button
          v-for="(broth, i) in BROTHS"
          :id="`broth-tab-${broth.key}`"
          :key="broth.key"
          :ref="(el) => setRef(tabs, i, el)"
          type="button"
          role="tab"
          :aria-selected="i === current"
          :aria-controls="`broth-panel-${broth.key}`"
          class="selector-tab"
          :class="{ active: i === current }"
          :aria-label="$t(`mkt.broths.${broth.key}.name`)"
          data-testid="broth-selector-tab"
          @click="onTabClick(i)"
        >
          <MktPicture
            :src="`/images/bowls/${broth.slug}-top`"
            :widths="[320]"
            :fallback-width="320"
            :fallback-height="320"
            alt=""
            sizes="56px"
            class="block w-full h-full"
            img-class="w-full h-full object-contain"
          />
        </button>
      </div>
      <div
        v-for="(broth, i) in BROTHS"
        v-show="i === current"
        :id="`broth-panel-${broth.key}`"
        :key="broth.key"
        :ref="(el) => setRef(panels, i, el)"
        role="tabpanel"
        :aria-labelledby="`broth-tab-${broth.key}`"
        data-testid="broth-selector-panel"
      >
        <h3 class="font-display font-bold text-2xl text-ygf-black tracking-tight mb-1">
          {{ $t(`mkt.broths.${broth.key}.name`) }}
        </h3>
        <p class="font-serifzh text-sm text-ygf-orange-text mb-3">
          {{ $t(`mkt.broths.${broth.key}.chinese`) }}
        </p>
        <MktBrothMeta :broth="broth" class="justify-center md:justify-start mb-3" />
        <p class="text-gray-600 leading-relaxed max-w-[46ch] mx-auto md:mx-0">
          {{ $t(`mkt.broths.${broth.key}.desc`) }}
        </p>
      </div>
      <!-- The herbal broth story lives on Concept (audit 1c): one link instead of a second home section. -->
      <NuxtLinkLocale
        to="/concept"
        data-testid="broth-story-link"
        class="inline-flex items-center gap-1.5 mt-5 min-h-11 font-semibold text-ygf-orange-text underline underline-offset-4 decoration-ygf-orange/50 hover:decoration-ygf-orange-text transition-colors"
      >
        {{ $t('mkt.home.broth_hero.cta') }}
        <MktIcon name="arrow-right" :size="16" />
      </NuxtLinkLocale>
    </div>
  </div>
</template>

<script setup lang="ts">
/*
 * Home broth selector, as on the old ygfliege.be (its broth-selector.ts, GSAP): round top-view bowls that turn out
 * (-22deg, scale 0.92, fade, 0.32s) and the next one turns in (from 22deg, 0.45s) in the direction of travel; the panel
 * slides up after them. Auto-advances every 5s until the first tab click or swipe; reduced motion swaps instantly and
 * never auto-advances. Rebuilt on the Web Animations API, client-side only.
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MktBrothMeta from '~/components/mkt/MktBrothMeta.vue'
import MktIcon from '~/components/mkt/MktIcon.vue'
import MktPicture from '~/components/mkt/MktPicture.vue'
import { BROTHS } from '~/data/broths'
import {
  MOTION_EASE,
  bowlSwapDirection,
  centeredScrollLeft,
  swipeStep,
  wrapIndex,
} from '~/utils/motion'

const AUTO_ADVANCE_MS = 5000

/** Broth of the tabs and panels; the bowl follows it once the outgoing one has turned away. */
const current = ref(0)
const shownBowl = ref(0)

// Elements by broth index (a v-for ref array does not promise the source order).
const bowls: (HTMLElement | undefined)[] = []
const tabs: (HTMLElement | undefined)[] = []
const panels: (HTMLElement | undefined)[] = []
const setRef = (list: (HTMLElement | undefined)[], index: number, el: unknown) => {
  list[index] = el instanceof HTMLElement ? el : undefined
}
const rail = ref<HTMLElement | null>(null)

let reducedMotion = false
let autoTimer: ReturnType<typeof setInterval> | undefined
let running: Animation[] = []

const stopAuto = () => {
  if (autoTimer === undefined) return
  clearInterval(autoTimer)
  autoTimer = undefined
}

/** Centres the active tab in its rail (the mobile scroller) without ever scrolling the page. */
const centerTab = (index: number) => {
  const tab = tabs[index]
  if (rail.value === null || tab === undefined) return
  rail.value.scrollTo({
    left: centeredScrollLeft(tab.offsetLeft, tab.offsetWidth, rail.value.clientWidth),
    behavior: reducedMotion ? 'auto' : 'smooth',
  })
}

const goTo = (index: number) => {
  const next = wrapIndex(index, BROTHS.length)
  const prev = current.value
  if (next === prev) return

  // A swap still running ends now: its outgoing bowl is gone, the one on screen is the previous broth's.
  for (const animation of running) animation.cancel()
  running = []
  shownBowl.value = prev

  current.value = next
  centerTab(next)

  if (reducedMotion) {
    shownBowl.value = next
    return
  }

  const dir = bowlSwapDirection(prev, next, BROTHS.length)
  const outgoing = bowls[prev]?.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: `rotate(${-22 * dir}deg) scale(0.92)`, opacity: 0 },
    ],
    { duration: 320, easing: MOTION_EASE.power2In, fill: 'forwards' },
  )
  const bringIn = () => {
    shownBowl.value = next
    outgoing?.cancel()
    const incoming = bowls[next]?.animate(
      [
        { transform: `rotate(${22 * dir}deg) scale(0.92)`, opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 450, easing: MOTION_EASE.power3Out },
    )
    if (incoming !== undefined) running.push(incoming)
  }
  if (outgoing === undefined) bringIn()
  else {
    running.push(outgoing)
    outgoing.addEventListener('finish', bringIn, { once: true })
  }

  // The panel is shown on the next render; it slides up once the bowls have started turning.
  void nextTick().then(() => {
    const panel = panels[next]?.animate(
      [
        { transform: 'translateY(14px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 400, delay: 180, easing: MOTION_EASE.power3Out, fill: 'backwards' },
    )
    if (panel !== undefined) running.push(panel)
  })
}

const onTabClick = (index: number) => {
  stopAuto()
  goTo(index)
}

let touchX: number | null = null
const onTouchStart = (event: TouchEvent) => {
  touchX = event.touches[0]?.clientX ?? null
}
const onTouchEnd = (event: TouchEvent) => {
  const endX = event.changedTouches[0]?.clientX
  if (touchX === null || endX === undefined) return
  const step = swipeStep(endX - touchX)
  touchX = null
  if (step === 0) return
  stopAuto()
  goTo(current.value + step)
}

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Gentle auto-rotation until someone interacts; never under reduced motion.
  if (!reducedMotion) autoTimer = setInterval(() => goTo(current.value + 1), AUTO_ADVANCE_MS)
})

onBeforeUnmount(() => {
  stopAuto()
  for (const animation of running) animation.cancel()
  running = []
})
</script>

<style scoped>
.broth-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

@media (min-width: 769px) {
  .broth-selector {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    align-items: center;
    gap: 3rem;
  }
}

.broth-selector-stage {
  position: relative;
  width: min(78vw, 340px);
  aspect-ratio: 1;
  touch-action: pan-y;
}

@media (min-width: 769px) {
  .broth-selector-stage {
    width: min(40vw, 460px);
    justify-self: center;
  }
}

.selector-bowl {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
}

.selector-bowl.active {
  opacity: 1;
  pointer-events: auto;
}

:deep(.selector-bowl-img) {
  display: block;
  filter: drop-shadow(0 18px 36px theme('colors.ygf.DEFAULT / 24%'));
}

/* Steam over the bowl (orange wisps: the stage sits on white). */
.selector-steam {
  position: absolute;
  top: -4%;
  left: 50%;
  z-index: 1;
  display: flex;
  gap: 0.75rem;
  transform: translateX(-50%);
  pointer-events: none;
}

.selector-steam span {
  width: 8px;
  height: 26px;
  border-radius: 9999px;
  background: theme('colors.ygf.DEFAULT / 22%');
  opacity: 0;
}

@media (prefers-reduced-motion: no-preference) {
  .selector-steam span {
    animation: selector-steam-rise 2.6s ease-out infinite;
  }

  .selector-steam span:nth-child(2) {
    height: 34px;
    animation-delay: 0.7s;
  }

  .selector-steam span:nth-child(3) {
    animation-delay: 1.3s;
  }
}

@keyframes selector-steam-rise {
  0% {
    opacity: 0;
    transform: translateY(8px) scaleY(0.6);
  }

  35% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-34px) scaleY(1.15) translateX(4px);
  }
}

.broth-selector-side {
  width: 100%;
  max-width: 480px;
  text-align: center;
}

@media (min-width: 769px) {
  .broth-selector-side {
    max-width: none;
    text-align: left;
  }
}

/* The bowls are the tabs (audit 1a): five round thumbnails that fit one row, the active one ringed in orange. */
.broth-selector-tabs {
  display: flex;
  justify-content: center;
  /* Five bowls must fit a 320 px phone (288 px inside the gutters), the active one scaled up */
  gap: clamp(0.375rem, 2vw, 0.625rem);
  padding: 0.25rem 0.25rem 1rem;
  margin-bottom: 0.5rem;
}

@media (min-width: 769px) {
  .broth-selector-tabs {
    justify-content: flex-start;
  }
}

.selector-tab {
  flex-shrink: 0;
  width: clamp(2.75rem, 14vw, 3.5rem);
  height: clamp(2.75rem, 14vw, 3.5rem);
  padding: 3px;
  border: 2px solid transparent;
  border-radius: 9999px;
  background: theme('colors.ygf.white');
  box-shadow: 0 2px 8px theme('colors.ygf.DEFAULT / 10%');
  cursor: pointer;
  transition:
    border-color 200ms ease-out,
    transform 200ms ease-out;
}

.selector-tab:hover {
  border-color: theme('colors.ygf.light');
}

.selector-tab.active {
  border-color: theme('colors.ygf.DEFAULT');
  transform: scale(1.08);
}

.selector-tab:focus-visible {
  outline: 2px solid theme('colors.ygf.black');
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .selector-tab {
    transition: none;
  }
}
</style>
