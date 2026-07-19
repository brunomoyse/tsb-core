<template>
    <div>
        <!-- Step indicator -->
        <div class="mb-5 flex justify-center">
            <StepIndicator
                :current="stepIndex"
                :total="totalSteps"
                :labels="stepLabels"
                :aria-label="$t('login.stepsAriaLabel')"
            />
        </div>

        <!-- Step 1: SSO (primary) + email (secondary) -->
        <form v-if="step === 'email'" class="space-y-4" @submit.prevent="onSubmitEmail">
            <!-- SSO buttons: fastest path for the Google/Apple majority -->
            <div class="space-y-3">
                <button
                    :disabled="loading"
                    class="btn btn-secondary w-full"
                    type="button"
                    @click="loginWithProvider('google')"
                >
                    <img alt="" aria-hidden="true" class="w-5 h-5" src="/icons/google-icon.svg" >
                    <span>{{ $t('login.ssoGoogle') }}</span>
                </button>

                <button
                    :disabled="loading"
                    class="btn btn-secondary w-full"
                    type="button"
                    @click="loginWithProvider('apple')"
                >
                    <svg aria-hidden="true" class="w-5 h-5" fill="var(--ygf-orange-text)" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                    <span>{{ $t('login.ssoApple') }}</span>
                </button>
            </div>

            <!-- OR Divider -->
            <div class="relative my-6">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t" style="border-color: rgba(242, 123, 32, 0.12)" />
                </div>
                <div class="relative text-center">
                    <span class="bg-ygf-cream px-3 text-sm text-ygf-gray-400 uppercase">
                        {{ $t('login.dividerOr') }}
                    </span>
                </div>
            </div>

            <!-- Email field: secondary path -->
            <div>
                <label class="field-label" for="auth-email">
                    {{ $t('login.email') }}
                </label>
                <input
                    id="auth-email"
                    ref="emailInputRef"
                    v-model="email"
                    :placeholder="$t('login.emailPlaceholder')"
                    :aria-invalid="emailFormatError ? 'true' : undefined"
                    :aria-describedby="emailFormatError ? 'auth-email-error' : undefined"
                    autocomplete="email"
                    class="field"
                    name="email"
                    required
                    type="email"
                    @blur="validateEmailOnBlur"
                />
                <p
                    v-if="emailFormatError"
                    id="auth-email-error"
                    class="mt-1.5 text-xs text-ygf-error"
                    role="alert"
                >
                    {{ $t('notify.errors.invalidEmail') }}
                </p>
            </div>

            <div
                v-if="errorMessage"
                aria-atomic="true"
                aria-live="assertive"
                class="text-sm text-ygf-error bg-red-50 border border-red-200 rounded-ygf-card px-3.5 py-2.5 animate-shake"
                data-testid="login-error"
                role="alert"
            >
                <p>{{ errorMessage }}</p>
            </div>

            <button
                :disabled="loading || !!emailFormatError"
                class="btn btn-primary w-full"
                data-testid="login-submit"
                type="submit"
            >
                {{ $t('login.sendCode') }}
            </button>
        </form>

        <!-- Step 2: OTP code -->
        <form v-else-if="step === 'code'" class="space-y-4" @submit.prevent="onSubmitCode">
            <p class="text-sm text-ygf-gray-600">
                {{ $t('login.codeSent', { email }) }}
            </p>

            <div>
                <label class="field-label" for="auth-code">
                    {{ $t('login.codeLabel') }}
                </label>
                <input
                    id="auth-code"
                    ref="codeInputRef"
                    v-model="code"
                    :placeholder="$t('login.codePlaceholder')"
                    autocomplete="one-time-code"
                    class="field text-center text-lg font-mono tracking-[0.5em]"
                    inputmode="numeric"
                    maxlength="6"
                    name="code"
                    pattern="[0-9]{6}"
                    required
                    type="text"
                >
            </div>

            <div
                v-if="errorMessage"
                aria-atomic="true"
                aria-live="assertive"
                class="text-sm text-ygf-error bg-red-50 border border-red-200 rounded-ygf-card px-3.5 py-2.5 animate-shake"
                data-testid="login-error"
                role="alert"
            >
                {{ errorMessage }}
            </div>

            <button
                :disabled="loading || code.length < 6"
                class="btn btn-primary w-full"
                data-testid="login-verify"
                type="submit"
            >
                {{ $t('login.verify') }}
            </button>

            <div class="flex items-center justify-between text-sm">
                <button
                    class="btn-link"
                    type="button"
                    @click="backToEmail"
                >
                    {{ $t('login.backToEmail') }}
                </button>
                <button
                    :disabled="resendCooldown > 0 || loading"
                    class="btn-link"
                    type="button"
                    @click="resendCode"
                >
                    {{ resendCooldown > 0 ? $t('login.resendCooldown', { seconds: resendCooldown }) : $t('login.resendCode') }}
                </button>
            </div>
        </form>

        <!-- Step 3: Profile (new users only) — shared with the IdP callback -->
        <ProfileNameForm
            v-else-if="step === 'profile'"
            :loading="loading"
            :error-message="errorMessage"
            @submit="onSubmitProfile"
        />
    </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRuntimeConfig } from '#imports'
