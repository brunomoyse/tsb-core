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

        <Body class="bg-tsb-one">
        <!-- Wrapper div for sticky footer -->
        <div class="min-h-screen flex flex-col">
            <header>
                <MobileNavbar/>
                <div class="mobile-only h-20"/>
                <SideNavbar/>
            </header>

            <main class="flex-1 bg-tsb-one pb-4 px-4 sm:ml-[142px]">
                <!-- Spacer for mobile navbar -->
                <slot/>
            </main>

            <footer class="p-4 text-xs text-gray-500">
                <div class="flex flex-wrap items-center justify-end space-x-2">
                    <NuxtLinkLocale class="hover:underline" to="/terms">
                        CGV
                    </NuxtLinkLocale>
                    <span>|</span>
                    <span>by</span>
                    <a class="inline-flex items-center hover:underline" href="https://brunomoyse.be" rel="noopener noreferrer"
                       target="_blank">
                        brunomoyse
                    </a>
                </div>
            </footer>
        </div>
        <!-- Notification tooltip always visible across pages -->
        <NotificationBar
            v-if="showNotification && notification"
            :message="notification.message"
            :persistent="notification.persistent"
            :duration="notification.duration"
            :variant="notification.variant"
            @close="showNotification = false"
        />

        <ScrollToTopButton v-if="typeof currentRoute.name === 'string' && currentRoute.name?.startsWith('menu')"
                    class="sm:hidden"/>

        </Body>

        </Html>
    </div>
</template>

<script lang="ts" setup>
import {useRoute} from 'vue-router'
import {computed, ref, onUnmounted} from 'vue'
import {useI18n} from 'vue-i18n'
import {useLocaleHead} from '#i18n'
import MobileNavbar from '~/components/navbar/MobileNavbar.vue'
import SideNavbar from '~/components/navbar/SideNavbar.vue'
import NotificationBar from "~/components/NotificationBar.vue";
import {eventBus} from "~/eventBus";
import ScrollToTopButton from "~/components/ScrollToTopButton.vue";

const route = useRoute()
const {t} = useI18n()
const head = useLocaleHead()
const currentRoute = useRoute();

const showNotification = ref(false)
const notification = ref({
    message: '',
    persistent: false,
    duration: 5000,
    variant: 'neutral'
})

const notifyHandler = (payload: any) => {
    notification.value = {
        message: payload.message,
        persistent: payload.persistent ?? false,
        duration: payload.duration ?? 5000,
        variant: payload.variant ?? 'neutral'
    }
    showNotification.value = true

    if (!notification.value.persistent) {
        setTimeout(() => {
            showNotification.value = false
        }, notification.value.duration)
    }
}

eventBus.on('notify', notifyHandler)

onUnmounted(() => {
    eventBus.off('notify', notifyHandler)
})

const title = computed(() => t(typeof route.meta.title === 'string' ? route.meta.title : 'head.title'))
</script>
