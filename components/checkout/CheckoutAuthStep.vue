<template>
    <div class="max-w-md mx-auto">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="px-6 sm:px-8 py-7 sm:py-8">
                <!-- Cart-saved chip -->
                <div class="flex items-center justify-center gap-2 mb-4">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-600">
                        <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                        {{ $t('checkout.authStep.cartSaved') }}
                        <span v-if="cartStore.products.length > 0" class="text-gray-400">·</span>
                        <span v-if="cartStore.products.length > 0" class="tabular-nums">
                            {{ $t('checkout.itemCount', { count: cartStore.totalItems }, cartStore.totalItems) }}
                        </span>
                    </span>
                </div>

                <h2 class="text-xl font-semibold text-gray-900 text-center mb-6">
                    {{ $t('checkout.authStep.heading') }}
                </h2>

                <AuthFlow
                    mode="inline"
                    :on-before-redirect="saveReturnTo"
                    :on-complete="handleComplete"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import AuthFlow from '~/components/auth/AuthFlow.vue'
import { useCartStore } from '~/stores/cart'
import { useLocalePath } from '#imports'
import { usePlatform } from '~/composables/usePlatform'

const cartStore = useCartStore()
const localePath = useLocalePath()
const { isCapacitor } = usePlatform()

// Stash the return URL before any redirect so the OIDC callback lands back on /checkout.
const saveReturnTo = () => {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem('oidc_return_to', localePath('/checkout'))
}

const handleComplete = async (callbackUrl: string) => {
    if (isCapacitor) {
        const url = new URL(callbackUrl)
        const authCode = url.searchParams.get('code')
        if (!authCode) throw new Error('No authorization code in callback URL')

        const { useOidc } = await import('~/composables/useOidc')
        const { exchangeCodeForTokens } = useOidc()
        await exchangeCodeForTokens(authCode)

        const { useAuthCallback } = await import('~/composables/useAuthCallback')
        const { processCallback } = useAuthCallback()
        await processCallback()
    } else {
        window.location.href = callbackUrl
    }
}
</script>
