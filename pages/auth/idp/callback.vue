<template>
    <div class="flex justify-center items-center min-h-[50vh]">
        <div class="text-center">
            <div v-if="rateLimited" class="text-amber-700">
                <p class="text-lg font-medium">{{ $t('notify.errors.tooManyRequests') }}</p>
                <NuxtLinkLocale to="/auth/login" class="text-red-500 underline mt-2 inline-block">
                    {{ $t('login.tryAgain') }}
                </NuxtLinkLocale>
            </div>
            <div v-else-if="error" class="text-red-600">
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
import { definePageMeta, onMounted, ref, useRoute, useRuntimeConfig } from '#imports'
import { usePlatform } from '~/composables/usePlatform'

definePageMeta({ public: true })

const route = useRoute()
const { isCapacitor } = usePlatform()
const error = ref(false)
const rateLimited = ref(false)

onMounted(async () => {
    // Check for IdP failure
    if (route.query.error) {
        error.value = true
        return
    }

    // Zitadel appends id and token to the success URL
    const idpIntentId = route.query.id as string
    const idpIntentToken = route.query.token as string
    const authRequestId = sessionStorage.getItem('oidcAuthRequestId')

    if (!idpIntentId || !idpIntentToken || !authRequestId) {
        error.value = true
        return
    }

    try {
        const { useZitadelApi } = await import('~/composables/useZitadelApi')
        const { createIdpSession, finalizeOidcAuth } = useZitadelApi()

        // Create a Zitadel session from the IdP intent
        // Pass userId if Zitadel included it (user already exists in Zitadel)
        const userId = (route.query.user as string) || undefined
        const session = await createIdpSession(idpIntentId, idpIntentToken, userId)

        // Finalize the OIDC auth request with this session
        const result = await finalizeOidcAuth(authRequestId, session.sessionId, session.sessionToken)

        // Clean up
        sessionStorage.removeItem('oidcAuthRequestId')

        if (isCapacitor) {
            // Capacitor: exchange code for tokens in-app (never redirect away)
            const callbackUrl = new URL(result.callbackUrl)
            const code = callbackUrl.searchParams.get('code')
            if (!code) throw new Error('No authorization code in callback URL')

            const { useOidc } = await import('~/composables/useOidc')
            const { exchangeCodeForTokens } = useOidc()
            await exchangeCodeForTokens(code)

            // Close the in-app browser (SFSafariViewController) if still open
            try {
                const { Browser } = await import('@capacitor/browser')
                await Browser.close()
            } catch { /* Browser may already be closed */ }

            const { useAuthCallback } = await import('~/composables/useAuthCallback')
            const { processCallback } = useAuthCallback()
            await processCallback()
        } else {
            // Web: redirect to OIDC callback URL (oidc-client-ts exchanges code for tokens)
            window.location.href = result.callbackUrl
        }
    } catch (e: any) {
        if (import.meta.dev) console.error('IdP callback error:', e)
        const status = e?.response?.status || e?.statusCode
        if (status === 429) {
            rateLimited.value = true
        } else {
            error.value = true
        }
    }
})
</script>
