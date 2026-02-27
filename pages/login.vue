<template>
    <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
        <div class="w-full max-w-md">

            <!-- Card container -->
            <div class="bg-tsb-two rounded-2xl relative">
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
                        <p v-if="errorMessage" role="alert" class="text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl px-3.5 py-2.5 animate-shake">
                            {{ errorMessage }}
                        </p>

                        <!-- Submit Button -->
                        <button
                            data-testid="login-submit"
                            class="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md"
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

                    <!-- Google SSO Button -->
                    <button
                        class="w-full flex items-center justify-center bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none"
                        @click="loginWithGoogle"
                    >
                        <img alt="Google" class="w-5 h-5 mr-2" src="/icons/google-icon.svg"/>
                        <span class="text-gray-700 text-sm font-medium">{{ $t('login.ssoGoogle') }}</span>
                    </button>

                    <!-- Links -->
                    <div class="mt-6 space-y-2 text-center">
                        <p class="text-sm text-gray-600">
                            {{ $t('login.noAccount') }}
                            <NuxtLinkLocale to="/register" class="text-red-500 font-medium hover:text-red-600 transition-colors duration-300">
                                {{ $t('login.register') }}
                            </NuxtLinkLocale>
                        </p>
                        <p>
                            <NuxtLinkLocale to="/forgot-password" class="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-300">
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
import type { LoginResponse, User } from '@/types'
import { definePageMeta, navigateTo, onMounted, ref, useLocalePath, useNuxtApp, useRuntimeConfig } from '#imports'
import { eventBus } from '~/eventBus'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useI18n } from 'vue-i18n'
import { useTracking } from '~/composables/useTracking'

definePageMeta({
    public: true
})

const cartStore = useCartStore();
const { t } = useI18n()
const { trackEvent, identifyUser } = useTracking()
const localePath = useLocalePath()
const authStore = useAuthStore()
const {$api, $gqlFetch} = useNuxtApp()
const config = useRuntimeConfig()
const apiUrl: string = config.public.api as string

useSchemaOrg([
    defineWebPage({
        '@type': 'WebPage',
        name: t('schema.login.title'),
        description: t('schema.login.description')
    })
])

useSeoMeta({
    title: t('schema.login.title'),
    description: t('schema.login.description'),
    robots: 'noindex,nofollow',
})

const email = ref('')
const password = ref('')
const errorMessage = ref('')

const ME = gql`
    query {
        me {
            id
            email
            emailVerifiedAt
            firstName
            lastName
            phoneNumber
            deletionRequestedAt
            address {
                id
                streetName
                houseNumber
                municipalityName
                postcode
                distance
            }
        }
    }
`

// Regular email/password login
const login = async () => {
    errorMessage.value = ''
    try {
        await $api<LoginResponse>('/login', {
            method: 'POST',
            body: {
                email: email.value,
                password: password.value
            },
        });
    } catch (error: any) {
        console.error('Login error:', error)
        if (error?.response?.status === 429) {
            trackEvent('login_error', { error_type: 'rate_limited' })
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else if (error?.response?.status === 403) {
            trackEvent('login_error', { error_type: 'email_not_verified' })
            errorMessage.value = t('notify.errors.emailNotVerified')
        } else {
            trackEvent('login_error', { error_type: 'invalid_credentials' })
            errorMessage.value = t('notify.errors.invalidCredentials')
        }
        return
    }
    trackEvent('user_logged_in', { method: 'email' })
    await loginSuccess()
}

const loginWithGoogle = () => {
    trackEvent('oauth_click', { provider: 'google' })
    window.location.href = `${apiUrl}/oauth/google`;
};

const loginSuccess = async () => {
    if (import.meta.client) {
        const data = await $gqlFetch<{ me: User }>(print(ME))
        if (data) {
            authStore.setUser(data.me)
            identifyUser(data.me)
        }

        // If the cart is not empty, navigate to checkout
        if (cartStore.products.length > 0) {
            navigateTo(localePath('checkout'))
        } else {
            // If the cart is empty, navigate to menu
            navigateTo(localePath('menu'))
        }
    }
}

onMounted(async () => {
    // Check if the user is already logged in on page load
    if (authStore.accessValid) {
        navigateTo(localePath('menu'))
    }

    const params = new URLSearchParams(window.location.search)

    const success = params.get('success')
    const emailVerified = params.get('email_verified')
    const fromCheckout = params.get('from_checkout')

    // If success, then fetch /me to fill the auth store with user credentials
    if (success) {
        try {
            trackEvent('user_logged_in', { method: 'google_oauth' })
            await loginSuccess()
        } catch (error) {
            console.error('Login error:', error)
        }
    }

    if (emailVerified) {
        // Show a notification if the email is verified
        eventBus.emit('notify', {
            message: t('notify.emailVerified'),
            persistent: false,
            duration: 5000,
            variant: 'success',
        })
    }

    if (fromCheckout) {
        // Show a notification if the user was redirected from checkout
        eventBus.emit('notify', {
            message: t('notify.loginToValidateCart'),
            persistent: false,
            duration: 10000,
            variant: 'info',
        })
    }
})

</script>
