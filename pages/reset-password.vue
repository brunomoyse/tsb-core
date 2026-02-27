<template>
    <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
        <div class="w-full max-w-md">

            <!-- Card container -->
            <div class="bg-tsb-two rounded-2xl relative">
                <!-- Decorative blurred accents -->
                <div class="absolute -top-16 -right-16 w-56 h-56 bg-tsb-four/40 rounded-full blur-3xl pointer-events-none" />
                <div class="absolute -bottom-16 -left-16 w-44 h-44 bg-tsb-four/30 rounded-full blur-3xl pointer-events-none" />

                <!-- Kanji watermark: 鍵 (key) -->
                <span
                    class="absolute top-4 right-5 font-channel text-[80px] sm:text-[100px] text-red-200/[0.07] leading-none select-none pointer-events-none"
                    aria-hidden="true"
                >鍵</span>

                <div class="relative px-7 sm:px-10 py-8 sm:py-10">
                    <!-- Title -->
                    <h1 class="text-2xl font-semibold text-gray-900 text-center">
                        {{ $t('resetPassword.title') }}
                    </h1>

                    <!-- Chopstick divider -->
                    <div class="flex justify-center items-center mt-2 mb-6" aria-hidden="true">
                        <svg class="w-14 h-4 text-red-400/40" viewBox="0 0 80 20" fill="none">
                            <line x1="5" y1="18" x2="38" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <line x1="42" y1="2" x2="75" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <circle cx="40" cy="2" r="1.5" fill="currentColor" opacity="0.6"/>
                        </svg>
                    </div>

                    <!-- Missing Token State -->
                    <template v-if="!token">
                        <div class="text-center space-y-4">
                            <p class="text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl px-3.5 py-2.5">
                                {{ $t('resetPassword.invalidToken') }}
                            </p>
                            <NuxtLinkLocale to="/forgot-password" class="inline-block text-red-500 font-medium hover:text-red-600 transition-colors duration-300">
                                {{ $t('resetPassword.requestNewLink') }}
                            </NuxtLinkLocale>
                        </div>
                    </template>

                    <!-- Form State -->
                    <template v-else-if="!submitted">
                        <form class="space-y-4" @submit.prevent="submit">
                            <!-- New Password -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1.5" for="password">{{ $t('resetPassword.newPassword') }}</label>
                                <input
                                    id="password"
                                    v-model="password"
                                    :placeholder="$t('resetPassword.newPasswordPlaceholder')"
                                    autocomplete="new-password"
                                    class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                                    name="password"
                                    required
                                    type="password"
                                />
                            </div>

                            <!-- Password Strength Indicator -->
                            <div v-if="password" class="space-y-2">
                                <div class="flex items-center gap-2">
                                    <div class="flex-1 h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
                                        <div
                                            class="h-full rounded-full transition-all duration-300"
                                            :class="passwordStrength.bgColor"
                                            :style="{ width: passwordStrength.width }"
                                        ></div>
                                    </div>
                                    <span class="text-xs font-medium" :class="passwordStrength.color">{{ passwordStrength.text }}</span>
                                </div>
                                <ul class="text-xs space-y-1">
                                    <li :class="passwordRequirements.minLength ? 'text-green-600' : 'text-gray-400'">
                                        {{ passwordRequirements.minLength ? '&#10003;' : '&#10007;' }} {{ $t('register.passwordMinLength') }}
                                    </li>
                                    <li :class="passwordRequirements.hasUpperCase ? 'text-green-600' : 'text-gray-400'">
                                        {{ passwordRequirements.hasUpperCase ? '&#10003;' : '&#10007;' }} {{ $t('register.passwordUpperCase') }}
                                    </li>
                                    <li :class="passwordRequirements.hasLowerCase ? 'text-green-600' : 'text-gray-400'">
                                        {{ passwordRequirements.hasLowerCase ? '&#10003;' : '&#10007;' }} {{ $t('register.passwordLowerCase') }}
                                    </li>
                                    <li :class="passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-400'">
                                        {{ passwordRequirements.hasNumber ? '&#10003;' : '&#10007;' }} {{ $t('register.passwordNumber') }}
                                    </li>
                                    <li :class="passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-400'">
                                        {{ passwordRequirements.hasSpecialChar ? '&#10003;' : '&#10007;' }} {{ $t('register.passwordSpecialChar') }}
                                    </li>
                                </ul>
                            </div>

                            <!-- Confirm Password -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1.5" for="confirmPassword">{{ $t('register.confirmPassword') }}</label>
                                <input
                                    id="confirmPassword"
                                    v-model="confirmPassword"
                                    :placeholder="$t('register.confirmPasswordPlaceholder')"
                                    autocomplete="new-password"
                                    class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                                    name="confirmPassword"
                                    required
                                    type="password"
                                />
                            </div>

                            <!-- Inline Error -->
                            <p v-if="errorMessage" role="alert" class="text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl px-3.5 py-2.5 animate-shake">
                                {{ errorMessage }}
                            </p>

                            <!-- Submit Button -->
                            <button
                                class="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md"
                                type="submit"
                            >
                                {{ $t('resetPassword.submit') }}
                            </button>
                        </form>
                    </template>

                    <!-- Success State -->
                    <template v-else>
                        <div class="text-center space-y-4">
                            <!-- Success checkmark -->
                            <div class="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                                <svg class="w-6 h-6 text-green-500 animate-check-bounce" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                                </svg>
                            </div>
                            <h3 class="text-lg font-medium text-gray-900">{{ $t('resetPassword.successTitle') }}</h3>
                            <p class="text-sm text-gray-500 leading-relaxed">{{ $t('resetPassword.successMessage') }}</p>
                        </div>
                    </template>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, definePageMeta, navigateTo, ref, useLocalePath, useNuxtApp, useRoute } from '#imports'
