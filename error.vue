<template>
    <div class="min-h-screen flex flex-col items-center justify-center bg-tsb-one px-4 text-center">
        <!-- Round Maneki Neko Avatar -->
        <img
            v-if="error?.statusCode === 404"
            alt="Lost Maneki Neko"
            class="w-64 h-64 sm:w-80 sm:h-80 mb-6 rounded-full object-cover"
            src="/images/404-maneki-neko.png"
        />

        <!-- Error Code -->
        <h1 class="text-6xl font-bold text-gray-800 mb-4">
            {{ error?.statusCode || 500 }}
        </h1>

        <!-- Error Message -->
        <p class="text-lg text-gray-600 mb-6">
            {{ errorMessage }}
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row justify-center gap-4">
            <a
                class="px-6 py-3 border border-gray-300 text-gray-800 rounded hover:bg-gray-100 transition duration-200"
                href="/"
            >
                {{ $t('error.homeButton') }}
            </a>
            <a
                class="px-6 py-3 border border-gray-300 text-gray-800 rounded hover:bg-gray-100 transition duration-200"
                href="/menu"
            >
                {{ $t('error.menuButton') }}
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
    error: NuxtError
}>()

const { t } = useI18n()

const errorMessage = computed(() => {
    switch (props.error?.statusCode) {
        case 404:
            return t('error.notFound')
        case 403:
            return t('error.forbidden')
        case 500:
            return t('error.serverError')
        default:
            return t('error.generic')
    }
})
</script>
