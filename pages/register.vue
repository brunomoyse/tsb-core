<template>
    <div class="flex justify-center">
        <div class="w-full max-w-[500px] px-4">
            <h2 class="text-2xl font-semibold text-gray-900 text-center mb-4">
                {{ $t('register.title') }}
            </h2>
            <UserForm mode="register" @submit="registerUser" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import UserForm from '~/components/form/UserForm.vue'
import { useNuxtApp, useAsyncData, navigateTo, useLocalePath, definePageMeta } from '#imports'
import { eventBus } from '~/eventBus'
import { useI18n } from "vue-i18n"
import { useTracking } from "~/composables/useTracking"

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
