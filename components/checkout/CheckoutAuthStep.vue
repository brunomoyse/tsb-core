<template>
    <div class="max-w-md mx-auto">
        <div class="bg-tsb-two rounded-2xl relative overflow-hidden">
            <!-- Decorative blurred accents -->
            <div class="absolute -top-16 -right-16 w-56 h-56 bg-tsb-four/40 rounded-full blur-3xl pointer-events-none" />
            <div class="absolute -bottom-16 -left-16 w-44 h-44 bg-tsb-four/30 rounded-full blur-3xl pointer-events-none" />

            <!-- Kanji watermark: 歓迎 (welcome) -->
            <span
                class="absolute top-4 right-5 font-channel text-[80px] sm:text-[100px] text-red-200/[0.07] leading-none select-none pointer-events-none"
                aria-hidden="true"
            >歓迎</span>

            <div class="relative px-6 sm:px-8 py-7 sm:py-8">
                <!-- Cart-saved chip -->
                <div class="flex items-center justify-center gap-2 mb-4">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-gray-200/70 text-xs text-gray-600">
                        <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {{ $t('checkout.authStep.cartSaved') }}
                        <span v-if="cartStore.products.length > 0" class="text-gray-400">·</span>
                        <span v-if="cartStore.products.length > 0" class="tabular-nums">
                            {{ $t('checkout.itemCount', { count: cartStore.totalItems }, cartStore.totalItems) }}
                        </span>
                    </span>
                </div>

                <!-- Heading -->
                <h2 class="text-xl font-semibold text-gray-900 text-center">
                    {{ $t('checkout.authStep.heading') }}
                </h2>

                <!-- Chopstick divider -->
                <div class="flex justify-center items-center mt-2 mb-6" aria-hidden="true">
                    <svg class="w-14 h-4 text-red-400/40" viewBox="0 0 80 20" fill="none">
                        <line x1="5" y1="18" x2="38" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <line x1="42" y1="2" x2="75" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <circle cx="40" cy="2" r="1.5" fill="currentColor" opacity="0.6"/>
                    </svg>
                </div>

                <!-- Post-register success state -->
                <template v-if="registered">
                    <div class="text-center space-y-4">
                        <div class="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                            <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900">{{ $t('register.successTitle') }}</h3>
                        <p class="text-sm text-gray-500 leading-relaxed">{{ $t('register.successCheckEmail') }}</p>

                        <p v-if="resendSent" class="text-sm text-green-600 font-medium">{{ $t('verify.sent') }}</p>
                        <button
                            v-else
                            :disabled="resendCooldown > 0"
                            class="inline-block bg-white/80 border border-gray-200/80 text-gray-700 py-2 px-5 rounded-xl text-sm font-medium hover:bg-white transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="resendEmail"
                        >
                            {{ resendCooldown > 0 ? `${$t('verify.resend')} (${resendCooldown}s)` : $t('verify.resend') }}
                        </button>

                        <button
                            type="button"
                            class="block mx-auto text-sm text-red-500 font-medium hover:text-red-600 transition-colors duration-300 pt-2"
                            @click="switchToLoginTab"
                        >
                            {{ $t('checkout.authStep.returnToLogin') }}
                        </button>
                    </div>
                </template>

                <!-- Auth form (login/register tabs) -->
                <template v-else>
                    <!-- Social Login Buttons -->
                    <div class="space-y-3 mb-5">
                        <button
                            :disabled="loading"
                            class="w-full flex items-center justify-center bg-white/70 backdrop-blur-sm border border-gray-200/80 rounded-xl py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none"
                            @click="loginWithProvider('google')"
                        >
                            <img alt="Google" class="w-5 h-5 mr-2" src="/icons/google-icon.svg"/>
                            <span class="text-gray-700 text-sm font-medium">{{ $t('login.ssoGoogle') }}</span>
                        </button>

                        <button
                            :disabled="loading"
                            class="w-full flex items-center justify-center bg-white/70 backdrop-blur-sm border border-gray-200/80 rounded-xl py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none"
                            @click="loginWithProvider('apple')"
                        >
                            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#000"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                            <span class="text-gray-700 text-sm font-medium">{{ $t('login.ssoApple') }}</span>
                        </button>
                    </div>

                    <!-- Divider -->
                    <div class="relative my-5">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300/50"></div>
                        </div>
                        <div class="relative text-center">
                            <span class="bg-tsb-two px-3 text-xs text-gray-500 uppercase">
                                {{ $t('login.dividerOr') }}
                            </span>
                        </div>
                    </div>

                    <!-- Tab switcher -->
                    <div class="flex gap-1 mb-5 p-1 bg-white/50 rounded-xl" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            :aria-selected="tab === 'login'"
                            :class="[
                                'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300',
                                tab === 'login'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            ]"
                            @click="tab = 'login'"
                        >
                            {{ $t('checkout.authStep.tabLogin') }}
                        </button>
                        <button
                            type="button"
                            role="tab"
                            :aria-selected="tab === 'register'"
                            :class="[
                                'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300',
                                tab === 'register'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            ]"
                            @click="tab = 'register'"
                        >
                            {{ $t('checkout.authStep.tabRegister') }}
                        </button>
                    </div>

                    <!-- Login tab -->
                    <form v-if="tab === 'login'" class="space-y-4" @submit.prevent="login">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="auth-step-email">{{ $t('login.email') }}</label>
                            <input
                                id="auth-step-email"
                                v-model="email"
                                :placeholder="$t('login.emailPlaceholder')"
                                autocomplete="email"
                                class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                                name="email"
                                required
                                type="email"
                            />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="auth-step-password">{{ $t('login.password') }}</label>
                            <input
                                id="auth-step-password"
                                v-model="password"
                                :placeholder="$t('login.passwordPlaceholder')"
                                autocomplete="current-password"
                                class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                                name="password"
                                required
                                type="password"
                            />
                        </div>

                        <div v-if="errorMessage" role="alert" class="text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl px-3.5 py-2.5 animate-shake">
                            <p>{{ errorMessage }}</p>
                            <button
                                v-if="showResendVerification"
                                :disabled="resendCooldown > 0"
                                type="button"
                                class="mt-2 text-red-500 font-medium underline hover:text-red-600 transition-colors duration-300 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                                @click="resendVerificationFromLogin"
                            >
                                {{ resendSent ? $t('verify.sent') : resendCooldown > 0 ? `${$t('verify.resend')} (${resendCooldown}s)` : $t('verify.resend') }}
                            </button>
                        </div>

                        <button
                            :disabled="loading"
                            class="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md disabled:opacity-50"
                            type="submit"
                        >
                            {{ $t('login.submit') }}
                        </button>

                        <p class="text-center">
                            <NuxtLinkLocale to="/auth/forgot-password" class="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-300" @click="saveReturnTo">
                                {{ $t('login.forgot') }}
                            </NuxtLinkLocale>
                        </p>
                    </form>

                    <!-- Register tab -->
                    <div v-else>
                        <UserForm mode="register" @submit="registerUser" />
                        <p v-if="errorMessage" role="alert" class="text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl px-3.5 py-2.5 animate-shake mt-4">
                            {{ errorMessage }}
                        </p>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useLocalePath, useRoute, useRuntimeConfig } from '#imports'
