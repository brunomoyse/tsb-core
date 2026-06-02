<template>
    <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
        <div class="w-full max-w-md">
            <div class="relative bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div class="absolute top-3 right-3 z-10 flex gap-0.5">
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

                <div class="px-7 sm:px-10 py-8 sm:py-10">
                    <h1 class="text-2xl font-semibold text-gray-900 text-center mb-4">
                        {{ $t('login.title') }}
                    </h1>

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
import { definePageMeta, navigateTo, useLocalePath, useRoute, useSeoMeta, useSwitchLocalePath } from '#imports'
import AuthFlow from '~/components/auth/AuthFlow.vue'
import { useI18n } from 'vue-i18n'

definePageMeta({ public: true })

const { t, locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()
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
    if (!import.meta.client) return

    /*
     * Persist the session-expired notice across the Zitadel round-trip below.
     * Without this, the redirect would wipe the `?session=expired` query param
     * and the user would land on the form with no context.
     */
    if (route.query.session === 'expired') {
        sessionStorage.setItem('auth_session_expired', '1')
    }
    if (sessionStorage.getItem('auth_session_expired') === '1') {
        sessionExpired.value = true
        if (authRequestId.value) sessionStorage.removeItem('auth_session_expired')
    }

    // Have an authRequestId — AuthFlow can drive the OTP / SSO flows.
    if (authRequestId.value) return

    const { useOidc } = await import('~/composables/useOidc')
    const { isAuthenticated } = useOidc()

    // Already authenticated and no auth flow in progress — they don't belong here.
    if (await isAuthenticated()) {
        const localePath = useLocalePath()
        await navigateTo(localePath('menu'))
        return
    }

    /*
     * Bounce through Zitadel so we come back with an authRequestID. This
     * is the ONLY way AuthFlow obtains one — its finalize step must not mint
     * a fresh signIn() mid-flow, which orphans the auth_request and strands
     * the user mid-OTP.
     */
    const { signIn } = useOidc()
    const uiLocale = route.path.split('/')[1] || 'fr'
    await signIn({ ui_locales: uiLocale })
})
</script>
