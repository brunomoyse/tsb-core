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

      <Body>
        <header>
          <Navbar />
          <!-- Spacer to prevent content from being hidden behind the fixed Navbar -->
          <div class="h-20"></div>
        </header>

        <main>
          <slot />
        </main>

        <footer></footer>

        <!-- Login Modal: Shows only when route is "/login" -->
        <Teleport to="body">
          <Login v-if="route.name === 'login'" />
        </Teleport>
      </Body>

    </Html>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleHead } from '#i18n'

const route = useRoute()
const { t } = useI18n()
const head = useLocaleHead()
const title = computed(() => t(typeof route.meta.title === 'string' ? route.meta.title : 'head.title'))
</script>