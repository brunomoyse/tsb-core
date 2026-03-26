<template>
    <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
        <div class="w-full max-w-md">

            <!-- Card container -->
            <div class="bg-tsb-two rounded-2xl relative overflow-hidden">
                <!-- Decorative blurred accents -->
                <div class="absolute -top-16 -right-16 w-56 h-56 bg-tsb-four/40 rounded-full blur-3xl pointer-events-none" />
                <div class="absolute -bottom-16 -left-16 w-44 h-44 bg-tsb-four/30 rounded-full blur-3xl pointer-events-none" />

                <!-- Kanji watermark: 歓迎 (welcome) -->
                <span
                    class="absolute top-4 right-5 font-channel text-[80px] sm:text-[100px] text-red-200/[0.07] leading-none select-none pointer-events-none"
                    aria-hidden="true"
                >歓迎</span>

                <div class="relative px-7 sm:px-10 py-8 sm:py-10">
                    <!-- Decorative torii gate -->
                    <div class="flex justify-center mb-2" aria-hidden="true">
                        <svg class="w-9 h-9 text-red-400/30" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <line x1="12" y1="55" x2="12" y2="15"/>
                            <line x1="48" y1="55" x2="48" y2="15"/>
                            <line x1="8" y1="18" x2="52" y2="18"/>
                            <path d="M5 12 Q30 4 55 12" stroke-width="3"/>
                            <line x1="20" y1="18" x2="20" y2="28"/>
                            <line x1="40" y1="18" x2="40" y2="28"/>
                            <line x1="15" y1="28" x2="45" y2="28"/>
                        </svg>
                    </div>

                    <!-- Title -->
                    <h1 class="text-2xl font-semibold text-gray-900 text-center">
                        {{ $t('login.title') }}
                    </h1>

                    <!-- Chopstick divider -->
                    <div class="flex justify-center items-center mt-2 mb-6" aria-hidden="true">
                        <svg class="w-14 h-4 text-red-400/40" viewBox="0 0 80 20" fill="none">
                            <line x1="5" y1="18" x2="38" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <line x1="42" y1="2" x2="75" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <circle cx="40" cy="2" r="1.5" fill="currentColor" opacity="0.6"/>
                        </svg>
                    </div>

                    <!-- Session expired -->
                    <p v-if="sessionExpired" class="text-sm text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-xl px-3.5 py-2.5 mb-4 animate-shake">
                        {{ $t('notify.errors.sessionExpired') }}
                    </p>

                    <!-- Login Form -->
                    <form class="space-y-4" @submit.prevent="login">
                        <!-- Email -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="email">{{ $t('login.email') }}</label>
                            <input
                                id="email"
                                v-model="email"
                                :placeholder="$t('login.emailPlaceholder')"
                                autocomplete="email"
                                class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                                name="email"
                                required
                                type="email"
                            />
                        </div>

                        <!-- Password -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="password">{{ $t('login.password') }}</label>
                            <input
                                id="password"
                                v-model="password"
                                :placeholder="$t('login.passwordPlaceholder')"
                                autocomplete="current-password"
                                class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                                name="password"
                                required
                                type="password"
                            />
                        </div>

                        <!-- Inline Error -->
                        <div v-if="errorMessage" role="alert" class="text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl px-3.5 py-2.5 animate-shake">
                            <p>{{ errorMessage }}</p>
                            <!-- Resend verification email button -->
                            <button
                                v-if="showResendVerification"
                                :disabled="resendCooldown > 0"
                                class="mt-2 text-red-500 font-medium underline hover:text-red-600 transition-colors duration-300 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                                @click="resendEmail"
                            >
                                {{ resendSent ? $t('verify.sent') : resendCooldown > 0 ? `${$t('verify.resend')} (${resendCooldown}s)` : $t('verify.resend') }}
                            </button>
                        </div>

                        <!-- Submit Button -->
                        <button
                            :disabled="loading"
                            data-testid="login-submit"
                            class="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md disabled:opacity-50"
                            type="submit"
                        >
                            {{ $t('login.submit') }}
                        </button>
                    </form>

                    <!-- OR Divider -->
                    <div class="relative my-6">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300/50"></div>
                        </div>
                        <div class="relative text-center">
                            <span class="bg-tsb-two px-3 text-sm text-gray-500 uppercase">
                                {{ $t('login.dividerOr') }}
                            </span>
                        </div>
                    </div>

                    <!-- Social Login Buttons -->
                    <div class="space-y-3">
                        <!-- Google -->
                        <button
                            class="w-full flex items-center justify-center bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none"
                            @click="loginWithProvider('google')"
                        >
                            <img alt="Google" class="w-5 h-5 mr-2" src="/icons/google-icon.svg"/>
                            <span class="text-gray-700 text-sm font-medium">{{ $t('login.ssoGoogle') }}</span>
                        </button>

                        <!-- Facebook -->
                        <button
                            class="w-full flex items-center justify-center bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none"
                            @click="loginWithProvider('facebook')"
                        >
                            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            <span class="text-gray-700 text-sm font-medium">{{ $t('login.ssoFacebook') }}</span>
                        </button>

                        <!-- Apple (uncomment when Apple Developer account is ready)
                        <button
                            class="w-full flex items-center justify-center bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none"
                            @click="loginWithProvider('apple')"
                        >
                            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#000"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                            <span class="text-gray-700 text-sm font-medium">{{ $t('login.ssoApple') }}</span>
                        </button>
                        -->
                    </div>

                    <!-- Links -->
                    <div class="mt-6 space-y-2 text-center">
                        <p class="text-sm text-gray-600">
                            {{ $t('login.noAccount') }}
                            <NuxtLinkLocale to="/auth/register" class="text-red-500 font-medium hover:text-red-600 transition-colors duration-300">
                                {{ $t('login.register') }}
                            </NuxtLinkLocale>
                        </p>
                        <p>
                            <NuxtLinkLocale to="/auth/forgot-password" class="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-300">
                                {{ $t('login.forgot') }}
                            </NuxtLinkLocale>
                        </p>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { definePageMeta, onMounted, ref, useRoute, useRuntimeConfig } from '#imports'
