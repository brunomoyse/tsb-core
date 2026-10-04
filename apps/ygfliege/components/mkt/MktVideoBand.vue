<template>
  <section
    ref="band"
    class="relative overflow-hidden bg-ygf-black"
    :aria-label="$t('mkt.home.video.label')"
  >
    <video
      ref="video"
      class="absolute inset-0 w-full h-full object-cover opacity-60"
      muted
      loop
      playsinline
      preload="none"
      poster="/images/videos/ingredients-poster.jpg"
      aria-hidden="true"
      @play="playing = true"
      @pause="playing = false"
    >
      <source data-src="/videos/ingredients-loop.webm" type="video/webm" />
      <source data-src="/videos/ingredients-loop.mp4" type="video/mp4" />
    </video>
    <div
      class="absolute inset-0 bg-gradient-to-t from-ygf-black/70 via-transparent to-ygf-black/40"
      aria-hidden="true"
    />
    <div v-reveal class="relative max-w-4xl mx-auto text-center px-4 py-24 sm:py-32">
      <span class="text-ygf-light text-sm font-semibold uppercase tracking-widest">{{
        $t('mkt.home.video.label')
      }}</span>
      <h2 class="font-display font-bold text-3xl sm:text-4xl text-white mt-3 mb-4">
        {{ $t('mkt.home.video.title') }}
      </h2>
      <p class="text-white/80 leading-relaxed max-w-2xl mx-auto">
        {{ $t('mkt.home.video.subtitle') }}
      </p>
    </div>
    <!-- Pause / play (WCAG 2.2.2): the loop moves for more than 5 s, so it needs a control. Only offered where the video can move at all (not for reduced-motion visitors, who only ever see the poster); its name changes with the state. -->
    <button
      v-if="motionAllowed"
      type="button"
      data-testid="video-toggle"
      class="absolute bottom-4 right-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-ygf-black/70 px-4 text-sm font-semibold text-white hover:bg-ygf-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ygf-black"
      @click="toggle"
    >
      <svg
        v-if="playing"
        aria-hidden="true"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
      <svg v-else aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
      </svg>
      {{ playing ? $t('mkt.home.video.pause') : $t('mkt.home.video.play') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Full-bleed looping ingredient video. Sources are swapped in lazily when the
// Band nears the viewport so the ~1MB files (720 px wide, re-encoded from 3MB 1280 px ones, audit PR 6.4, P16) never
// Block initial load; autoplay is muted + playsinline (mobile-safe) and skipped for
// Reduced-motion users and for visitors who asked to save data (the poster stays; the button still plays it).
// A visible pause/play button (audit PR 3.6, A18) lets anyone stop the loop.
const band = ref<HTMLElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const playing = ref(false)
// Set after mount: the button is not server-rendered (it only makes sense once we know the visitor accepts motion).
const motionAllowed = ref(false)
// The visitor paused (or pressed play) themselves: the lazy start must not override it.
let userChoice: 'pause' | 'play' | null = null
let observer: IntersectionObserver | null = null
// The sources live on <source> children, so video.src stays empty even once they are set: remember it here (a second load() would restart the clip).
let sourcesLoaded = false

const loadSources = (v: HTMLVideoElement): boolean => {
  if (sourcesLoaded || !v.children.length) return false
  sourcesLoaded = true
  for (const source of Array.from(v.querySelectorAll('source'))) {
    const src = source.getAttribute('data-src')
    if (src) source.setAttribute('src', src)
  }
  v.load()
  return true
}

const toggle = () => {
  const v = video.value
  if (!v) return
  loadSources(v)
  if (v.paused) {
    userChoice = 'play'
    v.play().catch(() => {
      /* Autoplay refused: the poster stays */
    })
  } else {
    userChoice = 'pause'
    v.pause()
  }
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  motionAllowed.value = true
  // Save-Data (Chromium's Network Information API): no download unless the visitor presses play.
  const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } }
  if (connection?.saveData) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const v = video.value
        if (v && loadSources(v) && userChoice !== 'pause') {
          v.play().catch(() => {
            /* Autoplay refused: the poster stays */
          })
        }
        observer?.disconnect()
      }
    },
    { rootMargin: '200px' },
  )
  if (band.value) observer.observe(band.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>
