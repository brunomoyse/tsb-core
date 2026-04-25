<template>
    <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
        <div class="w-full max-w-md">

            <!-- Card container -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div class="px-7 sm:px-10 py-8 sm:py-10">
                    <!-- Title -->
                    <h1 class="text-2xl font-semibold text-gray-900 text-center mb-6">
                        {{ $t('login.title') }}
                    </h1>

                    <!-- Session expired -->
                    <p v-if="sessionExpired" role="alert" aria-live="assertive" aria-atomic="true" class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 mb-4 animate-shake">
                        {{ $t('notify.errors.sessionExpired') }}
                    </p>

                    <!-- Step 1: Email -->
                    <form v-if="step === 'email'" class="space-y-4" @submit.prevent="requestCode">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="email">{{ $t('login.email') }}</label>
                            <input
                                id="email"
                                v-model="email"
                                :placeholder="$t('login.emailPlaceholder')"
                                autocomplete="email"
                                class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                                name="email"
                                required
                                type="email"
                            />
                        </div>

                        <!-- Inline Error -->
                        <div v-if="errorMessage" role="alert" aria-live="assertive" aria-atomic="true" data-testid="login-error" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 animate-shake">
                            <p>{{ errorMessage }}</p>
                            <!-- Resend verification email button -->
                            <button
                                v-if="showResendVerification"
                                type="button"
                                :disabled="resendCooldown > 0"
                                class="mt-2 inline-flex min-h-11 items-center text-red-500 font-medium underline hover:text-red-600 transition-colors duration-300 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded-md"
                                @click="resendVerificationEmail"
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
                            {{ $t('login.sendCode') }}
                        </button>
                    </form>

                    <!-- Step 2: Code -->
                    <form v-else class="space-y-4" @submit.prevent="verifyCode">
                        <p class="text-sm text-gray-600">
                            {{ $t('login.codeSent', { email }) }}
                        </p>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="otp-code">{{ $t('login.codeLabel') }}</label>
                            <input
                                id="otp-code"
                                v-model="code"
                                :placeholder="$t('login.codePlaceholder')"
                                autocomplete="one-time-code"
                                inputmode="numeric"
                                pattern="[0-9]{6}"
                                maxlength="6"
                                class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 tracking-[0.5em] text-center text-lg font-mono focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                                name="code"
                                required
                                type="text"
                            />
                        </div>

                        <div v-if="errorMessage" role="alert" aria-live="assertive" aria-atomic="true" data-testid="login-error" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 animate-shake">
                            {{ errorMessage }}
                        </div>

                        <button
                            :disabled="loading || code.length < 6"
                            data-testid="login-verify"
                            class="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md disabled:opacity-50"
                            type="submit"
                        >
                            {{ $t('login.verify') }}
                        </button>

                        <div class="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                class="inline-flex min-h-11 items-center text-gray-500 hover:text-gray-700 transition-colors duration-300 rounded-md px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                                @click="backToEmail"
                            >
                                {{ $t('login.backToEmail') }}
                            </button>
                            <button
                                type="button"
                                :disabled="resendCooldown > 0 || loading"
                                class="inline-flex min-h-11 items-center text-red-500 font-medium hover:text-red-600 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-md px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                                @click="resendCode"
                            >
                                {{ resendCooldown > 0 ? $t('login.resendCooldown', { seconds: resendCooldown }) : $t('login.resendCode') }}
                            </button>
                        </div>
                    </form>

                    <!-- OR Divider -->
                    <div v-if="step === 'email'" class="relative my-6">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300/50"></div>
                        </div>
                        <div class="relative text-center">
                            <span class="bg-white px-3 text-sm text-gray-500 uppercase">
                                {{ $t('login.dividerOr') }}
                            </span>
                        </div>
                    </div>

                    <!-- Social Login Buttons -->
                    <div v-if="step === 'email'" class="space-y-3">
                        <!-- Google -->
                        <button
                            type="button"
                            :disabled="loading"
                            class="w-full flex items-center justify-center bg-white border border-gray-200 rounded-xl py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none"
                            @click="loginWithProvider('google')"
                        >
                            <img alt="" aria-hidden="true" class="w-5 h-5 mr-2" src="/icons/google-icon.svg"/>
                            <span class="text-gray-700 text-sm font-medium">{{ $t('login.ssoGoogle') }}</span>
                        </button>

                        <!-- Apple -->
                        <button
                            type="button"
                            :disabled="loading"
                            class="w-full flex items-center justify-center bg-white border border-gray-200 rounded-xl py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none"
                            @click="loginWithProvider('apple')"
                        >
                            <svg aria-hidden="true" class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#000"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                            <span class="text-gray-700 text-sm font-medium">{{ $t('login.ssoApple') }}</span>
                        </button>
                    </div>
                    <!-- Links -->
                    <div v-if="step === 'email'" class="mt-6 space-y-2 text-center">
                        <p class="text-sm text-gray-600">
                            {{ $t('login.noAccount') }}
                                <NuxtLinkLocale to="/auth/register" class="inline-flex min-h-11 items-center whitespace-nowrap text-red-500 font-medium hover:text-red-600 transition-colors duration-300 rounded-md px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                                    {{ $t('login.register') }}
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
                                'inline-flex min-h-11 items-center rounded-md px-2 text-[11px] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300',
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
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
    { code: 'nl', label: 'NL' },
    { code: 'zh', label: '中文' },
]
const { trackEvent } = useTracking()
const { isCapacitor } = usePlatform()
const route = useRoute()
const config = useRuntimeConfig()

