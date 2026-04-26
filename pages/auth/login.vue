<template>
    <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
        <div class="w-full max-w-md">
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div class="px-7 sm:px-10 py-8 sm:py-10">
                    <!-- Top bar: language switcher (top-right) -->
                    <div class="flex items-start justify-between mb-2">
                        <div class="w-12" aria-hidden="true" />
                        <h1 class="text-2xl font-semibold text-gray-900 text-center flex-1">
                            {{ $t('login.title') }}
                        </h1>
                        <div class="flex justify-end gap-1.5">
                            <NuxtLink
                                v-for="lang in languages"
                                :key="lang.code"
                                :to="switchLocalePath(lang.code)"
                                :class="[
                                    'inline-flex items-center justify-center min-h-8 px-1.5 text-[11px] rounded-md transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300',
                                    locale === lang.code
                                        ? 'text-gray-700 font-medium'
                                        : 'text-gray-400 hover:text-gray-500'
                                ]"
                            >
                                {{ lang.label }}
                            </NuxtLink>
                        </div>
                    </div>

                    <!-- Session expired notice -->
                    <p
                        v-if="sessionExpired"
                        aria-atomic="true"
                        aria-live="assertive"
                        class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 mb-4 animate-shake"
                        role="alert"
                    >
                        {{ $t('notify.errors.sessionExpired') }}
                    </p>

                    <AuthFlow
                        mode="page"
                        :auth-request-id="authRequestId"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useRoute, useSeoMeta, useSwitchLocalePath } from '#imports'
import AuthFlow from '~/components/auth/AuthFlow.vue'
import { useI18n } from 'vue-i18n'
import { usePlatform } from '~/composables/usePlatform'

definePageMeta({ public: true })

const { t, locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const { isCapacitor } = usePlatform()
const route = useRoute()

const languages = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
    { code: 'nl', label: 'NL' },
    { code: 'zh', label: '中文' },
]

const sessionExpired = ref(false)
const authRequestId = computed(
    () => (route.query.authRequestID as string) || (route.query.authRequest as string) || '',
)

useSeoMeta({
    title: t('schema.login.title'),
    description: t('schema.login.description'),
    robots: 'noindex,nofollow',
})

onMounted(async () => {
    if (route.query.session === 'expired') {
        sessionExpired.value = true
        return
    }

    if (!authRequestId.value && import.meta.client) {
        const { useOidc } = await import('~/composables/useOidc')
        const { isAuthenticated } = useOidc()
        if (await isAuthenticated()) return

        if (!isCapacitor) {
            // Web: bounce through Zitadel so we come back with an authRequestID;
            // AuthFlow can then drive the OTP / SSO flows.
            const { signIn } = useOidc()
            const uiLocale = route.path.split('/')[1] || 'fr'
            await signIn({ ui_locales: uiLocale })
        }
        // Capacitor handles its own bootstrap inside AuthFlow.
    }
})
</script>
