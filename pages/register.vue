<template>
    <div class="flex justify-center">
        <div class="w-[500px]">
            <h2 class="text-2xl font-semibold text-gray-900 text-center mb-4">
                {{ $t('register.title') }}
            </h2>
            <UserForm mode="register" @submit="registerUser" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import UserForm from '~/components/form/UserForm.vue'
import { useNuxtApp, useAsyncData, navigateTo, useLocalePath } from '#imports'
import { eventBus } from '~/eventBus'
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const { $api } = useNuxtApp()
const localePath = useLocalePath()

// Handle the submitted data from UserForm
const registerUser = async (formData: any) => {
    const { firstName, lastName, email, password, phoneNumber, addressId } = formData

    const { error } = await useAsyncData('register', () =>
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

    if (!error.value) {
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
