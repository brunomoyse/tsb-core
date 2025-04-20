<template>
    <div>
        <article
            aria-labelledby="personal-info-heading"
            class="rounded-2xl bg-tsb-two p-6 shadow-sm"
        >
            <header class="border-b border-gray-100 pb-4">
                <h2 id="personal-info-heading" class="text-lg font-semibold text-gray-900">
                    {{ $t('me.profile.title') }}
                </h2>
            </header>

            <dl class="mt-4 space-y-4">
                <div class="flex items-center justify-between">
                    <dt class="text-gray-500">{{ $t('me.profile.name') }}</dt>
                    <dd title="name" class="font-medium">
                        {{ (authStore?.user?.firstName + ' ' + authStore?.user?.lastName) || '–' }}
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
                    <dd :title="authStore?.user?.phoneNumber ?? ''" class="font-medium">
                        {{ authStore?.user?.phoneNumber || '–' }}
                    </dd>
                </div>

                <div class="flex items-center justify-between">
                    <dt class="text-gray-500">{{ $t('me.profile.address') }}</dt>
                    <dd title="address" class="font-medium text-right">
                        {{ authStore?.user?.address ? formatAddress(authStore.user.address) : '–' }}
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
            @click.self="closeModal"
            @keydown.esc="closeModal"
            tabindex="0"
        >
            <!-- Modal Container (clicks inside won't close modal) -->
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full" @click.stop>
                <h3 class="text-2xl font-semibold text-gray-900 text-center mb-6">
                    {{ $t('me.profile.update') }}
                </h3>
                <!-- Use the reusable UserForm component -->
                <UserForm mode="edit" :initialValues="userInitialValues" @submit="submitProfileUpdate" @close="closeModal" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref} from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useGqlMutation} from '#imports'
import UserForm from '~/components/form/UserForm.vue'
import gql from 'graphql-tag'
import { formatAddress } from "~/utils/utils";
import type {Address, UpdateUserRequest, User} from '~/types'

const authStore = useAuthStore()

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

// call this once during setup
const { mutate: mutationUpdateMe } = useGqlMutation<{ updateMe: User }>(UPDATE_ME)

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
    const payload: UpdateUserRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        // email: formData.email,
        phoneNumber: formData.phoneNumber || null,
        addressId: formData.addressId || null,
    }

    const filteredPayload = Object.fromEntries(
        Object.entries(payload).filter(
            ([, value]) => value !== undefined && value !== null && value !== ''
        )
    )

    try {
        const res: { updateMe: User } = await mutationUpdateMe(
            { input: filteredPayload },
        )

        const updatedUser = res.updateMe
        authStore.updateUser(updatedUser)
    } catch (error) {
        console.error('Error during profile update:', error)
        return
    }

    closeModal()
}
</script>
