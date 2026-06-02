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

/*
 * Module-instance once-guard. Hydration mismatches, accidental remounts and
 * HMR can fire onMounted twice; the OIDC authorization code in the URL is
 * one-shot, so a second handleCallback() call hits Zitadel with an
 * already-consumed code and returns invalid_grant — the user sees "expired".
 */
let callbackHandled = false

onMounted(async () => {
    if (callbackHandled) return
    callbackHandled = true
    try {
        if (import.meta.dev) console.log('Callback URL:', window.location.href)

        // Oidc-client-ts exchanges the authorization code for tokens.
        await handleCallback()

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