import ProfileNameForm from '~/components/auth/ProfileNameForm.vue'
import StepIndicator from '~/components/global/StepIndicator.vue'
import { isValidEmail } from '#engine/lib/validators'
import { useI18n } from 'vue-i18n'
import { useTracking } from '#engine/composables/useTracking'

interface Props {
    /** 'page' = standalone /auth/login, 'inline' = embedded in checkout. */
    mode?: 'page' | 'inline'
    /** AuthRequestID from URL query (web). Inline mode mints one on demand. */
    authRequestId?: string
    /** Where to navigate / what to do after a successful OIDC finalize. */
    onComplete?: (callbackUrl: string) => Promise<void> | void
    /** Called before any redirect so the OIDC callback can return to the right place. */
    onBeforeRedirect?: () => void
}

const {
    authRequestId = '',
    onComplete,
    onBeforeRedirect,
} = defineProps<Props>()

const { t } = useI18n()
const { trackEvent } = useTracking()
const route = useRoute()
const config = useRuntimeConfig()

type Step = 'email' | 'code' | 'profile'
const step = ref<Step>('email')

const email = ref('')
const code = ref('')

const emailInputRef = ref<HTMLInputElement | null>(null)
const codeInputRef = ref<HTMLInputElement | null>(null)

const otpSessionId = ref('')
const otpSessionToken = ref('')

const loading = ref(false)
const errorMessage = ref('')
const emailFormatError = ref(false)
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

// True after a successful OTP verify on a new placeholder account — drives the
// "3 steps" variant of the indicator and gates the profile step.
const requiresProfile = ref(false)

const totalSteps = computed(() => (requiresProfile.value ? 3 : 2))
const stepIndex = computed(() => {
    if (step.value === 'email') return 0
    if (step.value === 'code') return 1
    return 2
})
const stepLabels = computed(() => {
    const labels = [t('login.stepEmail'), t('login.stepCode')]
    if (requiresProfile.value) labels.push(t('login.stepProfile'))
    return labels
})

onMounted(async () => {
    if (!import.meta.client) return

    /*
     * Pending IdP provider survives the round-trip to Zitadel for authRequestID.
     * If the user picked Google/Apple from a fresh visit, we redirected to Zitadel
     * first; on return we resume the IdP flow with the now-known authRequestID.
     */
    if (authRequestId) {
        const pendingProvider = sessionStorage.getItem('pendingIdpProvider')
        if (pendingProvider) {
            sessionStorage.removeItem('pendingIdpProvider')
            await startIdpFlow(pendingProvider)
        }
    }
})

