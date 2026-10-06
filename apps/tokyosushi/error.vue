<template>
  <main v-if="!recovering" class="err-page">
    <!-- Background kanji watermark -->
    <span class="err-kanji" aria-hidden="true">{{ bgKanji }}</span>

    <div class="err-layout">
      <!-- Massive error number -->
      <div class="err-number-col">
        <span class="err-num font-channel" aria-hidden="true">{{ statusCode }}</span>
      </div>

      <!-- Red rule divider -->
      <span class="err-rule" aria-hidden="true" />

      <!-- Content -->
      <div class="err-content">
        <span class="sr-only">
          {{ t('error.title' + statusCode, t('error.titleGeneric')) }} — {{ statusCode }}
        </span>

        <h1 class="err-title">{{ errorTitle }}</h1>
        <p class="err-desc">{{ errorMessage }}</p>

        <nav class="err-nav">
          <!-- A server error may be a blip: retry the page the visitor was on -->
          <template v-if="isServerError">
            <button
              type="button"
              class="err-link err-retry"
              data-testid="error-retry"
              @click="retry"
            >
              {{ t('common.retry') }}
            </button>
            <span class="err-sep" aria-hidden="true">&middot;</span>
          </template>
          <button type="button" class="err-link" @click="goHome">
            <svg
              class="err-arrow err-arrow-back"
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            {{ t('error.homeButton') }}
          </button>
          <span class="err-sep" aria-hidden="true">&middot;</span>
          <button type="button" class="err-link" @click="goMenu">
            {{ t('error.menuButton') }}
            <svg
              class="err-arrow err-arrow-next"
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </nav>

        <!-- Cherry blossom accent -->
        <div class="err-blossom" aria-hidden="true">
          <span v-for="n in 5" :key="n" class="err-petal" />
          <span class="err-pistil" />
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, useHead, useSeoMeta } from '#imports'
import type { NuxtError } from '#app'
import { useErrorPage } from '#engine/composables/useErrorPage'

const { error } = defineProps<{
  error: NuxtError
}>()

// Texts, language, way back, retry and the Sentry report: shared with every brand, and safe when i18n failed to start.
const {
  t,
  statusCode,
  isServerError,
  errorTitle,
  errorMessage,
  goHome,
  goMenu,
  recovering,
  retry,
} = useErrorPage(() => error)

// The status code is set in the display font on the first screen (like the category headings of /menu): preloaded here as there.
useHead({
  link: [
    {
      rel: 'preload',
      href: '/fonts/channel.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: 'anonymous',
    },
  ],
})

// The page replaces the layout, so it names itself (tab, history, share) and stays out of the index.
useSeoMeta({ title: () => errorTitle.value, robots: 'noindex,nofollow' })

const bgKanji = computed(() => {
  switch (error?.statusCode) {
    case 404:
      return '空'
    case 403:
      return '禁'
    case 500:
      return '乱'
    default:
      return '誤'
  }
})
</script>

<style scoped>
/* ===== Page ===== */
.err-page {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 40%, #f8f7f5 0%, #f6f5f2 50%, #efece7 100%);
  overflow: hidden;
  padding: 2rem;
}

/* ===== Background kanji ===== */
.err-kanji {
  position: absolute;
  font-size: clamp(18rem, 38vw, 34rem);
  line-height: 1;
  color: #ebe8e2;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'MS PMincho', 'Songti SC', serif;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  max-width: none;
}

/* ===== Layout ===== */
.err-layout {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 2.5rem;
}

/* ===== Number ===== */
.err-number-col {
  animation: err-ink 0.6s ease-out both;
}

