<template>
    <article class="bg-tsb-two rounded-2xl p-6 shadow-sm">
        <!-- Header -->
        <div class="border-b border-gray-100 pb-4">
            <h2 class="text-lg font-semibold text-gray-900">
                {{ $t('me.profile.title') }}
            </h2>
        </div>

        <!-- Profile Information Cards -->
        <div class="mt-4 space-y-3">
            <!-- Name Card -->
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <dt class="text-sm font-medium text-gray-500">{{ $t('me.profile.name') }}</dt>
                        <dd class="mt-1 text-base font-medium text-gray-900">
                            {{ (authStore?.user?.firstName + ' ' + authStore?.user?.lastName) || '–' }}
                        </dd>
                    </div>
                </div>
            </div>

            <!-- Email Card -->
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <dt class="text-sm font-medium text-gray-500">{{ $t('me.profile.email') }}</dt>
                        <dd class="mt-1 text-base font-medium text-gray-900 break-all">
                            {{ authStore?.user?.email || '–' }}
                        </dd>
                    </div>
                </div>
            </div>

            <!-- Phone Card -->
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <dt class="text-sm font-medium text-gray-500">{{ $t('me.profile.phoneNumber') }}</dt>
                        <dd class="mt-1 text-base font-medium text-gray-900">
                            {{ authStore?.user?.phoneNumber || '–' }}
                        </dd>
                    </div>
                </div>
            </div>

            <!-- Address Card -->
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <dt class="text-sm font-medium text-gray-500">{{ $t('me.profile.address') }}</dt>
                        <dd class="mt-1 text-base font-medium text-gray-900">
                            {{ authStore?.user?.address ? formatAddress(authStore.user.address) : '–' }}
                        </dd>
                    </div>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 space-y-2">
            <button
                class="w-full rounded-lg bg-black px-4 py-2.5 text-white hover:bg-gray-800 transition-colors font-medium"
                type="button"
                @click="openModal"
            >
                {{ $t('me.profile.update') }}
            </button>
            <button
                class="w-full rounded-lg border border-red-300 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors font-medium text-sm"
                type="button"
                @click="confirmDeleteAccount"
            >
                {{ $t('me.profile.deleteAccount') }}
            </button>
        </div>

        <!-- Edit Profile Modal -->
        <transition name="fade">
            <div
                v-if="showModal"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="closeModal"
                @keydown.esc="closeModal"
                tabindex="0"
            >
                <div class="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4" @click.stop>
                    <h3 class="text-2xl font-semibold text-gray-900 text-center mb-6">
                        {{ $t('me.profile.update') }}
                    </h3>
                    <UserForm mode="edit" :initialValues="userInitialValues" @submit="submitProfileUpdate" @close="closeModal" />
                </div>
            </div>
        </transition>

        <!-- Delete Account Confirmation Modal -->
        <transition name="fade">
            <div
                v-if="showDeleteModal"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="closeDeleteModal"
                @keydown.esc="closeDeleteModal"
                tabindex="0"
            >
                <div class="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full mx-4" @click.stop>
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">
                        {{ $t('me.profile.deleteAccount') }}
                    </h3>
                    <p class="text-gray-600 mb-4">
                        {{ $t('me.profile.deleteAccountConfirm') }}
                    </p>
                    <div class="mb-4">
                        <label for="deleteConfirmation" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('me.profile.deleteAccountTyping') }}
                        </label>
                        <input
                            id="deleteConfirmation"
                            v-model="deleteConfirmationText"
                            type="text"
                            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-red-200 focus:border-red-500"
                            :placeholder="$t('me.profile.deleteAccountPlaceholder')"
                        />
                    </div>
                    <div class="flex gap-2">
                        <button
                            class="flex-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                            type="button"
                            @click="closeDeleteModal"
                        >
                            {{ $t('common.cancel') }}
                        </button>
                        <button
                            :disabled="deleteConfirmationText !== 'delete'"
                            :class="[
                                'flex-1 rounded-md px-3 py-1.5 text-sm text-white transition-colors font-medium',
                                deleteConfirmationText === 'delete'
                                    ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                                    : 'bg-red-300 cursor-not-allowed'
                            ]"
                            type="button"
                            @click="deleteAccount"
                        >
                            {{ $t('me.profile.deleteAccount') }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>
    </article>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useGqlMutation, navigateTo, useLocalePath } from '#imports'