import UserForm from '~/components/form/UserForm.vue'
import { useCartStore } from '~/stores/cart'
import { useI18n } from 'vue-i18n'
import { usePlatform } from '~/composables/usePlatform'
import { useTracking } from '~/composables/useTracking'

const { t } = useI18n()
const cartStore = useCartStore()
const localePath = useLocalePath()
const { isCapacitor } = usePlatform()
const { trackEvent } = useTracking()
const route = useRoute()
const config = useRuntimeConfig()

type Tab = 'login' | 'register'
const tab = ref<Tab>('login')

// Login state
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)
const showResendVerification = ref(false)
const resendCooldown = ref(0)
const resendSent = ref(false)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

// Register state
const registered = ref(false)
const registeredEmail = ref('')

const capacitorAuthRequestId = ref('')
const authRequestId = computed(() =>
    (route.query.authRequestID as string) || (route.query.authRequest as string) || ''
)

// Stash the return URL before any redirect so the post-auth callback lands back on /checkout.
const saveReturnTo = () => {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem('oidc_return_to', localePath('/checkout'))
}

const initCapacitorAuth = async () => {
    try {
        const { useOidc } = await import('~/composables/useOidc')
        const { getAuthRequestId } = useOidc()
        capacitorAuthRequestId.value = await getAuthRequestId()
    } catch (e: unknown) {
        if (import.meta.dev) console.error('Capacitor OIDC init error:', e)
    }
}

onMounted(async () => {
    if (!import.meta.client) return
    if (isCapacitor) {
        await initCapacitorAuth()
    }
})

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

const resendVerificationFromLogin = async () => {
    if (!email.value) return
    try {
        const { useZitadelApi } = await import('~/composables/useZitadelApi')
        const { resendVerification } = useZitadelApi()
        await resendVerification(email.value)
        resendSent.value = true
        startCooldown()
        setTimeout(() => { resendSent.value = false }, 5000)
    } catch {
        // Silent — backend rate limiter handles abuse
    }
}

