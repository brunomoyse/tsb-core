<template>
    <div class="flex justify-center pt-8">
        <div class="w-[500px]">
            <!-- Title -->
            <h1 class="text-2xl font-semibold text-gray-900 text-center mb-4">{{ $t('forgotPassword.title') }}</h1>

            <!-- Form State -->
            <template v-if="!submitted">
                <p class="text-sm text-gray-500 text-center mb-6">{{ $t('forgotPassword.description') }}</p>

                <form class="space-y-4" @submit.prevent="submit">
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

                    <!-- Inline Error -->
                    <p v-if="errorMessage" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {{ errorMessage }}
                    </p>

                    <!-- Submit Button -->
                    <button class="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-all duration-300 active:scale-[0.97]" type="submit">
                        {{ $t('forgotPassword.submit') }}
                    </button>
                </form>
            </template>

            <!-- Success State -->
            <template v-else>
                <div class="text-center space-y-4">
                    <h3 class="text-lg font-medium text-gray-900">{{ $t('forgotPassword.successTitle') }}</h3>
                    <p class="text-sm text-gray-500">{{ $t('forgotPassword.successMessage') }}</p>
                    <NuxtLinkLocale to="/login" class="inline-block text-black font-medium hover:underline">
                        {{ $t('forgotPassword.backToLogin') }}
                    </NuxtLinkLocale>
                </div>
            </template>
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
