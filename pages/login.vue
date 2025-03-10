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
import {navigateTo, onMounted, ref, useLocalePath, useNuxtApp} from '#imports';
import type {LoginResponse} from '@/types';
import {useAuthStore} from '@/stores/auth'

const authStore = useAuthStore()
const localePath = useLocalePath()
const {$api, $apiBaseUrl, $refreshToken} = useNuxtApp()

const email = ref('')
const password = ref('')

// Regular email/password login
const login = async () => {
    try {
        const response = await $api<LoginResponse>('/login', {
            method: 'POST',
            body: {
                email: email.value,
                password: password.value
            },
        })

        if (!response.accessToken) {
            console.error('Login failed')
            return
        }

        // Store access token in Pinia
        authStore.setAccessToken(response.accessToken)
        authStore.setUser(response.user)

    } catch (error) {
        console.error('Login error:', error)
    }
}

const loginWithGoogle = () => {
    window.location.href = `${$apiBaseUrl()}/oauth/google`;
};

onMounted(async () => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    if (success === 'true') {
        const res = await $refreshToken();
        authStore.setUser(res.user)
        authStore.setAccessToken(res.accessToken)

        // Redirect to home page after successful login
        navigateTo(localePath('/'))
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
