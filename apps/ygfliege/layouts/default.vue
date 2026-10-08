<template>
  <div>
    <Html :dir="head.htmlAttrs?.dir ?? 'ltr'" :lang="head.htmlAttrs?.lang ?? 'en'">
      <Head>
        <Title>{{ title }}</Title>
        <template v-for="link in head.link" :key="link.id ?? link.href">
          <Link v-bind="link" />
        </template>
        <template v-for="meta in head.meta" :key="meta.id ?? meta.property">
          <Meta :id="meta.id" :property="meta.property" :content="String(meta.content)" />
        </template>
      </Head>

      <Body class="bg-ygf-bg overflow-x-hidden">
        <NuxtLoadingIndicator color="var(--ygf-orange)" :height="2" />
        <a
          href="#main-content"
          class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {{ $t('common.skipToContent') }}
        </a>
        <div class="min-h-dvh flex flex-col" data-app-root>
          <!-- display:contents: a plain <header> box would be TopNavbar's
                 containing block, exactly nav-height, so sticky couldn't stick. -->
          <header class="contents">
            <MobileNavbar />
            <div class="mobile-only h-[var(--nav-h)]" />
            <TopNavbar />
          </header>

          <main id="main-content" class="flex-1 bg-ygf-bg overflow-x-clip pb-4">
            <slot />
          </main>

          <!-- Black footer with white logo, per GUIDELINES.md §4.5. -->
          <footer class="bg-ygf-black text-white/70 mt-12">
            <div class="max-w-7xl mx-auto px-6 py-10 sm:py-12">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
                <div class="space-y-3">
                  <img
                    src="/images/logos/logo-white.svg"
                    :alt="$t('common.logoAlt', { name: brand.name })"
                    width="120"
                    height="40"
                    class="h-10 w-auto"
                    loading="lazy"
                  />
                  <address class="not-italic text-sm leading-relaxed">
                    {{ brand.address.street }}<br />
                    {{ brand.address.postal }} {{ brand.address.city }}<br />
                    <a
                      :href="telHref(brand.phone)"
                      class="inline-flex min-h-11 items-center hover:text-white transition-colors"
                      >{{ brand.phone }}</a
                    >
                  </address>
                </div>

                <nav :aria-label="$t('nav.secondary')" class="flex flex-col gap-0 text-sm">
                  <NuxtLinkLocale
                    class="inline-flex min-h-11 items-center hover:text-white transition-colors"
                    to="/concept"
                    >{{ $t('mkt.nav.concept') }}</NuxtLinkLocale
                  >
                  <NuxtLinkLocale
                    class="inline-flex min-h-11 items-center hover:text-white transition-colors"
                    to="/about"
                    >{{ $t('mkt.nav.about') }}</NuxtLinkLocale
                  >
                  <NuxtLinkLocale
                    class="inline-flex min-h-11 items-center hover:text-white transition-colors"
                    to="/terms"
                    >{{ $t('footer.terms') }}</NuxtLinkLocale
                  >
                  <NuxtLinkLocale
                    class="inline-flex min-h-11 items-center hover:text-white transition-colors"
                    to="/privacy"
                    >{{ $t('footer.privacy') }}</NuxtLinkLocale
                  >
                </nav>

                <!-- Branded QR tiles from the YGF kit, labeled like the
                             vitrine footer: the text names the network, the
                             tile is decoration (unreadable as an icon alone). -->
                <div class="flex flex-col gap-1 text-sm">
                  <a
                    :href="brand.socials.instagram"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2.5 min-h-11 hover:text-white transition-colors"
                  >
                    <img
                      src="/images/icons/social-instagram.svg"
                      alt=""
                      aria-hidden="true"
                      class="w-9 h-9"
                      loading="lazy"
                    />
                    <span>Instagram</span>
                  </a>
                  <a
                    :href="brand.socials.tiktok"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2.5 min-h-11 hover:text-white transition-colors"
                  >
                    <img
                      src="/images/icons/social-tiktok.svg"
                      alt=""
                      aria-hidden="true"
                      class="w-9 h-9"
                      loading="lazy"
                    />
                    <span>TikTok</span>
                  </a>
                  <a
                    :href="brand.socials.rednote"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2.5 min-h-11 hover:text-white transition-colors"
                  >
                    <img
                      src="/images/icons/social-rednote.svg"
                      alt=""
                      aria-hidden="true"
                      class="w-9 h-9"
                      loading="lazy"
                    />
                    <span>RedNote</span>
                  </a>
                </div>
              </div>

              <div
                class="mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50"
              >
                <p translate="no">{{ brand.name }}</p>
                <a
                  href="https://nuagemagique.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex min-h-11 items-center hover:text-white/80 transition-colors"
                  >nuagemagique.dev</a
                >
              </div>
            </div>
          </footer>
        </div>
        <ClientOnly>
          <LazyCartMobile :is-ordering-available="!isClosed" :preorder-time="preorderTime" />
          <LazyCartFloatingCartBar v-if="isMenuPage" />
          <!-- A signed-in customer's last order, one tap away, where an order starts (home, menu) -->
          <LazyCartReorderBar v-if="isMenuPage || isHomePage" />
        </ClientOnly>
        <ClientOnly>
          <ToastAnnouncer />
          <LazyNotificationBar
            v-if="notifications.current"
            :key="notifications.seq"
            :message="notifications.current.message"
            :persistent="notifications.current.persistent"
            :duration="notifications.current.duration"
            :variant="notifications.current.variant"
            :action="notifications.current.action"
            @close="notifications.dismiss()"
          />
        </ClientOnly>

        <ClientOnly>
          <LazyReorderDialog
            primary-class="bg-ygf-orange-on-white text-ygf-white hover:bg-ygf-orange-on-white-hover focus-visible:ring-ring focus-visible:ring-offset-2"
            secondary-class="bg-ygf-gray-100 text-ygf-gray-600 hover:bg-ygf-gray-200 focus-visible:ring-ring"
          />
        </ClientOnly>

        <ClientOnly>
          <LazyScrollToTopButton class="sm:hidden" />
        </ClientOnly>
      </Body>
    </Html>
  </div>
