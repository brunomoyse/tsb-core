<template>
    <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
        <div class="w-full max-w-md">

            <!-- Card container -->
            <div class="bg-tsb-two rounded-2xl relative overflow-hidden">
                <!-- Decorative blurred accents -->
                <div class="absolute -top-16 -right-16 w-56 h-56 bg-tsb-four/40 rounded-full blur-3xl pointer-events-none" />
                <div class="absolute -bottom-16 -left-16 w-44 h-44 bg-tsb-four/30 rounded-full blur-3xl pointer-events-none" />

                <!-- Kanji watermark: 確認 (confirm) -->
                <span
                    class="absolute top-4 right-5 font-channel text-[80px] sm:text-[100px] text-red-200/[0.07] leading-none select-none pointer-events-none"
                    aria-hidden="true"
                >確認</span>

                <div class="relative px-7 sm:px-10 py-8 sm:py-10">
                    <!-- Decorative seal stamp -->
                    <div class="flex justify-center mb-2" aria-hidden="true">
                        <svg class="w-9 h-9 text-red-400/30" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <circle cx="30" cy="30" r="24" />
                            <circle cx="30" cy="30" r="20" />
                            <line x1="20" y1="24" x2="40" y2="24" />
                            <line x1="20" y1="30" x2="40" y2="30" />
                            <line x1="20" y1="36" x2="40" y2="36" />
                        </svg>
                    </div>

                    <!-- Title -->
                    <h1 class="text-2xl font-semibold text-gray-900 text-center">
                        {{ $t('verifyEmail.title') }}
                    </h1>

                    <!-- Chopstick divider -->
                    <div class="flex justify-center items-center mt-2 mb-6" aria-hidden="true">
                        <svg class="w-14 h-4 text-red-400/40" viewBox="0 0 80 20" fill="none">
                            <line x1="5" y1="18" x2="38" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <line x1="42" y1="2" x2="75" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <circle cx="40" cy="2" r="1.5" fill="currentColor" opacity="0.6"/>
                        </svg>
                    </div>

                    <!-- Verifying state -->
                    <div v-if="loading" class="text-center space-y-4">
                        <div class="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center animate-pulse">
                            <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                            </svg>
                        </div>
                        <p class="text-sm text-gray-500">{{ $t('verifyEmail.verifying') }}</p>
                    </div>

                    <!-- Success state -->
                    <div v-else-if="verified" class="text-center space-y-4">
                        <div class="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                            <svg class="w-6 h-6 text-green-500 animate-check-bounce" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900">{{ $t('verifyEmail.successTitle') }}</h3>
                        <p class="text-sm text-gray-500 leading-relaxed">{{ $t('verifyEmail.successMessage') }}</p>
                        <NuxtLinkLocale to="/auth/login" class="inline-block bg-red-500 text-white py-2.5 px-6 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md">
                            {{ $t('login.title') }}
                        </NuxtLinkLocale>
                    </div>

                    <!-- Error state -->
                    <div v-else class="text-center space-y-4">
                        <div class="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                            <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                            </svg>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900">{{ $t('verifyEmail.errorTitle') }}</h3>
                        <p class="text-sm text-gray-500 leading-relaxed">{{ errorMessage }}</p>
                        <NuxtLinkLocale to="/auth/login" class="inline-block text-red-500 font-medium hover:text-red-600 transition-colors duration-300">
                            {{ $t('login.title') }}
                        </NuxtLinkLocale>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { definePageMeta, onMounted, ref, useRoute } from '#imports'
import { useI18n } from 'vue-i18n'
import { useZitadelApi } from '~/composables/useZitadelApi'

definePageMeta({ public: true })

const { t } = useI18n()
const route = useRoute()
const { verifyEmail } = useZitadelApi()

const loading = ref(true)
const verified = ref(false)
const errorMessage = ref('')

useSeoMeta({
    title: t('verifyEmail.title'),
    robots: 'noindex,nofollow',
})

onMounted(async () => {
    const userId = route.query.userId as string
    const code = route.query.code as string

    if (!userId || !code) {
        loading.value = false
        errorMessage.value = t('verifyEmail.invalidLink')
        return
    }

    try {
        await verifyEmail(userId, code)
        verified.value = true
    } catch (e: any) {
        const status = e?.response?.status || e?.statusCode
        if (status === 429) {
            errorMessage.value = t('notify.errors.tooManyRequests')
        } else {
            errorMessage.value = t('verifyEmail.expiredOrInvalid')
        }
    } finally {
        loading.value = false
    }
})
</script>
