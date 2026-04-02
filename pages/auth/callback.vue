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
import { usePlatform } from '~/composables/usePlatform'

definePageMeta({ public: true })

const { handleCallback, exchangeCodeForTokens } = useOidc()
const { processCallback } = useAuthCallback()
const { isCapacitor } = usePlatform()
const error = ref(false)

onMounted(async () => {
    try {
        if (import.meta.dev) console.log('Callback URL:', window.location.href)

        if (isCapacitor) {
            // Capacitor: extract code from URL and exchange via backend proxy
            const url = new URL(window.location.href)
            const code = url.searchParams.get('code')
            if (!code) throw new Error('No authorization code in callback URL')
            await exchangeCodeForTokens(code)
        } else {
            // Web: use oidc-client-ts signinRedirectCallback (direct Zitadel call)
            await handleCallback()
        }

        if (import.meta.dev) console.log('Token exchange succeeded')

        try {
            await processCallback()
            if (import.meta.dev) console.log('User profile loaded, navigating...')
        } catch (e) {
            // Token exchange succeeded but processCallback failed (e.g. silent renew error).
            // The OIDC token is valid in sessionStorage — navigate to menu as fallback.
            if (import.meta.dev) console.warn('processCallback failed, falling back to menu:', e)
            const localePath = useLocalePath()
            navigateTo(localePath('menu'))
        }
    } catch (e) {
        console.error('OIDC callback error:', e)
        error.value = true
    }
})
</script>
