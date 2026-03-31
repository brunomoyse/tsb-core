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
                            :disabled="loading"
                            class="w-full flex items-center justify-center bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none"
                            @click="loginWithProvider('google')"
                        >
                            <img alt="Google" class="w-5 h-5 mr-2" src="/icons/google-icon.svg"/>
                            <span class="text-gray-700 text-sm font-medium">{{ $t('login.ssoGoogle') }}</span>
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
                            <NuxtLinkLocale to="/auth/register" class="whitespace-nowrap text-red-500 font-medium hover:text-red-600 transition-colors duration-300">
                                {{ $t('login.register') }}
                            </NuxtLinkLocale>
                        </p>
                        <p>
                            <NuxtLinkLocale to="/auth/forgot-password" class="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-300">
                                {{ $t('login.forgot') }}
                            </NuxtLinkLocale>
                        </p>
                    </div>

                    <!-- Language Selector -->
                    <div class="mt-5 flex justify-center gap-3">
                        <NuxtLink
                            v-for="lang in languages"
                            :key="lang.code"
                            :to="switchLocalePath(lang.code)"
                            :class="[
                                'text-[11px] transition-colors duration-300',
                                locale === lang.code
                                    ? 'text-gray-700 font-medium'
                                    : 'text-gray-400 hover:text-gray-500'
                            ]"
                        >
                            {{ lang.label }}
                        </NuxtLink>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { definePageMeta, navigateTo, onMounted, ref, useRoute, useRuntimeConfig, useSwitchLocalePath } from '#imports'
import { useI18n } from 'vue-i18n'
import { usePlatform } from '~/composables/usePlatform'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: true })

const { t, locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const languages = [
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'nl', label: 'NL', flag: '🇳🇱' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
]
const { trackEvent } = useTracking()
const { isCapacitor } = usePlatform()
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

const capacitorAuthRequestId = ref('')

const initCapacitorAuth = async () => {
    // Get the authRequestID from Zitadel via fetch (no redirect)
    try {
        const { useOidc } = await import('~/composables/useOidc')
        const { getAuthRequestId } = useOidc()
        capacitorAuthRequestId.value = await getAuthRequestId()
    } catch (e: any) {
        console.error('Capacitor OIDC init error:', e)
    }
}

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

    // If we arrived without an authRequest, start the OIDC flow
    if (!authRequestId.value && import.meta.client) {
        const { useOidc } = await import('~/composables/useOidc')
        const { isAuthenticated } = useOidc()
        if (await isAuthenticated()) return

        if (isCapacitor) {
            // Capacitor: fetch authRequestID via API (no redirect) so the form can submit
            await initCapacitorAuth()
        } else {
            // Web: redirect to Zitadel (will come back with authRequestID)
            const { signIn } = useOidc()
            const uiLocale = route.path.split('/')[1] || 'fr'
            await signIn({ ui_locales: uiLocale })
        }
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
        // Determine the authRequestId — from URL query (web) or fetched on Capacitor
        const effectiveAuthRequestId = authRequestId.value || capacitorAuthRequestId.value

        if (effectiveAuthRequestId) {
            // We have an OIDC authRequestID — create session + finalize via backend proxy
            const { useZitadelApi } = await import('~/composables/useZitadelApi')
            const { createSession, finalizeOidcAuth } = useZitadelApi()

            const session = await createSession(email.value, password.value)
            const result = await finalizeOidcAuth(effectiveAuthRequestId, session.sessionId, session.sessionToken)
            trackEvent('user_logged_in', { method: 'email' })

            if (isCapacitor) {
                // Capacitor: exchange code for tokens directly using the token endpoint.
                // We can't use signinRedirectCallback() because the state parameter from
                // Zitadel's callback doesn't match the PKCE state from createSigninRequest().
                const callbackUrl = new URL(result.callbackUrl)
                const code = callbackUrl.searchParams.get('code')
                if (!code) throw new Error('No authorization code in callback URL')

                const { useOidc } = await import('~/composables/useOidc')
                const { exchangeCodeForTokens } = useOidc()
                await exchangeCodeForTokens(code)

                const { useAuthCallback } = await import('~/composables/useAuthCallback')
                const { processCallback } = useAuthCallback()
                await processCallback()
            } else {
                window.location.href = result.callbackUrl
            }
        } else if (isCapacitor) {
            // Capacitor: retry fetching authRequestId — never call signIn() (opens Safari)
            await initCapacitorAuth()
            if (capacitorAuthRequestId.value) {
                loading.value = false
                return login()
            }
            throw new Error('Could not initialize OIDC flow')
        } else {
            // Web: start OIDC flow (will come back with authRequestID)
            const { useOidc } = await import('~/composables/useOidc')
            const { signIn } = useOidc()
            await signIn({ login_hint: email.value })
        }
    } catch (error: any) {
        loading.value = false
        console.error('Login error:', error)
        // Refresh authRequestId on failure so retries work
        if (isCapacitor) {
            await initCapacitorAuth()
        }
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
        } else if (isCapacitor) {
            // Show actual error on Capacitor for debugging
            const msg = error?.message || JSON.stringify(error)
            errorMessage.value = msg
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

    const uiLocale = route.path.split('/')[1] || 'fr'

    // Save authRequestId for the IdP callback page to finalize the OIDC flow
    const effectiveAuthId = authRequestId.value || capacitorAuthRequestId.value
    sessionStorage.setItem('oidcAuthRequestId', effectiveAuthId)

    // Capacitor: use custom URL scheme so SFSafariViewController can redirect back to the app
    // (https://localhost is invalid in external Safari)
    const baseUrl = isCapacitor
        ? 'be.tokyosushibarliege.app:/'
        : config.public.baseUrl as string
    const successUrl = `${baseUrl}/${uiLocale}/auth/idp/callback`
    const failureUrl = `${baseUrl}/${uiLocale}/auth/idp/callback?error=true`

    try {
        const { authUrl } = await startIdpLogin(provider, successUrl, failureUrl)
        if (isCapacitor) {
            const { Browser } = await import('@capacitor/browser')
            await Browser.open({ url: authUrl, presentationStyle: 'popover' })
        } else {
            window.location.href = authUrl
        }
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
    if (import.meta.server || loading.value) return
    loading.value = true
    trackEvent('oauth_click', { provider })

    if (authRequestId.value || capacitorAuthRequestId.value) {
        // We have an authRequestId — start the IdP flow directly
        await startIdpFlow(provider)
    } else if (isCapacitor) {
        // Capacitor: fetch authRequestId first, then start IdP flow — never call signIn()
        await initCapacitorAuth()
        if (capacitorAuthRequestId.value) {
            await startIdpFlow(provider)
        } else {
            loading.value = false
            errorMessage.value = t('notify.errors.oauthFailed')
        }
    } else {
        // Web: save provider choice, start OIDC flow first.
        // When Zitadel redirects back with authRequestId, onMounted will pick it up.
        sessionStorage.setItem('pendingIdpProvider', provider)
        const { useOidc } = await import('~/composables/useOidc')
        const { signIn } = useOidc()
        const uiLocale = route.path.split('/')[1] || 'fr'
        await signIn({ ui_locales: uiLocale })
    }
}
</script>
