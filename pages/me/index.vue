<script lang="ts" setup>
import type { Address, UpdateUserRequest, User } from '@/types'
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useGqlMutation, useNuxtApp, useSwitchLocalePath } from '#imports'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import OrdersWidget from '~/components/me/OrdersWidget.vue'
import UserForm from '~/components/form/UserForm.vue'
import { eventBus } from '~/eventBus'
import { formatAddress } from '~/utils/utils'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useAuthStore } from '@/stores/auth'
import { useFocusTrap } from '~/composables/useFocusTrap'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: false })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

const languages = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'zh', label: '中文' },
]
const authStore = useAuthStore()
const { $api, $gqlFetch } = useNuxtApp()
const { trackEvent } = useTracking()

// Fetch user profile if not in store (e.g., page refresh with cleared persistence)
const ME = print(gql`
    query {
        me {
            id
            email
            firstName
            lastName
            phoneNumber
            notifyMarketing
            notifyOrderUpdates
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
`)

onMounted(async () => {
    if (!authStore.user) {
        const data = await $gqlFetch<{ me: User }>(ME)
        if (data) {
            authStore.setUser(data.me)
        }
    }
})


useSeoMeta({
    title: t('schema.myAccount.title'),
    robots: 'noindex,nofollow',
})

// ── Display computed ──

const initials = computed(() => {
    const f = authStore.user?.firstName?.[0] || ''
    const l = authStore.user?.lastName?.[0] || ''
    return (f + l).toUpperCase() || '?'
})

const fullName = computed(() => {
    const first = authStore.user?.firstName || ''
    const last = authStore.user?.lastName || ''
    return `${first} ${last}`.trim() || '–'
})

// ── Profile edit logic ──