onBeforeUnmount(() => {
    if (cooldownTimer) clearInterval(cooldownTimer)
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

const validateEmailOnBlur = () => {
    if (email.value.trim() === '') {
        emailFormatError.value = false
        return
    }
    emailFormatError.value = !isValidEmail(email.value)
}

/*
 * Map a fetch error to a specific i18n key. Network failures (no `response`
 * field), 5xx, 429, and unknown errors each get their own message so the user
 * knows what to try next.
 */
const formatError = (error: unknown, fallback: string): string => {
    const err = error as { response?: { status?: number }, statusCode?: number, message?: string }
    const status = err?.response?.status ?? err?.statusCode

    if (status === 429) return t('notify.errors.tooManyRequests')
    if (status === undefined) return t('notify.errors.networkError')
    if (status >= 500) return t('notify.errors.serverError')
    return t(fallback)
}

/*
 * Synchronous in-flight flags. The reactive `loading` ref drives the UI,
 * but Vue's reactivity is async — a tight double-fire (form submit + click,
 * hydration remount, retry path) can sneak past the loading guard. These
 * plain JS booleans flip atomically inside the handler, blocking the
 * duplicate before it ever reaches the network.
 */
let requestInFlight = false
let verifyInFlight = false

const onSubmitEmail = async () => {
    if (import.meta.server) return
    if (requestInFlight || loading.value) return

    if (!isValidEmail(email.value)) {
        emailFormatError.value = true
        return
    }

    requestInFlight = true
    errorMessage.value = ''
    emailFormatError.value = false
    loading.value = true
    onBeforeRedirect?.()

    try {
        const { useZitadelApi } = await import('#engine/composables/useZitadelApi')
        const { requestOtpLogin } = useZitadelApi()
        const session = await requestOtpLogin(email.value)

        if (!session.sessionId || !session.sessionToken) {
            /*
             * Backend short-circuited (auth service unavailable, etc.). Surface
             * a generic error so the user can retry.
             */
            errorMessage.value = t('notify.errors.serverError')
            return
        }

        otpSessionId.value = session.sessionId
        otpSessionToken.value = session.sessionToken
        step.value = 'code'
        startCooldown()
        trackEvent('otp_requested')

        await nextTick()
        codeInputRef.value?.focus()
    } catch (error: unknown) {
        trackEvent('login_error', { error_type: 'request_failed' })
        errorMessage.value = formatError(error, 'notify.errors.requestFailed')
    } finally {
        requestInFlight = false
        loading.value = false
    }
}

const backToEmail = async () => {
    step.value = 'email'
    code.value = ''
    errorMessage.value = ''
    otpSessionId.value = ''
    otpSessionToken.value = ''
    requiresProfile.value = false
    await nextTick()
    emailInputRef.value?.focus()
}

const resendCode = async () => {
    if (!otpSessionId.value || !otpSessionToken.value) return
    errorMessage.value = ''
    loading.value = true
    try {
        const { useZitadelApi } = await import('#engine/composables/useZitadelApi')
        const { resendOtpLogin } = useZitadelApi()
        await resendOtpLogin(otpSessionId.value, otpSessionToken.value)
        startCooldown()
        trackEvent('otp_resent')
    } catch (error: unknown) {
        errorMessage.value = formatError(error, 'notify.errors.requestFailed')
    } finally {
        loading.value = false
    }
}

const onSubmitCode = async () => {
    if (import.meta.server) return
    if (verifyInFlight || loading.value) return
    verifyInFlight = true
    errorMessage.value = ''
    loading.value = true

    try {
        const { useZitadelApi } = await import('#engine/composables/useZitadelApi')
        const { verifyOtpLogin } = useZitadelApi()

        const verified = await verifyOtpLogin(otpSessionId.value, otpSessionToken.value, code.value)
        otpSessionToken.value = verified.sessionToken
        requiresProfile.value = verified.requiresProfile

        if (verified.requiresProfile) {
            /*
             * Identifier-first signup: collect name before OIDC finalize so the
             * app user is JIT-provisioned with real values, not the placeholder.
             * ProfileNameForm self-focuses its first input on mount.
             */
            step.value = 'profile'
            loading.value = false
            return
        }

        await finalizeAndComplete()
    } catch (error: unknown) {
        loading.value = false
        if (import.meta.dev) console.error('OTP verify error:', error)
        const err = error as { response?: { status?: number }, statusCode?: number }
        const status = err?.response?.status ?? err?.statusCode
        if (status === 429) {
            trackEvent('login_error', { error_type: 'rate_limited' })
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else if (status === undefined) {
            errorMessage.value = t('notify.errors.networkError')
        } else if (status >= 500) {
            errorMessage.value = t('notify.errors.serverError')
        } else {
            trackEvent('login_error', { error_type: 'invalid_code' })
            errorMessage.value = t('notify.errors.invalidCode')
        }
    } finally {
        /*
         * Always release the in-flight flag so retries can re-fire. The
         * success path navigates away; clearing the flag there is a no-op.
         */
        verifyInFlight = false
    }
}

const onSubmitProfile = async (payload: { firstName: string; lastName: string }) => {
    if (import.meta.server) return
    errorMessage.value = ''
    loading.value = true

    try {
        const { useZitadelApi } = await import('#engine/composables/useZitadelApi')
        const { completeOtpProfile } = useZitadelApi()
        await completeOtpProfile({
            sessionId: otpSessionId.value,
            sessionToken: otpSessionToken.value,
            firstName: payload.firstName,
            lastName: payload.lastName,
        })
        trackEvent('user_registered', { method: 'otp' })

        await finalizeAndComplete()
    } catch (error: unknown) {
        loading.value = false
        if (import.meta.dev) console.error('Profile completion error:', error)
        errorMessage.value = formatError(error, 'notify.errors.requestFailed')
    }
}

/*
 * Resolve the authRequestID, run the OIDC finalize call, and hand the resulting
 * callbackUrl back to the parent (page mode redirects, checkout stays inline).
 */
const finalizeAndComplete = async () => {
    const { useZitadelApi } = await import('#engine/composables/useZitadelApi')
    const { finalizeOidcAuth } = useZitadelApi()

    let effectiveAuthRequestId = authRequestId

    if (!effectiveAuthRequestId) {
        /*
         * Inline mode (e.g. /checkout) has no authRequestId on the URL —
         * mint one via the backend proxy. Do NOT fall back to
         * signinRedirect({ login_hint }) here: that triggered a full-page
         * redirect to Zitadel, which redirected to /auth/login and destroyed
         * the in-memory OTP session, orphaning the auth_request and forcing
         * the user to redo OTP.
         */
        try {
            const { useOidc } = await import('#engine/composables/useOidc')
            const { getAuthRequestId } = useOidc()
            effectiveAuthRequestId = await getAuthRequestId()
        } catch {
            errorMessage.value = t('notify.errors.sessionExpired')
            loading.value = false
            return
        }
        if (!effectiveAuthRequestId) {
            errorMessage.value = t('notify.errors.sessionExpired')
            loading.value = false
            return
        }
    }

    const result = await finalizeOidcAuth(effectiveAuthRequestId, otpSessionId.value, otpSessionToken.value)
    trackEvent('user_logged_in', { method: 'otp' })

    if (onComplete) {
        await onComplete(result.callbackUrl)
        return
    }

    // Full redirect to the OIDC callback (oidc-client-ts exchanges the code).
    window.location.href = result.callbackUrl
}

const startIdpFlow = async (provider: string) => {
    errorMessage.value = ''
    loading.value = true
    onBeforeRedirect?.()

    const { useZitadelApi } = await import('#engine/composables/useZitadelApi')
    const { startIdpLogin } = useZitadelApi()

    const uiLocale = route.path.split('/')[1] || 'fr'
    sessionStorage.setItem('oidcAuthRequestId', authRequestId)

    const baseUrl = config.public.baseUrl as string
    const successUrl = `${baseUrl}/${uiLocale}/auth/idp/callback`
    const failureUrl = `${baseUrl}/${uiLocale}/auth/idp/callback?error=true`

    try {
        const { authUrl } = await startIdpLogin(provider, successUrl, failureUrl)
        window.location.href = authUrl
    } catch (error: unknown) {
        loading.value = false
        if (import.meta.dev) console.error('IdP start error:', error)
        const err = error as { response?: { status?: number }, statusCode?: number }
        const status = err?.response?.status ?? err?.statusCode
        errorMessage.value = status === 429
            ? t('notify.errors.tooManyRequests')
            : t('notify.errors.oauthFailed')
    }
}

const loginWithProvider = async (provider: string) => {
    if (import.meta.server || loading.value) return
    loading.value = true
    trackEvent('oauth_click', { provider })
    onBeforeRedirect?.()

    if (authRequestId) {
        await startIdpFlow(provider)
    } else {
        // Web: stash the choice, redirect to Zitadel for authRequestID, resume on return.
        sessionStorage.setItem('pendingIdpProvider', provider)
        const { useOidc } = await import('#engine/composables/useOidc')
        const { signIn } = useOidc()
        const uiLocale = route.path.split('/')[1] || 'fr'
        await signIn({ ui_locales: uiLocale })
    }
}
</script>
