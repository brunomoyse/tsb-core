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
import { definePageMeta, onMounted, ref, useRoute } from '#imports'

definePageMeta({ public: true })

const route = useRoute()
const error = ref(false)

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

        // Redirect to the OIDC callback URL (oidc-client-ts exchanges code for tokens)
        window.location.href = result.callbackUrl
    } catch (e) {
        if (import.meta.dev) console.error('IdP callback error:', e)
        error.value = true
    }
})
</script>