import UserForm from '~/components/form/UserForm.vue'
import gql from 'graphql-tag'
import { formatAddress } from "~/utils/utils";
import { eventBus } from '~/eventBus'
import { useI18n } from "vue-i18n"
import type {Address, UpdateUserRequest, User} from '~/types'

const { t } = useI18n()
const authStore = useAuthStore()
const localePath = useLocalePath()

const UPDATE_ME = gql`
    mutation ($input: UpdateUserInput!) {
        updateMe(input: $input) {
            id
            firstName
            lastName
            email
            phoneNumber
            address {
                id
                postcode
                municipalityName
                streetName
                houseNumber
                boxNumber
                distance
            }
        }
    }
`

const DELETE_ME = gql`
    mutation {
        deleteMe
    }
`

const { mutate: mutationUpdateMe } = useGqlMutation<{ updateMe: User }>(UPDATE_ME)
const { mutate: mutationDeleteMe } = useGqlMutation<{ deleteMe: boolean }>(DELETE_ME)

// Modal visibility
const showModal = ref(false)
const showDeleteModal = ref(false)
const deleteConfirmationText = ref('')

// Define initial values for the UserForm
const userInitialValues = ref({
    firstName: '',
    lastName: '',
    email: '',
    phoneLocal: '',
    selectedCountry: 'BE',
    address: null as Address | null,
    addressConfirmed: false,
})

// Country list (used for processing the phone number)
const countries = [
    { prefix: '+31', code: 'NL', flag: '🇳🇱' },
    { prefix: '+32', code: 'BE', flag: '🇧🇪' },
    { prefix: '+33', code: 'FR', flag: '🇫🇷' },
    { prefix: '+352', code: 'LU', flag: '🇱🇺' },
    { prefix: '+44', code: 'DE', flag: '🇩🇪' },
]

// Open modal and set UserForm initial values based on authStore.user
const openModal = () => {
    userInitialValues.value.firstName = authStore.user?.firstName || ''
    userInitialValues.value.lastName = authStore.user?.lastName || ''
    userInitialValues.value.email = authStore.user?.email || ''

    // Process the stored phone number to extract the country prefix
    const storedPhone = authStore.user?.phoneNumber || ''
    if (storedPhone) {
        const matchingCountry = countries.find(country =>
            storedPhone.startsWith(country.prefix)
        )
        if (matchingCountry) {
            userInitialValues.value.selectedCountry = matchingCountry.code
            userInitialValues.value.phoneLocal = storedPhone.substring(
                matchingCountry.prefix.length
            )
        } else {
            userInitialValues.value.phoneLocal = storedPhone
        }
    } else {
        userInitialValues.value.phoneLocal = ''
    }

    userInitialValues.value.address = authStore.user?.address || null
    userInitialValues.value.addressConfirmed = !!authStore.user?.address

    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
}

// Handle profile update submission from UserForm
const submitProfileUpdate = async (formData: UpdateUserRequest) => {
    try {
        const res: { updateMe: User } = await mutationUpdateMe(
            { input: formData },
        )

        const updatedUser = res.updateMe
        authStore.updateUser(updatedUser)

        eventBus.emit('notify', {
            message: t('me.profile.updateSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
    } catch (error) {
        console.error('Error during profile update:', error)
        return
    }

    closeModal()
}

// Delete account functions
const confirmDeleteAccount = () => {
    showDeleteModal.value = true
}

const closeDeleteModal = () => {
    showDeleteModal.value = false
    deleteConfirmationText.value = ''
}

const deleteAccount = async () => {
    try {
        await mutationDeleteMe()

        eventBus.emit('notify', {
            message: t('me.profile.deleteAccountSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })

        // Logout and redirect
        authStore.logout()
        navigateTo(localePath('/'))
    } catch (error) {
        console.error('Error during account deletion:', error)
        eventBus.emit('notify', {
            message: 'An error occurred while deleting your account',
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
    }

    closeDeleteModal()
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>