import { useI18n } from 'vue-i18n'

definePageMeta({
    public: true
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const route = useRoute()
const localePath = useLocalePath()

useSchemaOrg([
    defineWebPage({
        '@type': 'WebPage',
        name: t('schema.resetPassword.title'),
        description: t('schema.resetPassword.description')
    })
])

useSeoMeta({
    title: t('schema.resetPassword.title'),
    description: t('schema.resetPassword.description'),
    robots: 'noindex,nofollow',
})

const token = computed(() => route.query.token as string || '')
const password = ref('')
const confirmPassword = ref('')
const submitted = ref(false)
const errorMessage = ref('')

const passwordRequirements = computed(() => ({
    minLength: password.value.length >= 8,
    hasUpperCase: /[A-Z]/.test(password.value),
    hasLowerCase: /[a-z]/.test(password.value),
    hasNumber: /[0-9]/.test(password.value),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password.value),
}))

const passwordStrength = computed(() => {
    const reqs = passwordRequirements.value
    const score = [
        reqs.minLength,
        reqs.hasUpperCase,
        reqs.hasLowerCase,
        reqs.hasNumber,
        reqs.hasSpecialChar,
    ].filter(Boolean).length

    if (score === 0) {
        return { text: t('register.passwordVeryWeak'), color: 'text-red-600', bgColor: 'bg-red-500', width: '20%' }
    }
    if (score <= 2) {
        return { text: t('register.passwordWeak'), color: 'text-red-600', bgColor: 'bg-red-500', width: '40%' }
    }
    if (score === 3) {
        return { text: t('register.passwordFair'), color: 'text-orange-600', bgColor: 'bg-orange-500', width: '60%' }
    }
    if (score === 4) {
        return { text: t('register.passwordGood'), color: 'text-yellow-600', bgColor: 'bg-yellow-500', width: '80%' }
    }
    return { text: t('register.passwordStrong'), color: 'text-green-600', bgColor: 'bg-green-500', width: '100%' }
})

const submit = async () => {
    errorMessage.value = ''

    if (password.value !== confirmPassword.value) {
        errorMessage.value = t('resetPassword.passwordsMismatch')
        return
    }

    const reqs = passwordRequirements.value
    if (!reqs.minLength || !reqs.hasUpperCase || !reqs.hasLowerCase || !reqs.hasNumber || !reqs.hasSpecialChar) {
        return
    }

    try {
        await $api('/reset-password', {
            method: 'POST',
            body: {
                token: token.value,
                password: password.value,
            },
        })
        submitted.value = true

        if (import.meta.client) {
            setTimeout(() => {
                navigateTo(localePath('login'))
            }, 3000)
        }
    } catch (error: any) {
        if (error?.response?.status === 429) {
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else {
            errorMessage.value = t('resetPassword.invalidToken')
        }
    }
}
</script>