import { useI18n } from 'vue-i18n'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: true })

const { t } = useI18n()
const { trackEvent } = useTracking()
const route = useRoute()
const config = useRuntimeConfig()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)
const sessionExpired = ref(false)
const showResendVerification = ref(false)
const resendCooldown = ref(0)
const resendSent = ref(false)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const resendEmail = async () => {
    if (!email.value) return
    try {
        const { useZitadelApi } = await import('~/composables/useZitadelApi')
        const { resendVerification } = useZitadelApi()
        await resendVerification(email.value)
        resendSent.value = true
        resendCooldown.value = 20
        cooldownTimer = setInterval(() => {
            resendCooldown.value--
            if (resendCooldown.value <= 0 && cooldownTimer) {
                clearInterval(cooldownTimer)
                cooldownTimer = null
            }
        }, 1000)
        setTimeout(() => { resendSent.value = false }, 5000)
    } catch {
        // Silent
    }
}

const authRequestId = computed(() => (route.query.authRequestID as string) || (route.query.authRequest as string) || '')

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

    // If we arrived without an authRequest, auto-start the OIDC flow.
    // Zitadel will redirect back to this page WITH the authRequest param.
    if (!authRequestId.value && import.meta.client) {
        const { useOidc } = await import('~/composables/useOidc')
        const { isAuthenticated, signIn } = useOidc()
        // Don't redirect if already authenticated
        if (await isAuthenticated()) return
        const locale = route.path.split('/')[1] || 'fr'
        await signIn({ ui_locales: locale })
        return
    }

    // Check for pending IdP provider (saved before OIDC redirect started)
    if (authRequestId.value && import.meta.client) {
        const pendingProvider = sessionStorage.getItem('pendingIdpProvider')
        if (pendingProvider) {
            sessionStorage.removeItem('pendingIdpProvider')
            await startIdpFlow(pendingProvider)
        }
    }
})

const login = async () => {
    if (import.meta.server) return
    errorMessage.value = ''
    showResendVerification.value = false
    loading.value = true

    try {
        if (authRequestId.value) {
            // We have an OIDC authRequestID — create session + finalize via backend proxy
            const { useZitadelApi } = await import('~/composables/useZitadelApi')
            const { createSession, finalizeOidcAuth } = useZitadelApi()

            const session = await createSession(email.value, password.value)
            const result = await finalizeOidcAuth(authRequestId.value, session.sessionId, session.sessionToken)
            trackEvent('user_logged_in', { method: 'email' })
            window.location.href = result.callbackUrl
        } else {
            // No authRequestID — start OIDC flow (will come back with authRequestID)
            const { useOidc } = await import('~/composables/useOidc')
            const { signIn } = useOidc()
            await signIn({ login_hint: email.value })
        }
    } catch (error: any) {
        loading.value = false
        if (import.meta.dev) console.error('Login error:', error)
        const status = error?.response?.status || error?.statusCode
        const errorCode = error?.data?.error
        if (status === 429) {
            trackEvent('login_error', { error_type: 'rate_limited' })
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else if (errorCode === 'email_not_verified') {
            trackEvent('login_error', { error_type: 'email_not_verified' })
            errorMessage.value = t('notify.errors.emailNotVerified')
            showResendVerification.value = true
        } else if (errorCode === 'no_password') {
            trackEvent('login_error', { error_type: 'no_password' })
            errorMessage.value = t('notify.errors.noPassword')
        } else {
            trackEvent('login_error', { error_type: 'invalid_credentials' })
            errorMessage.value = t('notify.errors.invalidCredentials')
        }
    }
}

const startIdpFlow = async (provider: string) => {
    errorMessage.value = ''
    loading.value = true

    const { useZitadelApi } = await import('~/composables/useZitadelApi')
    const { startIdpLogin } = useZitadelApi()

    const baseUrl = config.public.baseUrl as string
    const locale = route.path.split('/')[1] || 'fr'

    // Save authRequestId for the IdP callback page to finalize the OIDC flow
    sessionStorage.setItem('oidcAuthRequestId', authRequestId.value)

    const successUrl = `${baseUrl}/${locale}/auth/idp/callback`
    const failureUrl = `${baseUrl}/${locale}/auth/idp/callback?error=true`

    try {
        const { authUrl } = await startIdpLogin(provider, successUrl, failureUrl)
        window.location.href = authUrl
    } catch (error: any) {
        loading.value = false
        if (import.meta.dev) console.error('IdP start error:', error)
        const status = error?.response?.status || error?.statusCode
        if (status === 429) {
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else {
            errorMessage.value = t('notify.errors.oauthFailed')
        }
    }
}

const loginWithProvider = async (provider: string) => {
    if (import.meta.server) return
    trackEvent('oauth_click', { provider })

    if (authRequestId.value) {
        // We already have an authRequestId — start the IdP flow directly
        await startIdpFlow(provider)
    } else {
        // No authRequestId yet — save provider choice, start OIDC flow first.
        // When Zitadel redirects back with authRequestId, onMounted will pick it up.
        sessionStorage.setItem('pendingIdpProvider', provider)
        const { useOidc } = await import('~/composables/useOidc')
        const { signIn } = useOidc()
        const locale = route.path.split('/')[1] || 'fr'
        await signIn({ ui_locales: locale })
    }
}
</script>
