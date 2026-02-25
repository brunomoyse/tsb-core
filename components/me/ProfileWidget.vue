<template>
    <article class="bg-tsb-two rounded-2xl p-6 sm:p-7 h-full">
        <!-- Header -->
        <h2 class="font-semibold text-gray-900 text-[15px] mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                </svg>
            </div>
            {{ $t('me.profile.title') }}
        </h2>

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
                class="w-full rounded-lg bg-red-500 px-4 py-2.5 text-white hover:bg-red-600 transition-colors font-medium"
                type="button"
                @click="openModal"
            >
                {{ $t('me.profile.update') }}
            </button>
            <!-- Request Deletion / Cancel Deletion Request -->
            <button
                v-if="!authStore.user?.deletionRequestedAt"
                class="w-full rounded-lg border border-red-300 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors font-medium text-sm"
                type="button"
                @click="handleRequestDeletion"
            >
                {{ $t('me.profile.requestDeletion') }}
            </button>
            <button
                v-else
                class="w-full rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 text-amber-700 hover:bg-amber-100 transition-colors font-medium text-sm"
                type="button"
                @click="handleCancelDeletionRequest"
            >
                {{ $t('me.profile.cancelDeletionRequest') }}
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
    </article>
</template>

<script setup lang="ts">
import type { Address, UpdateUserRequest, User } from '~/types'
import UserForm from '~/components/form/UserForm.vue'
import { eventBus } from '~/eventBus'
import { formatAddress } from '~/utils/utils'
import gql from 'graphql-tag'
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useGqlMutation } from '#imports'
import { useI18n } from 'vue-i18n'
import { useTracking } from '~/composables/useTracking'

const { t } = useI18n()
const authStore = useAuthStore()
const { trackEvent } = useTracking()

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

const REQUEST_DELETION = gql`
    mutation {
        requestDeletion {
            id
            deletionRequestedAt
        }
    }
`

const CANCEL_DELETION_REQUEST = gql`
    mutation {
        cancelDeletionRequest {
            id
            deletionRequestedAt
        }
    }
`

const { mutate: mutationUpdateMe } = useGqlMutation<{ updateMe: User }>(UPDATE_ME)
const { mutate: mutationRequestDeletion } = useGqlMutation<{ requestDeletion: User }>(REQUEST_DELETION)
const { mutate: mutationCancelDeletionRequest } = useGqlMutation<{ cancelDeletionRequest: User }>(CANCEL_DELETION_REQUEST)

// Modal visibility
const showModal = ref(false)

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
    { prefix: '+31', code: 'NL', flag: '\u{1F1F3}\u{1F1F1}' },
    { prefix: '+32', code: 'BE', flag: '\u{1F1E7}\u{1F1EA}' },
    { prefix: '+33', code: 'FR', flag: '\u{1F1EB}\u{1F1F7}' },
    { prefix: '+352', code: 'LU', flag: '\u{1F1F1}\u{1F1FA}' },
    { prefix: '+44', code: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
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
    userInitialValues.value.addressConfirmed = Boolean(authStore.user?.address)

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

        trackEvent('profile_updated')
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

// Deletion request functions
const handleRequestDeletion = async () => {
    if (!confirm(t('me.profile.requestDeletionConfirm'))) return

    try {
        const res = await mutationRequestDeletion()
        authStore.updateUser({ deletionRequestedAt: res.requestDeletion.deletionRequestedAt })

        eventBus.emit('notify', {
            message: t('me.profile.requestDeletionSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
    } catch (error) {
        console.error('Error requesting deletion:', error)
    }
}

const handleCancelDeletionRequest = async () => {
    try {
        const res = await mutationCancelDeletionRequest()
        authStore.updateUser({ deletionRequestedAt: res.cancelDeletionRequest.deletionRequestedAt })

        eventBus.emit('notify', {
            message: t('me.profile.cancelDeletionSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
    } catch (error) {
        console.error('Error canceling deletion request:', error)
    }
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