</template>

<script lang="ts" setup>
import MobileNavbar from '~/components/navbar/MobileNavbar.vue'
import TopNavbar from '~/components/navbar/TopNavbar.vue'
import { computed } from 'vue'
import { telHref } from '#engine/utils/phone'
import { useI18n } from 'vue-i18n'
import { useLocaleHead } from '#i18n'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useOrderingAvailability } from '#engine/composables/useOrderingAvailability'
import { useRestaurantSchema } from '#engine/composables/useRestaurantSchema'
import { useRoute } from 'vue-router'

const route = useRoute()
const { t } = useI18n()
const { brand } = useAppConfig()

// Lazy: only consumed by <CartMobile> below, which is wrapped in <ClientOnly>.
// Awaiting non-lazy here was blocking SSR TTFB on every page (~300ms in the audit).
// Closed is only true once the config has loaded and says nothing can be ordered: while it loads (or if it failed) the drawer's checkout link stays enabled and checkout explains.
const {
  config: restaurantConfig,
  isClosed,
  preorderTime,
} = await useOrderingAvailability({
  lazy: true,
  /*
   * The menu asks for the config itself, next to its categories: the layout waiting for it first would make that two
   * requests one after the other (the page only starts once its layout has resolved).
   */
  server: !route.meta.loadsRestaurantConfig,
})

// The restaurant's JSON-LD (hours from the live config), on every page.
useRestaurantSchema(() => restaurantConfig.value?.restaurantConfig?.openingHours)

// Canonical + hreflang alternates (+ og:locale): one <link> each, keyed by id (checked in the built HTML, audit PR 6.4).
const head = useLocaleHead({ seo: true })
const notifications = useNotificationsStore()

const title = computed(() =>
  t(typeof route.meta.title === 'string' ? route.meta.title : 'head.title'),
)
const isMenuPage = computed(() => route.path.endsWith('/menu'))
// The home page of any language (/fr, /en/, ...), or / before the locale redirect.
const isHomePage = computed(() => /^\/(?:[a-z]{2}\/?)?$/u.test(route.path))
</script>
