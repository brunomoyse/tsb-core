<template>
  <!-- Fuzi (福仔) the mascot, as GUIDELINES.md §2 asks for the 404, over a warm glow. No sakura, no kanji, no red.
         The picture is decorative: the title says what happened. The float is gentle and stops under prefers-reduced-motion. -->
  <main v-if="!recovering" class="err-page">
    <span class="err-glow" aria-hidden="true" />

    <div class="err-layout">
      <div class="err-number-col" aria-hidden="true">
        <picture>
          <source srcset="/images/mascot/fuzi-noodles-400.avif" type="image/avif" />
          <source srcset="/images/mascot/fuzi-noodles-400.webp" type="image/webp" />
          <img
            src="/images/mascot/fuzi-noodles-700.png"
            alt=""
            width="260"
            height="245"
            class="err-fuzi"
          />
        </picture>
        <span class="err-num">{{ statusCode }}</span>
      </div>

      <span class="err-rule" aria-hidden="true" />

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
              width="16"
              height="16"
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
              width="16"
              height="16"
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
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
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

// The page replaces the layout, so it names itself (tab, history, share) and stays out of the index.
useSeoMeta({ title: () => errorTitle.value, robots: 'noindex,nofollow' })
</script>

<style scoped>
/* ===== Page ===== */
.err-page {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ygf-cream);
  overflow: hidden;
  padding: 2rem;
}

.err-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 38%, rgba(245, 130, 32, 0.1) 0%, transparent 55%);
  pointer-events: none;
}

/* ===== Layout (centred, like the vitrine's 404) ===== */
.err-layout {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
}

.err-number-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.err-fuzi {
  display: block;
  width: min(60vw, 260px);
  height: auto;
  max-width: none;
  animation: err-float 4s ease-in-out infinite;
}

.err-num {
  display: block;
  margin-top: 0.25rem;
  font-size: clamp(3.5rem, 9vw, 5.5rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.04em;
  color: var(--ygf-orange-light);
}

.err-rule {
  display: block;
  width: 40px;
  height: 2px;
  flex-shrink: 0;
  background: var(--ygf-orange);
  border-radius: 1px;
}

/* ===== Content ===== */
.err-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 420px;
}

.err-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ygf-black);
  line-height: 1.2;
  margin: 0 0 0.75rem;
}

.err-desc {
  font-size: 1rem;
  line-height: 1.65;
  color: var(--ygf-gray-600);
  margin: 0 0 1.5rem;
}

/* ===== Navigation ===== */
.err-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25rem 0.75rem;
}

.err-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0.5rem;
  background: none;
  border: none;
  font-size: 0.9375rem;
  font-family: inherit;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ygf-orange-text);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  transition: text-decoration-color 0.2s ease;
}

.err-arrow {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

@media (hover: hover) {
  .err-link:hover {
    text-decoration-color: currentColor;
  }

  .err-link:hover .err-arrow-back {
    transform: translateX(-3px);
  }

  .err-link:hover .err-arrow-next {
    transform: translateX(3px);
  }
}

.err-sep {
  color: var(--ygf-gray-400);
  font-size: 1.1rem;
  line-height: 1;
}

@keyframes err-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* ===== Reduced motion ===== */
@media (prefers-reduced-motion: reduce) {
  .err-fuzi {
    animation: none;
  }
}
</style>
