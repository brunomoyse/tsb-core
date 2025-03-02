<template>
  <div class="flex justify-center">
    <div class="w-[500px]">
      <!-- Title -->
      <h2 class="text-2xl font-semibold text-gray-900 text-center mb-4">{{ $t('login.title') }}</h2>

      <!-- Login Form -->
      <form @submit.prevent="login" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-700 mb-1">{{ $t('login.email') }}</label>
          <input v-model="email" type="email" :placeholder="$t('login.emailPlaceholder')" autocomplete="email"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200" />
        </div>

        <div>
          <label class="block text-sm text-gray-700 mb-1">{{ $t('login.password') }}</label>
          <input v-model="password" type="password" :placeholder="$t('login.passwordPlaceholder')"
            autocomplete="current-password" required
            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200" />
        </div>

        <button type="submit" class="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition">
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
      <button @click="loginWithGoogle"
        class="w-full flex items-center justify-center border border-gray-300 rounded-md py-2 hover:bg-gray-100 transition">
        <img src="/icons/google-icon.svg" alt="Google" class="w-5 h-5 mr-2" />
        <span class="text-gray-700">{{ $t('login.ssoGoogle') }}</span>
      </button>

      <!-- Signup Link -->
      <p class="text-sm text-gray-500 text-center mt-4">
        {{ $t('login.noAccount') }}
        <span @click="register" class="text-black font-medium hover:underline cursor-pointer">
          {{ $t('login.register') }}
        </span>
      </p>
    </div>
  </div>

</template>

<script setup lang="ts">
import { onMounted, ref, useNuxtApp, navigateTo } from '#imports';
import type { LoginResponse } from '@/types';
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const { $apiBaseUrl } = useNuxtApp()

const email = ref('')
const password = ref('')
const emit = defineEmits(['close'])

const register = () => {
  navigateTo('/register')
}

// Regular email/password login
const login = async () => {
  try {
    const response = await $fetch<LoginResponse>(`${$apiBaseUrl()}/login`, {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      },
      credentials: 'include' // Include HTTP-only refresh token
    })

    if (!response.accessToken) {
      console.error('Login failed')
      return
    }

    // Store access token in Pinia
    authStore.setAccessToken(response.accessToken)
    authStore.setUser(response.user)

    emit('close')

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
    await useAuthStore().refreshAccessToken();
    // Redirect to home page after successful login
    window.location.href = '/';
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