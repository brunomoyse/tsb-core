<template>
    <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
        <div class="w-full max-w-md">

            <!-- Card container -->
            <div class="bg-tsb-two rounded-2xl relative">
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

                    <UserForm mode="register" @submit="registerUser" />

                    <!-- Login link -->
                    <p class="text-sm text-gray-600 text-center mt-6">
                        {{ $t('register.hasAccount') }}
                        <NuxtLinkLocale to="/login" class="text-red-500 font-medium hover:text-red-600 transition-colors duration-300">
                            {{ $t('login.title') }}
                        </NuxtLinkLocale>
                    </p>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { definePageMeta, navigateTo, useAsyncData, useLocalePath, useNuxtApp } from '#imports'
import UserForm from '~/components/form/UserForm.vue'
import { eventBus } from '~/eventBus'
import { useI18n } from 'vue-i18n'
import { useTracking } from '~/composables/useTracking'

definePageMeta({
    public: true
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const localePath = useLocalePath()
const { trackEvent } = useTracking()

useSchemaOrg([
    defineWebPage({
        '@type': 'WebPage',
        name: t('schema.register.title'),
        description: t('schema.register.description')
    })
])

useSeoMeta({
    title: t('schema.register.title'),
    description: t('schema.register.description'),
    robots: 'noindex,nofollow',
})

// Handle the submitted data from UserForm
const registerUser = async (formData: any) => {
    const { firstName, lastName, email, password, phoneNumber, addressId } = formData

    // Nuxt 4: No key for one-time mutations to avoid singleton behavior
    const { error } = await useAsyncData(() =>
        $api('/register', {
            method: 'POST',
            body: {
                firstName,
                lastName,
                email,
                password,
                phoneNumber,
                addressId,
            }
        })
    )

    if (error.value) {
        trackEvent('registration_error', { error_type: 'server_error' })
    }

    if (!error.value) {
        trackEvent('user_registered')
        eventBus.emit('notify', {
            message: t('notify.verificationEmailSent'),
            persistent: false,
            duration: 5000,
            variant: 'success',
        })
        navigateTo(localePath('/login'))
    }
}
</script>
