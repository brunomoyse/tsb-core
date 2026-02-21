<template>
    <div class="flex justify-center pt-8">
        <div class="w-[500px]">
            <!-- Title -->
            <h2 class="text-2xl font-semibold text-gray-900 text-center mb-4">{{ $t('login.title') }}</h2>

            <!-- Login Form -->
            <form class="space-y-4" @submit.prevent="login">
                <!-- Email -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="email">{{ $t('login.email') }}</label>
                    <input
                        id="email"
                        v-model="email"
                        :placeholder="$t('login.emailPlaceholder')"
                        autocomplete="email"
                        class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                        name="email"
                        required
                        type="email"
                    />
                </div>

                <!-- Password -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="password">{{ $t('login.password') }}</label>
                    <input
                        id="password"
                        v-model="password"
                        :placeholder="$t('login.passwordPlaceholder')"
                        autocomplete="current-password"
                        class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                        name="password"
                        required
                        type="password"
                    />
                </div>

                <!-- Inline Error -->
                <p v-if="errorMessage" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {{ errorMessage }}
                </p>

                <!-- Submit Button -->
                <button data-testid="login-submit" class="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition" type="submit">
                    {{ $t('login.submit') }}
                </button>
            </form>

            <!-- OR Divider -->
            <div class="relative my-6">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative text-center">
          <span class="bg-tsb-one px-3 text-sm text-gray-500 uppercase">
            {{ $t('login.dividerOr') }}
          </span>
                </div>
            </div>

            <!-- Google SSO Button -->
            <button
                class="w-full flex items-center justify-center border border-gray-300 rounded-md py-2 hover:bg-gray-100 transition"
                @click="loginWithGoogle"
            >
                <img alt="Google" class="w-5 h-5 mr-2" src="/icons/google-icon.svg"/>
                <span class="text-gray-700">{{ $t('login.ssoGoogle') }}</span>
            </button>

            <!-- Signup Link -->
            <p class="text-sm text-gray-500 text-center mt-4">
                {{ $t('login.noAccount') }}
                <NuxtLinkLocale to="/register">
          <span class="text-black font-medium hover:underline cursor-pointer">
            {{ $t('login.register') }}
          </span>
                </NuxtLinkLocale>
            </p>

            <!-- Forgot Password Link -->
            <p class="text-sm text-gray-500 text-center mt-2">
                <NuxtLinkLocale to="/forgot-password" class="text-gray-500 hover:text-black hover:underline">
                    {{ $t('login.forgot') }}
                </NuxtLinkLocale>
            </p>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {onMounted, ref, useNuxtApp, useRuntimeConfig, navigateTo, useLocalePath, definePageMeta} from '#imports';
import type {LoginResponse, User} from '@/types';
import {useAuthStore} from '@/stores/auth'
import {eventBus} from "~/eventBus";
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from "vue-i18n"
import {useCartStore} from "@/stores/cart";
import {useTracking} from "~/composables/useTracking";

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

    // if success, then fetch /me to fill the auth store with user credentials
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

<style>
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
}
</style>