const step = ref<'email' | 'code'>('email')
const email = ref('')
const code = ref('')
const otpSessionId = ref('')
const otpSessionToken = ref('')
const errorMessage = ref('')
const loading = ref(false)
const sessionExpired = ref(false)
const showResendVerification = ref(false)
const resendCooldown = ref(0)
const resendSent = ref(false)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const capacitorAuthRequestId = ref('')

const initCapacitorAuth = async () => {
    try {
        const { useOidc } = await import('~/composables/useOidc')
        const { getAuthRequestId } = useOidc()
        capacitorAuthRequestId.value = await getAuthRequestId()
    } catch (e: any) {
        console.error('Capacitor OIDC init error:', e)
    }
}

const startCooldown = (seconds = 20) => {
    resendCooldown.value = seconds
    if (cooldownTimer) clearInterval(cooldownTimer)
    cooldownTimer = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0 && cooldownTimer) {
            clearInterval(cooldownTimer)
            cooldownTimer = null
        }
    }, 1000)
}

const resendVerificationEmail = async () => {
    if (!email.value) return
    try {
        const { useZitadelApi } = await import('~/composables/useZitadelApi')
        const { resendVerification } = useZitadelApi()
        await resendVerification(email.value)
        resendSent.value = true
        startCooldown(20)
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

const requestCode = async () => {
    if (import.meta.server) return
    errorMessage.value = ''
    showResendVerification.value = false
    loading.value = true

    try {
        const { useZitadelApi } = await import('~/composables/useZitadelApi')
        const { requestOtpLogin } = useZitadelApi()
        const session = await requestOtpLogin(email.value)

        otpSessionId.value = session.sessionId
        otpSessionToken.value = session.sessionToken
        step.value = 'code'
        startCooldown(20)
        trackEvent('otp_requested')
    } catch (error: any) {
        const status = error?.response?.status || error?.statusCode
        const errorCode = error?.data?.error
        if (status === 429) {
            trackEvent('login_error', { error_type: 'rate_limited' })
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else if (errorCode === 'email_not_verified') {
            trackEvent('login_error', { error_type: 'email_not_verified' })
            errorMessage.value = t('notify.errors.emailNotVerified')
            showResendVerification.value = true
        } else {
            trackEvent('login_error', { error_type: 'request_failed' })
            errorMessage.value = t('notify.errors.requestFailed')
        }
    } finally {
        loading.value = false
    }
}

const backToEmail = () => {
    step.value = 'email'
    code.value = ''
    errorMessage.value = ''
    otpSessionId.value = ''
    otpSessionToken.value = ''
}

const resendCode = async () => {
    if (!otpSessionId.value || !otpSessionToken.value) return
    errorMessage.value = ''
    loading.value = true
    try {
        const { useZitadelApi } = await import('~/composables/useZitadelApi')
        const { resendOtpLogin } = useZitadelApi()
        await resendOtpLogin(otpSessionId.value, otpSessionToken.value)
        startCooldown(20)
        trackEvent('otp_resent')
    } catch (error: any) {
        const status = error?.response?.status || error?.statusCode
        if (status === 429) {
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else {
            errorMessage.value = t('notify.errors.requestFailed')
        }
    } finally {
        loading.value = false
    }
}

const verifyCode = async () => {
    if (import.meta.server) return
    errorMessage.value = ''
    loading.value = true

    try {
        const { useZitadelApi } = await import('~/composables/useZitadelApi')
        const { verifyOtpLogin, finalizeOidcAuth } = useZitadelApi()

        const verified = await verifyOtpLogin(otpSessionId.value, otpSessionToken.value, code.value)

        // Determine the authRequestId — from URL query (web) or fetched on Capacitor
        const effectiveAuthRequestId = authRequestId.value || capacitorAuthRequestId.value

        if (!effectiveAuthRequestId) {
            if (isCapacitor) {
                await initCapacitorAuth()
                if (!capacitorAuthRequestId.value) throw new Error('Could not initialize OIDC flow')
            } else {
                // Web: shouldn't usually happen since onMounted redirected to Zitadel first.
                const { useOidc } = await import('~/composables/useOidc')
                const { signIn } = useOidc()
                await signIn({ login_hint: email.value })
                return
            }
        }

        const finalAuthRequestId = authRequestId.value || capacitorAuthRequestId.value
        const result = await finalizeOidcAuth(finalAuthRequestId, verified.sessionId, verified.sessionToken)
        trackEvent('user_logged_in', { method: 'otp' })

        if (isCapacitor) {
            const callbackUrl = new URL(result.callbackUrl)
            const authCode = callbackUrl.searchParams.get('code')
            if (!authCode) throw new Error('No authorization code in callback URL')

            const { useOidc } = await import('~/composables/useOidc')
            const { exchangeCodeForTokens } = useOidc()
            await exchangeCodeForTokens(authCode)

            const { useAuthCallback } = await import('~/composables/useAuthCallback')
            const { processCallback } = useAuthCallback()
            await processCallback()
        } else {
            window.location.href = result.callbackUrl
        }
    } catch (error: any) {
        loading.value = false
        if (import.meta.dev) console.error('OTP verify error:', error)
        if (isCapacitor) {
            await initCapacitorAuth()
        }
        const status = error?.response?.status || error?.statusCode
        if (status === 429) {
            trackEvent('login_error', { error_type: 'rate_limited' })
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else {
            trackEvent('login_error', { error_type: 'invalid_code' })
            errorMessage.value = t('notify.errors.invalidCode')
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
