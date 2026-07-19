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
        <NuxtLoadingIndicator color="#F58220" :height="2" />
        <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ygf-orange-500">
            {{ $t('common.skipToContent') }}
        </a>
        <div class="min-h-screen flex flex-col">
            <!-- display:contents — a plain <header> box would be TopNavbar's
                 containing block, exactly nav-height, so sticky couldn't stick. -->
            <header class="contents">
                <MobileNavbar/>
                <div class="mobile-only h-20"/>
                <TopNavbar/>
            </header>

            <main
                id="main-content"
                class="flex-1 bg-ygf-bg overflow-x-clip pb-4"
            >
                <slot/>
            </main>

            <!-- Black footer with white logo, per GUIDELINES.md §4.5. -->
            <footer class="bg-ygf-black text-white/70 mt-12">
                <div class="max-w-7xl mx-auto px-6 py-10 sm:py-12">
                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
                        <div class="space-y-3">
                            <img src="/images/logos/logo-white.svg" :alt="`${brand.name} logo`" width="120" height="40" class="h-10 w-auto" loading="lazy" />
                            <address class="not-italic text-sm leading-relaxed">
                                {{ brand.address.street }}<br>
                                {{ brand.address.postal }} {{ brand.address.city }}<br>
                                <a :href="`tel:${brand.phone.replace(/\s/gu, '')}`" class="hover:text-white transition-colors">{{ brand.phone }}</a>
                            </address>
                        </div>

                        <nav :aria-label="$t('nav.secondary')" class="flex flex-col gap-2 text-sm">
                            <NuxtLinkLocale class="hover:text-white transition-colors" to="/concept">{{ $t('mkt.nav.concept') }}</NuxtLinkLocale>
                            <NuxtLinkLocale class="hover:text-white transition-colors" to="/about">{{ $t('mkt.nav.about') }}</NuxtLinkLocale>
                            <NuxtLinkLocale class="hover:text-white transition-colors" to="/terms">{{ $t('footer.terms') }}</NuxtLinkLocale>
                            <NuxtLinkLocale class="hover:text-white transition-colors" to="/privacy">{{ $t('footer.privacy') }}</NuxtLinkLocale>
                        </nav>

                        <!-- Official YGF-branded social icons (orange squares, from the brand kit) -->
                        <div class="flex items-center gap-3">
                            <a :href="brand.socials.instagram" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                               class="inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/10 transition-colors">
                                <img src="/images/icons/social-instagram.svg" alt="" aria-hidden="true" class="w-5 h-5" loading="lazy" />
                            </a>
                            <a :href="brand.socials.tiktok" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                               class="inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/10 transition-colors">
                                <img src="/images/icons/social-tiktok.svg" alt="" aria-hidden="true" class="w-5 h-5" loading="lazy" />
                            </a>
                            <a :href="brand.socials.rednote" target="_blank" rel="noopener noreferrer" aria-label="RedNote"
                               class="inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/10 transition-colors">
                                <img src="/images/icons/social-rednote.svg" alt="" aria-hidden="true" class="w-5 h-5" loading="lazy" />
                            </a>
                        </div>
                    </div>

                    <div class="mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
                        <p translate="no">{{ brand.name }}</p>
                        <a href="https://nuagemagique.dev" target="_blank" rel="noopener noreferrer" class="hover:text-white/80 transition-colors">nuagemagique.dev</a>
                    </div>
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
import TopNavbar from '~/components/navbar/TopNavbar.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleHead } from '#i18n'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useRestaurantConfig } from '#engine/composables/useRestaurantConfig'
import { useRoute } from 'vue-router'

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
