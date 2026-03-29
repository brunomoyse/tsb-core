<template>
    <div class="flex justify-center items-center min-h-[50vh]">
        <div class="text-center">
            <div v-if="error" class="text-red-600">
                <p class="text-lg font-medium">{{ $t('login.callbackError') }}</p>
                <NuxtLinkLocale to="/auth/login" class="text-red-500 underline mt-2 inline-block">
                    {{ $t('login.tryAgain') }}
                </NuxtLinkLocale>
            </div>
            <div v-else class="animate-pulse">
                <p class="text-gray-600">{{ $t('login.authenticating') }}</p>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { definePageMeta, onMounted, ref } from '#imports'
import { useAuthCallback } from '~/composables/useAuthCallback'
import { useOidc } from '~/composables/useOidc'

definePageMeta({ public: true })

const { handleCallback } = useOidc()
const { processCallback } = useAuthCallback()
const error = ref(false)

onMounted(async () => {
    try {
        console.log('Callback URL:', window.location.href)
        await handleCallback()
        console.log('Token exchange succeeded')
        await processCallback()
        console.log('User profile loaded, navigating...')
    } catch (e) {
        console.error('OIDC callback error:', e)
        error.value = true
    }
})
</script>
