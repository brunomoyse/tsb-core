<template>
    <div class="flex justify-center pt-8">
        <div class="w-[500px]">
            <!-- Title -->
            <h2 class="text-2xl font-semibold text-gray-900 text-center mb-4">{{ $t('resetPassword.title') }}</h2>

            <!-- Missing Token State -->
            <template v-if="!token">
                <div class="text-center space-y-4">
                    <p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {{ $t('resetPassword.invalidToken') }}
                    </p>
                    <NuxtLinkLocale to="/forgot-password" class="inline-block text-black font-medium hover:underline">
                        {{ $t('resetPassword.requestNewLink') }}
                    </NuxtLinkLocale>
                </div>
            </template>

            <!-- Form State -->
            <template v-else-if="!submitted">
                <form class="space-y-4" @submit.prevent="submit">
                    <!-- New Password -->
                    <div>
                        <label class="block text-sm text-gray-700 mb-1" for="password">{{ $t('resetPassword.newPassword') }}</label>
                        <input
                            id="password"
                            v-model="password"
                            :placeholder="$t('resetPassword.newPasswordPlaceholder')"
                            autocomplete="new-password"
                            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                            name="password"
                            required
                            type="password"
                        />
                    </div>

                    <!-- Password Strength Indicator -->
                    <div v-if="password" class="space-y-2">
                        <div class="flex items-center gap-2">
                            <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
                        <label class="block text-sm text-gray-700 mb-1" for="confirmPassword">{{ $t('register.confirmPassword') }}</label>
                        <input
                            id="confirmPassword"
                            v-model="confirmPassword"
                            :placeholder="$t('register.confirmPasswordPlaceholder')"
                            autocomplete="new-password"
                            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                            name="confirmPassword"
                            required
                            type="password"
                        />
                    </div>

                    <!-- Inline Error -->
                    <p v-if="errorMessage" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {{ errorMessage }}
                    </p>

                    <!-- Submit Button -->
                    <button class="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-all duration-300 active:scale-[0.97]" type="submit">
                        {{ $t('resetPassword.submit') }}
                    </button>
                </form>
            </template>

            <!-- Success State -->
            <template v-else>
                <div class="text-center space-y-4">
                    <h3 class="text-lg font-medium text-gray-900">{{ $t('resetPassword.successTitle') }}</h3>
                    <p class="text-sm text-gray-500">{{ $t('resetPassword.successMessage') }}</p>
                </div>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, definePageMeta, useNuxtApp, useRoute, navigateTo, useLocalePath } from '#imports';
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
    } else if (score <= 2) {
        return { text: t('register.passwordWeak'), color: 'text-red-600', bgColor: 'bg-red-500', width: '40%' }
    } else if (score === 3) {
        return { text: t('register.passwordFair'), color: 'text-orange-600', bgColor: 'bg-orange-500', width: '60%' }
    } else if (score === 4) {
        return { text: t('register.passwordGood'), color: 'text-yellow-600', bgColor: 'bg-yellow-500', width: '80%' }
    } else {
        return { text: t('register.passwordStrong'), color: 'text-green-600', bgColor: 'bg-green-500', width: '100%' }
    }
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