.err-num {
  display: block;
  font-size: clamp(5rem, 13vw, 9rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.04em;
  color: #1a1714;
  max-width: none;
}

@keyframes err-ink {
  from {
    opacity: 0;
    filter: blur(12px);
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
}

/* ===== Red rule ===== */
.err-rule {
  display: block;
  width: 2px;
  height: 140px;
  flex-shrink: 0;
  background: #dc2626;
  border-radius: 1px;
  transform-origin: center;
  animation: err-rule-v 0.5s 0.2s ease-out both;
}

@keyframes err-rule-v {
  from {
    transform: scaleY(0);
    opacity: 0;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

/* ===== Content ===== */
.err-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 340px;
}

.err-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1714;
  line-height: 1.2;
  margin: 0 0 0.75rem;
  animation: err-slide-in 0.4s 0.2s ease-out both;
}

.err-desc {
  font-size: 0.95rem;
  line-height: 1.65;
  color: #78716c;
  margin: 0 0 1.75rem;
  animation: err-slide-in 0.4s 0.3s ease-out both;
}

@keyframes err-slide-in {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ===== Navigation ===== */
.err-nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: err-slide-in 0.4s 0.4s ease-out both;
}

.err-link {
  background: none;
  border: none;
  padding: 0.25rem 0;
  font-size: 0.875rem;
  font-family: 'Montserrat', sans-serif;
  color: #78716c;
  cursor: pointer;
  position: relative;
  transition: color 0.25s ease;
}

.err-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 1px;
  background: #dc2626;
  transition: width 0.3s ease;
}

.err-arrow {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: -2px;
  transition: transform 0.25s ease;
}

@media (hover: hover) {
  .err-link:hover {
    color: #dc2626;
  }

  .err-link:hover::after {
    width: 100%;
  }

  .err-link:hover .err-arrow-back {
    transform: translateX(-3px);
  }

  .err-link:hover .err-arrow-next {
    transform: translateX(3px);
  }
}

.err-sep {
  color: #d1d5db;
  font-size: 1.1rem;
  line-height: 1;
}

/* ===== Cherry blossom ===== */
.err-blossom {
  position: relative;
  width: 28px;
  height: 28px;
  margin-top: 2.5rem;
  align-self: flex-end;
  opacity: 0;
  animation:
    err-bloom 0.5s 2s ease-out forwards,
    err-spin 50s 2.5s linear infinite;
}

.err-petal {
  position: absolute;
  width: 9px;
  height: 13px;
  background: linear-gradient(135deg, #fce4ec 30%, #f48fb1);
  border-radius: 50%;
  left: calc(50% - 4.5px);
  bottom: 50%;
  transform-origin: center bottom;
  opacity: 0.75;
}

.err-petal:nth-child(1) {
  transform: rotate(0deg);
}
.err-petal:nth-child(2) {
  transform: rotate(72deg);
}
.err-petal:nth-child(3) {
  transform: rotate(144deg);
}
.err-petal:nth-child(4) {
  transform: rotate(216deg);
}
.err-petal:nth-child(5) {
  transform: rotate(288deg);
}

.err-pistil {
  position: absolute;
  width: 5px;
  height: 5px;
  background: #fff8e1;
  border-radius: 50%;
  top: calc(50% - 2.5px);
  left: calc(50% - 2.5px);
  box-shadow: 0 0 4px rgba(255, 248, 225, 0.5);
}

@keyframes err-bloom {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes err-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Mobile ===== */
@media (max-width: 767px) {
  .err-layout {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .err-rule {
    width: 40px;
    height: 2px;
    animation: err-rule-h 0.5s 0.2s ease-out both;
  }

  .err-content {
    align-items: center;
  }

  .err-title,
  .err-desc,
  .err-nav {
    animation-name: err-slide-up;
  }

  .err-blossom {
    align-self: center;
  }
}

@keyframes err-rule-h {
  from {
    transform: scaleX(0);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

@keyframes err-slide-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== Reduced motion ===== */
@media (prefers-reduced-motion: reduce) {
  .err-number-col,
  .err-rule,
  .err-title,
  .err-desc,
  .err-nav,
  .err-blossom {
    animation: none !important;
    opacity: 1 !important;
    filter: none !important;
  }
}
</style>