const UPDATE_ME = gql`
    mutation ($input: UpdateUserInput!) {
        updateMe(input: $input) {
            id
            firstName
            lastName
            email
            phoneNumber
            notifyMarketing
            notifyOrderUpdates
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

const showModal = ref(false)
const modalRef = ref<HTMLElement | null>(null)
useFocusTrap(modalRef)

const userInitialValues = ref({
    firstName: '',
    lastName: '',
    email: '',
    phoneLocal: '',
    selectedCountry: 'BE',
    address: null as Address | null,
    addressConfirmed: false,
})

const countries = [
    { prefix: '+31', code: 'NL', flag: '\u{1F1F3}\u{1F1F1}' },
    { prefix: '+32', code: 'BE', flag: '\u{1F1E7}\u{1F1EA}' },
    { prefix: '+33', code: 'FR', flag: '\u{1F1EB}\u{1F1F7}' },
    { prefix: '+352', code: 'LU', flag: '\u{1F1F1}\u{1F1FA}' },
    { prefix: '+44', code: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
]

const openModal = () => {
    userInitialValues.value.firstName = authStore.user?.firstName || ''
    userInitialValues.value.lastName = authStore.user?.lastName || ''
    userInitialValues.value.email = authStore.user?.email || ''

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

const closeModal = () => { showModal.value = false }

const submitProfileUpdate = async (formData: UpdateUserRequest) => {
    try {
        const res: { updateMe: User } = await mutationUpdateMe({ input: formData })
        authStore.updateUser(res.updateMe)
        trackEvent('profile_updated')
        eventBus.emit('notify', {
            message: t('me.profile.updateSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
    } catch (error) {
        if (import.meta.dev) console.error('Error during profile update:', error)
        eventBus.emit('notify', {
            message: t('notify.errors.profileUpdateFailed'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
        return
    }
    closeModal()
}

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
        if (import.meta.dev) console.error('Error requesting deletion:', error)
        eventBus.emit('notify', {
            message: t('notify.errors.requestFailed'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
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
        if (import.meta.dev) console.error('Error canceling deletion request:', error)
        eventBus.emit('notify', {
            message: t('notify.errors.requestFailed'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
    }
}

// ── Feature 1: Change Password ──

const hasPassword = ref(false)
onMounted(async () => {
    try {
        const res = await $api<{ hasPassword: boolean }>('/auth/has-password')
        hasPassword.value = res.hasPassword
    } catch {
        hasPassword.value = false
    }
})

const showPasswordModal = ref(false)
const passwordModalRef = ref<HTMLElement | null>(null)
useFocusTrap(passwordModalRef)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordLoading = ref(false)

const passwordRequirements = computed(() => [
    { met: newPassword.value.length >= 8, label: t('register.passwordMinLength') },
    { met: /[A-Z]/.test(newPassword.value), label: t('register.passwordUpperCase') },
    { met: /[a-z]/.test(newPassword.value), label: t('register.passwordLowerCase') },
    { met: /[0-9]/.test(newPassword.value), label: t('register.passwordNumber') },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword.value), label: t('register.passwordSpecialChar') },
])

const passwordStrength = computed(() => {
    const metCount = passwordRequirements.value.filter(r => r.met).length
    const levels = [
        { text: '', color: '', bgColor: '', width: '0%' },
        { text: t('register.passwordVeryWeak'), color: 'text-red-500', bgColor: 'bg-red-500', width: '20%' },
        { text: t('register.passwordWeak'), color: 'text-orange-500', bgColor: 'bg-orange-500', width: '40%' },
        { text: t('register.passwordFair'), color: 'text-yellow-500', bgColor: 'bg-yellow-500', width: '60%' },
        { text: t('register.passwordGood'), color: 'text-green-500', bgColor: 'bg-green-500', width: '80%' },
        { text: t('register.passwordStrong'), color: 'text-green-600', bgColor: 'bg-green-600', width: '100%' },
    ]
    return levels[metCount]
})

const canSubmitPassword = computed(() =>
    newPassword.value.length >= 8 &&
    newPassword.value === confirmPassword.value &&
    currentPassword.value.length > 0 &&
    passwordRequirements.value.every(r => r.met)
)

const openPasswordModal = () => {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordError.value = ''
    showPasswordModal.value = true
}

const closePasswordModal = () => { showPasswordModal.value = false }

const submitChangePassword = async () => {
    passwordError.value = ''

    if (newPassword.value !== confirmPassword.value) {
        passwordError.value = t('me.changePassword.passwordsMismatch')
        return
    }

    passwordLoading.value = true
    try {
        await $api('/auth/change-password', {
            method: 'POST',
            body: { currentPassword: currentPassword.value, newPassword: newPassword.value },
        })
        closePasswordModal()
        eventBus.emit('notify', {
            message: t('me.changePassword.success'),
            persistent: false,
            duration: 5000,
            variant: 'success',
        })
        await authStore.logout()
        navigateTo(localePath('login'))
    } catch (err: unknown) {
        const error = err as { data?: { error?: string } }
        const code = error?.data?.error
        if (code === 'wrong_password') {
            passwordError.value = t('me.changePassword.wrongPassword')
        } else if (code === 'google_only_account') {
            passwordError.value = t('me.changePassword.googleOnly')
        } else if (code === 'weak_password') {
            passwordError.value = t('me.changePassword.weakPassword')
        } else {
            passwordError.value = t('notify.errors.requestFailed')
        }
    } finally {
        passwordLoading.value = false
    }
}

// ── Address edit modal ──

const showAddressModal = ref(false)
const addressModalRef = ref<HTMLElement | null>(null)
useFocusTrap(addressModalRef)
const pendingAddress = ref<Address | null>(null)
const addressLoading = ref(false)

const openAddressModal = () => {
    pendingAddress.value = null
    showAddressModal.value = true
}

const closeAddressModal = () => {
    showAddressModal.value = false
    pendingAddress.value = null
}

const submitAddressUpdate = async () => {
    if (!pendingAddress.value?.id) return
    addressLoading.value = true
    try {
        const res = await mutationUpdateMe({ input: { addressPlaceId: pendingAddress.value.id } })
        authStore.updateUser(res.updateMe)
        eventBus.emit('notify', {
            message: t('me.profile.addressUpdateSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
        closeAddressModal()
    } catch (error) {
        if (import.meta.dev) console.error('Error updating address:', error)
        eventBus.emit('notify', {
            message: t('notify.errors.profileUpdateFailed'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
    } finally {
        addressLoading.value = false
    }
}

// ── Feature 2: Notification Preferences ──

const handleLogout = async () => {
    await authStore.logout()
    navigateTo(localePath('/'))
}

const notifyMarketing = computed(() => authStore.user?.notifyMarketing ?? true)
const notifyOrderUpdates = computed(() => authStore.user?.notifyOrderUpdates ?? true)

const toggleNotifyMarketing = () => updateNotificationPref('notifyMarketing', !notifyMarketing.value)
const toggleNotifyOrderUpdates = () => updateNotificationPref('notifyOrderUpdates', !notifyOrderUpdates.value)

const updateNotificationPref = async (
    field: 'notifyMarketing' | 'notifyOrderUpdates',
    newVal: boolean,
) => {
    try {
        const res = await mutationUpdateMe({ input: { [field]: newVal } })
        authStore.updateUser(res.updateMe)
        eventBus.emit('notify', {
            message: t('me.notifications.updateSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
    } catch {
        eventBus.emit('notify', {
            message: t('me.notifications.updateError'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
    }
}
</script>

<template>
    <section class="max-w-5xl mx-auto pt-6 sm:pt-8 pb-8 px-2">

        <!-- Header -->
        <div class="text-center mb-6 sm:mb-8 bento-cell" style="--delay: 0">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900">
                {{ authStore.user?.firstName ? `${t('me.greeting')}, ${authStore.user.firstName}` : t('schema.myAccount.title') }}
            </h1>
            <p class="mt-2 text-sm sm:text-base text-gray-500 font-light">{{ t('me.subtitle') }}</p>
            <!-- Japanese greeting: ようこそ (welcome) -->
            <p class="mt-1 text-xs text-red-300/40 tracking-[0.25em]" aria-hidden="true">ようこそ</p>
        </div>

        <!-- Bento Grid -->
        <div class="bento-grid">

            <!-- Profile card — avatar + name + edit -->
            <div class="bento-profile bento-cell" style="--delay: 1">
                <div class="bg-tsb-two rounded-2xl p-6 sm:p-7 h-full flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
                        <span class="text-xl font-bold text-red-400">{{ initials }}</span>
                    </div>
                    <h2 class="font-semibold text-gray-900 text-base">{{ fullName }}</h2>
                    <button
                        type="button"
                        class="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-500 transition"
                        @click="openModal"
                    >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
                        </svg>
                        {{ t('me.profile.update') }}
                    </button>
                </div>
            </div>

            <!-- Email cell -->
            <div class="bento-email bento-cell" style="--delay: 2">
                <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-3">
                        <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                        </svg>
                    </div>
                    <span class="text-xs text-gray-500 uppercase tracking-wider">{{ t('me.profile.email') }}</span>
                    <span class="text-sm text-gray-900 mt-1 break-all">{{ authStore.user?.email || '–' }}</span>

                    <!-- Email verification status (verified if logged in via Zitadel) -->
                    <div class="mt-2">
                        <span class="inline-flex items-center gap-1 text-xs text-green-600">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            {{ t('me.verify.verified') }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Phone cell -->
            <div class="bento-phone bento-cell" style="--delay: 3">
                <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-3">
                        <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                        </svg>
                    </div>
                    <span class="text-xs text-gray-500 uppercase tracking-wider">{{ t('me.profile.phoneNumber') }}</span>
                    <a
                        v-if="authStore.user?.phoneNumber"
                        :href="`tel:${authStore.user.phoneNumber}`"
                        class="text-sm text-gray-900 mt-1 hover:text-red-500 transition"
                    >
                        {{ authStore.user.phoneNumber }}
                    </a>
                    <span v-else class="text-sm text-gray-400 mt-1">–</span>
                </div>
            </div>

            <!-- Address cell -->
            <div class="bento-address bento-cell" style="--delay: 4">
                <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-3">
                        <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/>
                        </svg>
                    </div>
                    <span class="text-xs text-gray-500 uppercase tracking-wider">{{ t('me.profile.address') }}</span>
                    <span v-if="authStore.user?.address" class="text-sm text-gray-900 mt-1 whitespace-pre-line">
                        {{ formatAddress(authStore.user.address) }}
                    </span>
                    <button
                        type="button"
                        class="mt-2 text-sm text-red-500 hover:text-red-600 transition text-left"
                        @click="openAddressModal"
                    >
                        {{ authStore.user?.address ? t('me.profile.editAddress') : t('me.profile.addAddress') }}
                    </button>
                </div>
            </div>

            <!-- Password cell (hidden for OAuth-only users) -->
            <div v-if="hasPassword" class="bento-password bento-cell" style="--delay: 5">
                <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-3">
                        <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                        </svg>
                    </div>
                    <span class="text-xs text-gray-500 uppercase tracking-wider">{{ t('me.changePassword.title') }}</span>
                    <button
                        type="button"
                        class="mt-2 text-sm text-red-500 hover:text-red-600 transition text-left"
                        @click="openPasswordModal"
                    >
                        {{ t('me.changePassword.button') }}
                    </button>
                </div>
            </div>

            <!-- Notifications toggle cell -->
            <div class="bento-notifications bento-cell" style="--delay: 6">
                <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-3">
                        <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.093L2.25 6.75"/>
                        </svg>
                    </div>
                    <span class="text-xs text-gray-500 uppercase tracking-wider">{{ t('me.notifications.title') }}</span>

                    <!-- Marketing emails -->
                    <div class="mt-3">
                        <div class="flex items-center gap-3">
                            <button
                                type="button"
                                role="switch"
                                :aria-checked="notifyMarketing"
                                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                                :class="notifyMarketing ? 'bg-red-400' : 'bg-gray-200'"
                                @click="toggleNotifyMarketing"
                            >
                                <span
                                    class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                    :class="notifyMarketing ? 'translate-x-5' : 'translate-x-0'"
                                />
                            </button>
                            <span class="text-sm text-gray-700">{{ t('me.notifications.marketingLabel') }}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1.5">{{ t('me.notifications.marketingDescription') }}</p>
                    </div>

                    <!-- Order tracking emails -->
                    <div class="mt-4 pt-4 border-t border-white/60">
                        <div class="flex items-center gap-3">
                            <button
                                type="button"
                                role="switch"
                                :aria-checked="notifyOrderUpdates"
                                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                                :class="notifyOrderUpdates ? 'bg-red-400' : 'bg-gray-200'"
                                @click="toggleNotifyOrderUpdates"
                            >
                                <span
                                    class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                    :class="notifyOrderUpdates ? 'translate-x-5' : 'translate-x-0'"
                                />
                            </button>
                            <span class="text-sm text-gray-700">{{ t('me.notifications.orderUpdatesLabel') }}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1.5">{{ t('me.notifications.orderUpdatesDescription') }}</p>
                    </div>
                </div>
            </div>

            <!-- Language cell -->
            <div class="bento-language bento-cell" style="--delay: 8">
                <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-3">
                        <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"/>
                        </svg>
                    </div>
                    <span class="text-xs text-gray-500 uppercase tracking-wider">{{ t('nav.language') }}</span>
                    <div class="flex flex-wrap gap-2 mt-2">
                        <NuxtLink
                            v-for="lang in languages"
                            :key="lang.code"
                            :to="switchLocalePath(lang.code)"
                            :class="[
                                'px-3 py-1.5 text-sm rounded-full transition-all active:scale-[0.97]',
                                locale === lang.code
                                    ? 'bg-red-500 text-white font-medium'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                            ]"
                        >
                            {{ lang.label }}
                        </NuxtLink>
                    </div>
                </div>
            </div>

            <!-- Logout cell -->
            <div class="bento-logout bento-cell" style="--delay: 9">
                <button
                    type="button"
                    class="bg-tsb-two rounded-2xl p-6 h-full w-full flex flex-col text-left hover:bg-red-50 transition-colors"
                    @click="handleLogout"
                >
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-3">
                        <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
                        </svg>
                    </div>
                    <span class="text-sm font-medium text-red-500">{{ t('nav.logout') }}</span>
                </button>
            </div>

            <!-- Orders — hero cell -->
            <div class="bento-orders bento-cell" style="--delay: 10">
                <OrdersWidget />
            </div>

        </div>

        <!-- Account deletion — subtle, outside the grid -->
        <div class="mt-8 text-center bento-cell" style="--delay: 11">
            <button
                v-if="!authStore.user?.deletionRequestedAt"
                type="button"
                class="text-xs text-gray-400 hover:text-red-500 transition"
                @click="handleRequestDeletion"
            >
                {{ t('me.profile.requestDeletion') }}
            </button>
            <button
                v-else
                type="button"
                class="text-xs text-amber-600 hover:text-amber-700 transition"
                @click="handleCancelDeletionRequest"
            >
                {{ t('me.profile.cancelDeletionRequest') }}
            </button>
        </div>

        <!-- Edit Profile Modal -->
        <transition name="fade">
            <div
                v-if="showModal"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="closeModal"
            >
                <div ref="modalRef" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" class="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-4" @click.stop @keydown.esc="closeModal">
                    <h3 id="edit-profile-title" class="text-2xl font-semibold text-gray-900 text-center mb-6">
                        {{ t('me.profile.update') }}
                    </h3>
                    <UserForm mode="edit" :initialValues="userInitialValues" @submit="submitProfileUpdate" @close="closeModal" />
                </div>
            </div>
        </transition>

        <!-- Edit Address Modal -->
        <transition name="fade">
            <div
                v-if="showAddressModal"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="closeAddressModal"
            >
                <div ref="addressModalRef" role="dialog" aria-modal="true" aria-labelledby="edit-address-title" class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4" @click.stop @keydown.esc="closeAddressModal">
                    <h3 id="edit-address-title" class="text-2xl font-semibold text-gray-900 text-center mb-6">
                        {{ t('me.profile.address') }}
                    </h3>

                    <AddressAutocomplete @update:address="(addr) => pendingAddress = addr" />

                    <div class="flex gap-3 pt-6">
                        <button
                            type="button"
                            class="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                            @click="closeAddressModal"
                        >
                            {{ t('common.cancel') }}
                        </button>
                        <button
                            type="button"
                            :disabled="!pendingAddress?.id || addressLoading"
                            class="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="submitAddressUpdate"
                        >
                            {{ t('common.save') }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Change Password Modal -->
        <transition name="fade">
            <div
                v-if="showPasswordModal"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="closePasswordModal"
            >
                <div ref="passwordModalRef" role="dialog" aria-modal="true" aria-labelledby="change-password-title" class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4" @click.stop @keydown.esc="closePasswordModal">
                    <h3 id="change-password-title" class="text-2xl font-semibold text-gray-900 text-center mb-6">
                        {{ t('me.changePassword.button') }}
                    </h3>

                    <form class="space-y-4" @submit.prevent="submitChangePassword">
                        <!-- Current password -->
                        <div>
                            <label for="current-password" class="block text-sm font-medium text-gray-700 mb-1">
                                {{ t('me.changePassword.currentPassword') }}
                            </label>
                            <input
                                id="current-password"
                                v-model="currentPassword"
                                type="password"
                                autocomplete="current-password"
                                :placeholder="t('me.changePassword.currentPasswordPlaceholder')"
                                class="w-full bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50"
                            />
                        </div>

                        <!-- New password -->
                        <div>
                            <label for="new-password" class="block text-sm font-medium text-gray-700 mb-1">
                                {{ t('me.changePassword.newPassword') }}
                            </label>
                            <input
                                id="new-password"
                                v-model="newPassword"
                                type="password"
                                autocomplete="new-password"
                                :placeholder="t('me.changePassword.newPasswordPlaceholder')"
                                class="w-full bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50"
                            />

                            <!-- Strength indicator -->
                            <div v-if="newPassword.length > 0" class="mt-2 space-y-2">
                                <div class="flex items-center gap-2">
                                    <div class="flex-1 h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
                                        <div
                                            class="h-full rounded-full transition-all duration-300"
                                            :class="passwordStrength.bgColor"
                                            :style="{ width: passwordStrength.width }"
                                        />
                                    </div>
                                    <span class="text-xs" :class="passwordStrength.color">{{ passwordStrength.text }}</span>
                                </div>
                                <ul class="space-y-1">
                                    <li
                                        v-for="req in passwordRequirements"
                                        :key="req.label"
                                        class="text-xs flex items-center gap-1.5"
                                        :class="req.met ? 'text-green-600' : 'text-gray-400'"
                                    >
                                        <span v-html="req.met ? '&#10003;' : '&#10007;'" />
                                        {{ req.label }}
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <!-- Confirm password -->
                        <div>
                            <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">
                                {{ t('me.changePassword.confirmPassword') }}
                            </label>
                            <input
                                id="confirm-password"
                                v-model="confirmPassword"
                                type="password"
                                autocomplete="new-password"
                                :placeholder="t('me.changePassword.confirmPasswordPlaceholder')"
                                class="w-full bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50"
                            />
                            <p v-if="confirmPassword.length > 0 && newPassword !== confirmPassword" class="mt-1 text-xs text-red-500">
                                {{ t('me.changePassword.passwordsMismatch') }}
                            </p>
                        </div>

                        <!-- Error message -->
                        <p v-if="passwordError" class="text-sm text-red-500">{{ passwordError }}</p>

                        <!-- Actions -->
                        <div class="flex gap-3 pt-2">
                            <button
                                type="button"
                                class="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                                @click="closePasswordModal"
                            >
                                {{ t('common.cancel') }}
                            </button>
                            <button
                                type="submit"
                                :disabled="!canSubmitPassword || passwordLoading"
                                class="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {{ t('me.changePassword.submit') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </transition>

    </section>
</template>

<style scoped>
/* ── Bento Grid ── */
.bento-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
    grid-template-areas:
        "profile"
        "email"
        "phone"
        "address"
        "password"
        "notifications"
        "language"
        "logout"
        "orders";
}

.bento-profile { grid-area: profile; }
.bento-email { grid-area: email; }
.bento-phone { grid-area: phone; }
.bento-address { grid-area: address; }
.bento-password { grid-area: password; }
.bento-notifications { grid-area: notifications; }
.bento-language { grid-area: language; }
.bento-logout { grid-area: logout; }
.bento-orders { grid-area: orders; }

/* Tablet: 2 cols */
@media (min-width: 640px) {
    .bento-grid {
        grid-template-columns: 1fr 1fr;
        grid-template-areas:
            "profile       profile"
            "email         phone"
            "address       password"
            "notifications language"
            "logout        logout"
            "orders        orders";
    }
}

/* Desktop: 3 cols, asymmetric */
@media (min-width: 1024px) {
    .bento-grid {
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-areas:
            "profile       email          phone"
            "profile       address        password"
            "notifications language        logout"
            "orders        orders         orders";
    }
}

/* ── Staggered entrance ── */
.bento-cell {
    animation: bento-enter 0.5s ease-out both;
    animation-delay: calc(var(--delay, 0) * 80ms);
    min-width: 0;
}

@keyframes bento-enter {
    from {
        opacity: 0;
        transform: translateY(16px) scale(0.97);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .bento-cell {
        animation: none;
    }
}

/* ── Modal transition ── */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
