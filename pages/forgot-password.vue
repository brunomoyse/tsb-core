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
                    <!-- Decorative wave -->
                    <div class="flex justify-center mb-2" aria-hidden="true">
                        <svg class="w-12 h-4 text-red-400/30" viewBox="0 0 60 16" fill="none">
                            <path d="M0 12 C15 12 15 4 30 4 C45 4 45 12 60 12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        </svg>
                    </div>

                    <!-- Title -->
                    <h1 class="text-2xl font-semibold text-gray-900 text-center">
                        {{ $t('forgotPassword.title') }}
                    </h1>

                    <!-- Chopstick divider -->
                    <div class="flex justify-center items-center mt-2 mb-6" aria-hidden="true">
                        <svg class="w-14 h-4 text-red-400/40" viewBox="0 0 80 20" fill="none">
                            <line x1="5" y1="18" x2="38" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <line x1="42" y1="2" x2="75" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <circle cx="40" cy="2" r="1.5" fill="currentColor" opacity="0.6"/>
                        </svg>
                    </div>

                    <!-- Form State -->
                    <template v-if="!submitted">
                        <p class="text-sm text-gray-500 text-center mb-6">{{ $t('forgotPassword.description') }}</p>

                        <form class="space-y-4" @submit.prevent="submit">
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

                            <!-- Inline Error -->
                            <p v-if="errorMessage" role="alert" class="text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl px-3.5 py-2.5 animate-shake">
                                {{ errorMessage }}
                            </p>

                            <!-- Submit Button -->
                            <button
                                class="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md"
                                type="submit"
                            >
                                {{ $t('forgotPassword.submit') }}
                            </button>
                        </form>

                        <!-- Back to login -->
                        <p class="text-sm text-center mt-6">
                            <NuxtLinkLocale to="/login" class="text-gray-500 hover:text-gray-700 transition-colors duration-300">
                                {{ $t('forgotPassword.backToLogin') }}
                            </NuxtLinkLocale>
                        </p>
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
                            <h3 class="text-lg font-medium text-gray-900">{{ $t('forgotPassword.successTitle') }}</h3>
                            <p class="text-sm text-gray-500 leading-relaxed">{{ $t('forgotPassword.successMessage') }}</p>
                            <NuxtLinkLocale to="/login" class="inline-block text-red-500 font-medium hover:text-red-600 transition-colors duration-300">
                                {{ $t('forgotPassword.backToLogin') }}
                            </NuxtLinkLocale>
                        </div>
                    </template>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { definePageMeta, useNuxtApp } from '#imports'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

definePageMeta({
    public: true
})

const { t } = useI18n()
const { $api } = useNuxtApp()

useSchemaOrg([
    defineWebPage({
        '@type': 'WebPage',
        name: t('schema.forgotPassword.title'),
        description: t('schema.forgotPassword.description')
    })
])

useSeoMeta({
    title: t('schema.forgotPassword.title'),
    description: t('schema.forgotPassword.description'),
    robots: 'noindex,nofollow',
})

const email = ref('')
const submitted = ref(false)
const errorMessage = ref('')

const submit = async () => {
    errorMessage.value = ''
    try {
        await $api('/forgot-password', {
            method: 'POST',
            body: { email: email.value },
        })
    } catch (error: any) {
        if (error?.response?.status === 429) {
            errorMessage.value = t('notify.errors.tooManyRequests')
            return
        }
    }
    submitted.value = true
}
</script>
