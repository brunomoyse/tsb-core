<template>
    <div class="flex justify-center">
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

                <!-- Submit Button -->
                <button class="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition" type="submit">
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
        </div>
    </div>
</template>

<script lang="ts" setup>
import {onMounted, ref, useNuxtApp, useRuntimeConfig, navigateTo, useLocalePath} from '#imports';
import type {LoginResponse, User} from '@/types';
import {useAuthStore} from '@/stores/auth'
import {eventBus} from "~/eventBus";

const localePath = useLocalePath()
const authStore = useAuthStore()
const {$api} = useNuxtApp()
const config = useRuntimeConfig()
const apiUrl: string = config.public.api as string

const email = ref('')
const password = ref('')

// Regular email/password login
const login = async () => {
    try {
        await $api<LoginResponse>('/login', {
            method: 'POST',
            body: {
                email: email.value,
                password: password.value
            },
        });
    } catch (error) {
        console.error('Login error:', error)
        return
    }
    await loginSuccess()
}

const loginWithGoogle = () => {
    window.location.href = `${apiUrl}/oauth/google`;
};

const loginSuccess = async () => {
    if (import.meta.client) {
        const user = await $api<User>('/me')
        if (user) authStore.setUser(user)
    }
    navigateTo(localePath('me'))
}

onMounted(async () => {
    // Check if the user is already logged in on page load
    if (authStore.accessValid) {
        navigateTo(localePath('me'))
    }

    const params = new URLSearchParams(window.location.search)

    const success = params.get('success')
    const emailVerified = params.get('email_verified')
    const fromCheckout = params.get('from_checkout')

    // if success, then fetch /me to fill the auth store with user credentials
    if (success) {
        try {
            await loginSuccess()
        } catch (error) {
            console.error('Login error:', error)
        }
    }

    if (emailVerified) {
        // Show a notification if the email is verified
        eventBus.emit('notify', {
            message: 'Your email has been verified. You can now log in.',
            persistent: false,
            duration: 5000,
            variant: 'success',
        })
    }

    if (fromCheckout) {
        // Show a notification if the user was redirected from checkout
        eventBus.emit('notify', {
            message: 'Veuillez vous connecter pour valider votre panier.',
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
