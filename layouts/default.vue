<template>
  <div>
    <Html :lang="head.htmlAttrs?.lang ?? 'en'" :dir="head.htmlAttrs?.dir ?? 'ltr'">

    <Head>
      <Title>{{ title }}</Title>
      <template v-for="link in head.link" :key="link.hid">
        <Link :id="link.hid" :rel="link.rel" :href="link.href" :hreflang="link.hreflang" />
      </template>
      <template v-for="meta in head.meta" :key="meta.hid">
        <Meta :id="meta.hid" :property="meta.property" :content="meta.content" />
      </template>
    </Head>

    <Body class="bg-tsb-one">
      <!-- Wrapper div for sticky footer -->
      <div class="min-h-screen flex flex-col">
        <header>
          <MobileNavbar />
          <SideNavbar />
        </header>

        <main class="flex-1 bg-tsb-one p-4 sm:ml-[142px] pt-8">
          <!-- Spacer for mobile navbar -->
          <div class="mobile-only h-20" />
          <slot />
        </main>

        <footer class="p-4 text-xs text-gray-500">
          <div class="flex flex-wrap items-center justify-end space-x-2">
            <NuxtLinkLocale to="/terms" class="hover:underline">
              CGV
            </NuxtLinkLocale>
            <span>|</span>
            <span>by</span>
            <a href="https://brunomoyse.be" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center hover:underline">
              brunomoyse
            </a>
          </div>
        </footer>
      </div>
      <!-- Cookie consent tooltip always visible across pages -->
      <CookieConsent />
      <!-- Global Cart Button -->
      <CartButton class="lg:hidden" v-if="typeof currentRoute.name === 'string' && currentRoute.name?.startsWith('menu')" />

    </Body>

    </Html>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleHead } from '#i18n'
import MobileNavbar from '~/components/navbar/MobileNavbar.vue'
import SideNavbar from '~/components/navbar/SideNavbar.vue'


const route = useRoute()
const { t } = useI18n()
const head = useLocaleHead()
const currentRoute = useRoute();

const title = computed(() => t(typeof route.meta.title === 'string' ? route.meta.title : 'head.title'))
</script>