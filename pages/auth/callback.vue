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
import type { User } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { definePageMeta, navigateTo, onMounted, ref, useLocalePath, useNuxtApp } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useOidc } from '~/composables/useOidc'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: true })

const { handleCallback } = useOidc()
const authStore = useAuthStore()
const cartStore = useCartStore()
const localePath = useLocalePath()
const { $gqlFetch } = useNuxtApp()
const { trackEvent, identifyUser } = useTracking()
const error = ref(false)

const ME = gql`
    query {
        me {
            id
            email
            firstName
            lastName
            phoneNumber
            deletionRequestedAt
            address {
                id
                streetName
                houseNumber
                municipalityName
                postcode
                distance
            }
        }
    }
`

onMounted(async () => {
    try {
        await handleCallback()

        // Fetch user profile from our API
        const data = await $gqlFetch<{ me: User }>(print(ME))
        if (data) {
            authStore.setUser(data.me)
            identifyUser(data.me)
        }

        trackEvent('user_logged_in', { method: 'oidc' })

        // Redirect to checkout if cart has items, otherwise menu
        if (cartStore.products.length > 0) {
            navigateTo(localePath('checkout'))
        } else {
            navigateTo(localePath('menu'))
        }
    } catch (e) {
        if (import.meta.dev) console.error('OIDC callback error:', e)
        error.value = true
    }
})
</script>