const resendEmail = async () => {
    if (!registeredEmail.value) return
    try {
        const { useZitadelApi } = await import('~/composables/useZitadelApi')
        const { resendVerification } = useZitadelApi()
        await resendVerification(registeredEmail.value)
        resendSent.value = true
        setTimeout(() => { resendSent.value = false }, 5000)
        startCooldown()
    } catch {
        // Silent
    }
}

const switchToLoginTab = () => {
    email.value = registeredEmail.value
    registered.value = false
    tab.value = 'login'
}

const login = async () => {
    if (import.meta.server) return
    errorMessage.value = ''
    showResendVerification.value = false
    loading.value = true
    saveReturnTo()

    try {
        const effectiveAuthRequestId = authRequestId.value || capacitorAuthRequestId.value

        if (effectiveAuthRequestId) {
            const { useZitadelApi } = await import('~/composables/useZitadelApi')
            const { createSession, finalizeOidcAuth } = useZitadelApi()

            const session = await createSession(email.value, password.value)
            const result = await finalizeOidcAuth(effectiveAuthRequestId, session.sessionId, session.sessionToken)
            trackEvent('user_logged_in', { method: 'email' })

            if (isCapacitor) {
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
            await initCapacitorAuth()
            if (capacitorAuthRequestId.value) {
                loading.value = false
                return login()
            }
            throw new Error('Could not initialize OIDC flow')
        } else {
            const { useOidc } = await import('~/composables/useOidc')
            const { signIn } = useOidc()
            await signIn({ login_hint: email.value })
        }
    } catch (error: unknown) {
        loading.value = false
        if (import.meta.dev) console.error('Login error:', error)
        if (isCapacitor) {
            await initCapacitorAuth()
        }
        const err = error as { response?: { status?: number }, statusCode?: number, data?: { error?: string }, message?: string }
        const status = err?.response?.status || err?.statusCode
        const errorCode = err?.data?.error
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
            errorMessage.value = err?.message || 'Login failed'
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
    const effectiveAuthId = authRequestId.value || capacitorAuthRequestId.value
    sessionStorage.setItem('oidcAuthRequestId', effectiveAuthId)

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
    } catch (error: unknown) {
        loading.value = false
        if (import.meta.dev) console.error('IdP start error:', error)
        const err = error as { response?: { status?: number }, statusCode?: number }
        const status = err?.response?.status || err?.statusCode
        errorMessage.value = status === 429
            ? t('notify.errors.tooManyRequests')
            : t('notify.errors.oauthFailed')
    }
}

const loginWithProvider = async (provider: string) => {
    if (import.meta.server || loading.value) return
    loading.value = true
    trackEvent('oauth_click', { provider })
    saveReturnTo()

    if (authRequestId.value || capacitorAuthRequestId.value) {
        await startIdpFlow(provider)
    } else if (isCapacitor) {
        await initCapacitorAuth()
        if (capacitorAuthRequestId.value) {
            await startIdpFlow(provider)
        } else {
            loading.value = false
            errorMessage.value = t('notify.errors.oauthFailed')
        }
    } else {
        sessionStorage.setItem('pendingIdpProvider', provider)
        const { useOidc } = await import('~/composables/useOidc')
        const { signIn } = useOidc()
        const uiLocale = route.path.split('/')[1] || 'fr'
        await signIn({ ui_locales: uiLocale })
    }
}

interface RegisterFormData {
    firstName: string
    lastName: string
    email: string
    password: string
    phoneNumber?: string
}

const registerUser = async (formData: RegisterFormData) => {
    errorMessage.value = ''
    const { firstName, lastName, email: formEmail, password: formPassword, phoneNumber } = formData

    try {
        const { useZitadelApi } = await import('~/composables/useZitadelApi')
        const { createUser } = useZitadelApi()
        await createUser({
            firstName,
            lastName,
            email: formEmail,
            password: formPassword,
            phone: phoneNumber || undefined,
        })

        trackEvent('user_registered')
        registeredEmail.value = formEmail
        registered.value = true
        startCooldown()
    } catch (error: unknown) {
        const err = error as { response?: { status?: number }, statusCode?: number, data?: { message?: string } }
        const status = err?.response?.status || err?.statusCode
        if (import.meta.dev) console.error('Registration error:', error)

        if (status === 409) {
            trackEvent('registration_error', { error_type: 'email_already_exists' })
            errorMessage.value = t('register.errors.email_already_exists', t('register.errors.registration_failed'))
        } else if (status === 429) {
            trackEvent('registration_error', { error_type: 'rate_limited' })
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else {
            const errorCode = err?.data?.message || 'registration_failed'
            trackEvent('registration_error', { error_type: errorCode })
            errorMessage.value = t(`register.errors.${errorCode}`, t('register.errors.registration_failed'))
        }
    }
}
</script>
