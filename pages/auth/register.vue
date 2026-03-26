<template>
    <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
        <div class="w-full max-w-md">

            <!-- Card container -->
            <div class="bg-tsb-two rounded-2xl relative overflow-hidden">
                <!-- Decorative blurred accents -->
                <div class="absolute -top-16 -right-16 w-56 h-56 bg-tsb-four/40 rounded-full blur-3xl pointer-events-none" />
                <div class="absolute -bottom-16 -left-16 w-44 h-44 bg-tsb-four/30 rounded-full blur-3xl pointer-events-none" />

                <!-- Kanji watermark: 登録 (register) -->
                <span
                    class="absolute top-4 right-5 font-channel text-[80px] sm:text-[100px] text-red-200/[0.07] leading-none select-none pointer-events-none"
                    aria-hidden="true"
                >登録</span>

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
                        {{ $t('register.title') }}
                    </h1>

                    <!-- Chopstick divider -->
                    <div class="flex justify-center items-center mt-2 mb-6" aria-hidden="true">
                        <svg class="w-14 h-4 text-red-400/40" viewBox="0 0 80 20" fill="none">
                            <line x1="5" y1="18" x2="38" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <line x1="42" y1="2" x2="75" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <circle cx="40" cy="2" r="1.5" fill="currentColor" opacity="0.6"/>
                        </svg>
                    </div>

                    <!-- Success State -->
                    <template v-if="registered">
                        <div class="text-center space-y-4">
                            <!-- Success checkmark -->
                            <div class="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                                <svg class="w-6 h-6 text-green-500 animate-check-bounce" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                                </svg>
                            </div>
                            <h3 class="text-lg font-medium text-gray-900">{{ $t('register.successTitle') }}</h3>
                            <p class="text-sm text-gray-500 leading-relaxed">{{ $t('register.successCheckEmail') }}</p>

                            <!-- Resend verification email -->
                            <p v-if="resendSent" class="text-sm text-green-600 font-medium">{{ $t('verify.sent') }}</p>
                            <button
                                v-else
                                :disabled="resendCooldown > 0"
                                class="inline-block bg-red-500 text-white py-2.5 px-6 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                @click="resendEmail"
                            >
                                {{ resendCooldown > 0 ? `${$t('verify.resend')} (${resendCooldown}s)` : $t('verify.resend') }}
                            </button>

                            <!-- Login link -->
                            <p class="text-sm text-gray-500">
                                <NuxtLinkLocale to="/auth/login" class="text-red-500 font-medium hover:text-red-600 transition-colors duration-300">
                                    {{ $t('login.title') }}
                                </NuxtLinkLocale>
                            </p>
                        </div>
                    </template>

                    <!-- Registration Form -->
                    <template v-else>
                        <UserForm mode="register" @submit="registerUser" />

                        <!-- Inline Error -->
                        <p v-if="errorMessage" role="alert" class="text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl px-3.5 py-2.5 animate-shake mt-4">
                            {{ errorMessage }}
                        </p>

                        <!-- Login link -->
                        <p class="text-sm text-gray-600 text-center mt-6">
                            {{ $t('register.hasAccount') }}
                            <NuxtLinkLocale to="/auth/login" class="text-red-500 font-medium hover:text-red-600 transition-colors duration-300">
                                {{ $t('login.title') }}
                            </NuxtLinkLocale>
                        </p>
                    </template>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { definePageMeta, ref } from '#imports'
import UserForm from '~/components/form/UserForm.vue'
import { useI18n } from 'vue-i18n'
import { useTracking } from '~/composables/useTracking'
import { useZitadelApi } from '~/composables/useZitadelApi'

definePageMeta({
    public: true
})

const { t } = useI18n()
const { createUser, resendVerification } = useZitadelApi()
const { trackEvent } = useTracking()

useSeoMeta({
    title: t('schema.register.title'),
    description: t('schema.register.description'),
    robots: 'noindex,nofollow',
})

const registered = ref(false)
const errorMessage = ref('')
const registeredEmail = ref('')
const resendCooldown = ref(20)
const resendSent = ref(false)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const startCooldown = () => {
    resendCooldown.value = 20
    cooldownTimer = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0 && cooldownTimer) {
            clearInterval(cooldownTimer)
            cooldownTimer = null
        }
    }, 1000)
}

const resendEmail = async () => {
    if (!registeredEmail.value) return
    try {
        await resendVerification(registeredEmail.value)
        resendSent.value = true
        setTimeout(() => { resendSent.value = false }, 5000)
        startCooldown()
    } catch {
        // Silent — rate limiter will handle abuse
    }
}

// Handle the submitted data from UserForm
const registerUser = async (formData: any) => {
    errorMessage.value = ''
    const { firstName, lastName, email, password, phoneNumber } = formData

    try {
        await createUser({
            firstName,
            lastName,
            email,
            password,
            phone: phoneNumber || undefined,
        })

        trackEvent('user_registered')
        registeredEmail.value = email
        registered.value = true
        startCooldown()
    } catch (error: any) {
        const status = error?.response?.status || error?.statusCode
        if (import.meta.dev) console.error('Registration error:', error)

        if (status === 409) {
            trackEvent('registration_error', { error_type: 'email_already_exists' })
            errorMessage.value = t('register.errors.email_already_exists', t('register.errors.registration_failed'))
        } else if (status === 429) {
            trackEvent('registration_error', { error_type: 'rate_limited' })
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else {
            const errorCode = error?.data?.message || 'registration_failed'
            trackEvent('registration_error', { error_type: errorCode })
            errorMessage.value = t(`register.errors.${errorCode}`, t('register.errors.registration_failed'))
        }
    }
}
</script>
