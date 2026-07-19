<template>
    <div>
        <Html :dir="head.htmlAttrs?.dir ?? 'ltr'" :lang="head.htmlAttrs?.lang ?? 'en'">

        <Head>
            <Title>{{ title }}</Title>
            <template v-for="link in head.link" :key="link.hid">
                <Link :id="link.hid" :href="link.href" :hreflang="link.hreflang" :rel="link.rel"/>
            </template>
            <template v-for="meta in head.meta" :key="meta.hid">
                <Meta :id="meta.hid" :content="meta.content" :property="meta.property"/>
            </template>
        </Head>

        <Body class="bg-ygf-bg overflow-x-hidden">
        <NuxtLoadingIndicator color="#DC2626" :height="2" />
        <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ygf-orange-500">
            {{ $t('common.skipToContent') }}
        </a>
        <div class="min-h-screen flex flex-col">
            <header>
                <MobileNavbar/>
                <div class="mobile-only h-20"/>
                <SideNavbar/>
            </header>

            <main
                id="main-content"
                class="flex-1 bg-ygf-bg px-4 sm:ml-[142px] overflow-x-clip pb-4"
            >
                <slot/>
            </main>

            <footer class="p-4 sm:ml-[142px] text-xs text-gray-600">
                <!-- Decorative steam-wisp divider (rising malatang steam) -->
                <div class="flex items-center justify-center gap-3 mb-4" aria-hidden="true">
                    <div class="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-gray-200" />
                    <svg class="w-6 h-6 text-ygf-orange-300/60" viewBox="0 0 100 60" fill="none">
                        <path d="M35 55 C30 45 40 38 35 28 C30 18 40 12 37 5" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
                        <path d="M52 58 C47 48 57 40 52 30 C47 20 57 13 54 6" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.6"/>
                        <path d="M69 55 C64 45 74 38 69 28 C64 18 74 12 71 5" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.35"/>
                    </svg>
                    <div class="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-gray-200" />
                </div>

                <div class="flex flex-wrap items-center justify-center gap-3">
                    <NuxtLinkLocale class="text-gray-600 hover:text-gray-800 transition-colors" to="/concept">
                        {{ $t('mkt.nav.concept') }}
                    </NuxtLinkLocale>
                    <span class="text-gray-300">|</span>
                    <NuxtLinkLocale class="text-gray-600 hover:text-gray-800 transition-colors" to="/about">
                        {{ $t('mkt.nav.about') }}
                    </NuxtLinkLocale>
                    <span class="text-gray-300">|</span>
                    <NuxtLinkLocale class="text-gray-600 hover:text-gray-800 transition-colors" to="/terms">
                        {{ $t('footer.terms') }}
                    </NuxtLinkLocale>
                    <span class="text-gray-300">|</span>
                    <NuxtLinkLocale class="text-gray-600 hover:text-gray-800 transition-colors" to="/privacy">
                        {{ $t('footer.privacy') }}
                    </NuxtLinkLocale>
                    <span class="text-gray-300">|</span>
                    <!-- Official YGF-branded social icons (orange squares, from the brand kit) -->
                    <a :href="brand.socials.instagram" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                        <img src="/images/icons/social-instagram.svg" alt="" class="w-4 h-4 opacity-70 hover:opacity-100 transition-opacity" loading="lazy" />
                    </a>
                    <a :href="brand.socials.tiktok" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                        <img src="/images/icons/social-tiktok.svg" alt="" class="w-4 h-4 opacity-70 hover:opacity-100 transition-opacity" loading="lazy" />
                    </a>
                    <a :href="brand.socials.rednote" target="_blank" rel="noopener noreferrer" aria-label="RedNote">
                        <img src="/images/icons/social-rednote.svg" alt="" class="w-4 h-4 opacity-70 hover:opacity-100 transition-opacity" loading="lazy" />
                    </a>
                </div>
                <!-- Restaurant name -->
                <p class="text-center mt-2 text-[11px] text-gray-400/70 tracking-[0.3em] font-light" aria-hidden="true">{{ brand.name }}</p>
                <div class="text-center mt-2 text-[10px] text-gray-500">
                    <a href="https://nuagemagique.dev" target="_blank" rel="noopener noreferrer" class="hover:text-gray-500 transition-colors">nuagemagique.dev</a>
                </div>
            </footer>
        </div>
        <ClientOnly>
            <LazyCartMobile :is-ordering-available="isOrderingAvailable" />
            <LazyCartFloatingCartBar v-if="isMenuPage" />
        </ClientOnly>
        <ClientOnly>
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
            <LazyScrollToTopButton class="sm:hidden"/>
        </ClientOnly>


        </Body>

        </Html>
    </div>
</template>

<script lang="ts" setup>
import MobileNavbar from '~/components/navbar/MobileNavbar.vue'
import SideNavbar from '~/components/navbar/SideNavbar.vue'
import { computed } from 'vue'
import { useHead } from '#imports'
import { useI18n } from 'vue-i18n'
import { useLocaleHead } from '#i18n'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useRestaurantConfig } from '#engine/composables/useRestaurantConfig'
import { useRoute } from 'vue-router'

useHead({
    link: [
        {
            rel: 'preload',
            href: '/fonts/channel.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: 'anonymous'
        }
    ]
})

const route = useRoute()
const {t} = useI18n()
const { brand } = useAppConfig()

// Lazy: only consumed by <CartMobile> below, which is wrapped in <ClientOnly>.
// Awaiting non-lazy here was blocking SSR TTFB on every page (~300ms in the audit).
const { config: restaurantConfig } = await useRestaurantConfig({ lazy: true })
const isOrderingAvailable = computed(() => restaurantConfig.value?.restaurantConfig?.isOrderingCurrentlyOpen ?? false)

const head = useLocaleHead()
const notifications = useNotificationsStore()

const title = computed(() => t(typeof route.meta.title === 'string' ? route.meta.title : 'head.title'))
const isMenuPage = computed(() => route.path.endsWith('/menu'))
</script>
