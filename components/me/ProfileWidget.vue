<template>
    <div>
        <article
            aria-labelledby="personal-info-heading"
            class="rounded-2xl bg-tsb-two p-6 shadow-sm"
        >
            <header class="border-b border-gray-100 pb-4">
                <h2
                    id="personal-info-heading"
                    class="text-lg font-semibold text-gray-900"
                >
                    {{ $t('me.profile.title') }}
                </h2>
            </header>

            <dl class="mt-4 space-y-4">
                <div class="flex items-center justify-between">
                    <dt class="text-gray-500">{{ $t('me.profile.name') }}</dt>
                    <dd :title="authStore?.user?.name" class="font-medium">
                        {{ authStore?.user?.name || '–' }}
                    </dd>
                </div>

                <div class="flex items-center justify-between">
                    <dt class="text-gray-500">{{ $t('me.profile.email') }}</dt>
                    <dd class="font-medium">
                        {{ authStore?.user?.email || '–' }}
                    </dd>
                </div>

                <div class="flex items-center justify-between">
                    <dt class="text-gray-500">{{ $t('me.profile.phoneNumber') }}</dt>
                    <dd :title="authStore?.user?.phoneNumber" class="font-medium">
                        {{ authStore?.user?.phoneNumber }}
                    </dd>
                </div>

                <div class="flex items-center justify-between">
                    <dt class="text-gray-500">{{ $t('me.profile.address') }}</dt>
                    <dd :title="authStore?.user?.address" class="font-medium">
                        {{ authStore?.user?.address || '–' }}
                    </dd>
                </div>
            </dl>

            <footer class="mt-6">
                <button
                    aria-label="{{ $t('me.profile.update') }}"
                    class="w-full rounded-lg bg-blue-100 px-4 py-2 text-blue-700 hover:bg-blue-200 transition-colors"
                    type="button"
                    @click="openModal"
                >
                    {{ $t('me.profile.update') }}
                </button>
            </footer>
        </article>
        <!-- Modal Backdrop -->
        <div
            v-if="showModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            @keydown.esc="closeModal"
            tabindex="0"
        >
            <!-- Modal Container -->
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
                <h3 class="text-2xl font-semibold text-gray-900 text-center mb-6">
                    {{ $t('me.profile.update') }}
                </h3>
                <!-- Profile Update Form -->
                <form @submit.prevent="submitProfileUpdate" class="space-y-4">
                    <!-- Full Name -->
                    <div>
                        <label for="fullName" class="block text-sm text-gray-700 mb-1">
                            {{ $t('register.fullName') }}
                        </label>
                        <input
                            id="fullName"
                            v-model="fullName"
                            :placeholder="$t('register.fullNamePlaceholder')"
                            type="text"
                            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                            required
                        />
                    </div>

                    <!-- Email -->
                    <div>
                        <label for="email" class="block text-sm text-gray-700 mb-1">
                            {{ $t('register.email') }}
                        </label>
                        <input
                            id="email"
                            v-model="email"
                            :placeholder="$t('register.emailPlaceholder')"
                            type="email"
                            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                            required
                        />
                    </div>

                    <!-- Phone Number with Country Selector -->
                    <div>
                        <label for="phone" class="block text-sm text-gray-700 mb-1">
                            {{ $t('register.phone') }}
                        </label>
                        <div class="flex space-x-2">
                            <!-- Country Selector -->
                            <select
                                id="country"
                                v-model="selectedCountry"
                                class="p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                            >
                                <option
                                    v-for="country in countries"
                                    :key="country.code"
                                    :value="country.code"
                                >
                                    {{ country.flag }} {{ country.prefix }}
                                </option>
                            </select>
                            <!-- Phone Input -->
                            <input
                                id="phone"
                                v-model="phoneLocal"
                                :placeholder="$t('register.phonePlaceholder')"
                                type="tel"
                                class="flex-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                                required
                            />
                        </div>
                        <p v-if="phoneError" class="text-sm text-red-500 mt-1">{{ phoneError }}</p>
                    </div>

                    <!-- Address -->
                    <div>
                        <label for="address" class="block text-sm text-gray-700 mb-1">
                            {{ $t('register.address') }}
                        </label>
                        <input
                            id="address"
                            v-model="address"
                            :placeholder="$t('register.addressPlaceholder')"
                            type="text"
                            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                        />
                    </div>

                    <!-- Action Buttons -->
                    <div class="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            class="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                            @click="closeModal"
                        >
                            {{ $t('common.cancel') }}
                        </button>
                        <button
                            type="submit"
                            class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                        >
                            {{ $t('common.save') }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import {PhoneNumberFormat, PhoneNumberUtil} from 'google-libphonenumber'
import {computed, useAsyncData, useNuxtApp} from "#imports";
import type {User} from "~/types";

const {$api} = useNuxtApp()
const { t } = useI18n()
const authStore = useAuthStore()

// Modal visibility
const showModal = ref(false)

// Form fields (initialized with current user data)
const fullName = ref(authStore.user?.name || '')
const email = ref(authStore.user?.email || '')
const phoneLocal = ref(authStore.user?.phoneNumber || '')
const address = ref(authStore.user?.address || '')
const selectedCountry = ref('BE') // Default country; adjust as needed.

const countries = [
    { prefix: '+31', code: 'NL', flag: '🇳🇱' },
    { prefix: '+32', code: 'BE', flag: '🇧🇪' },
    { prefix: '+33', code: 'FR', flag: '🇫🇷' },
    { prefix: '+352', code: 'LU', flag: '🇱🇺' },
    { prefix: '+44', code: 'DE', flag: '🇩🇪' },
]

const phoneError = ref('')
const phoneUtil = PhoneNumberUtil.getInstance()

const validatePhone = (): boolean => {
    try {
        const number = phoneUtil.parseAndKeepRawInput(phoneLocal.value, selectedCountry.value)
        if (!phoneUtil.isValidNumber(number)) {
            phoneError.value = t('register.invalidPhone')
            return false
        }
        phoneError.value = ''
        return true
    } catch (error) {
        console.error('Phone validation error:', error)
        phoneError.value = t('register.invalidPhone')
        return false
    }
}

const formattedPhone = computed(() => {
    if (!phoneLocal.value) return ''
    try {
        const number = phoneUtil.parseAndKeepRawInput(phoneLocal.value, selectedCountry.value)
        return phoneUtil.format(number, PhoneNumberFormat.E164)
    } catch (error) {
        console.error('Phone formatting error:', error)
        return phoneLocal.value
    }
})

const openModal = () => {
    fullName.value = authStore.user?.name || ''
    email.value = authStore.user?.email || ''
    address.value = authStore.user?.address || ''

    // Process the stored phone number.
    const storedPhone = authStore.user?.phoneNumber || ''
    if (storedPhone) {
        // Find a country whose prefix matches the beginning of the stored phone.
        const matchingCountry = countries.find(country => storedPhone.startsWith(country.prefix))
        if (matchingCountry) {
            selectedCountry.value = matchingCountry.code
            // Remove the country prefix from the stored phone.
            phoneLocal.value = storedPhone.substring(matchingCountry.prefix.length)
        } else {
            // If no prefix is found, leave the phone as is.
            phoneLocal.value = storedPhone
        }
    } else {
        phoneLocal.value = ''
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
}

const submitProfileUpdate = async () => {
    // Basic validation
    if (!fullName.value || !email.value || !phoneLocal.value) return
    if (!validatePhone()) return

    const payload = {
        name: fullName.value,
        email: email.value,
        phoneNumber: formattedPhone.value ?? null,
        address: address.value ?? null,
    };

    const filteredPayload = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(payload).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    );

    const { data: updatedUser } = await useAsyncData<User>('/me', () =>
        $api('/me', {
            method: 'PATCH',
            body: filteredPayload,
        })
    );

    if (!updatedUser.value) {
        console.error('Failed to update user profile')
        return
    }

    authStore.updateUser(updatedUser.value)

    closeModal()
}
</script>

<style scoped>
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
}
</style>
