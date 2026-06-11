<script lang="ts" setup>
import type { Address, UpdateUserRequest, User } from '@/types'
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useGqlMutation, useGqlQuery, useNuxtApp, useSwitchLocalePath } from '#imports'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import { EUROPEAN_COUNTRIES } from '~/utils/europeanCountries'
import OrdersWidget from '~/components/me/OrdersWidget.vue'
import UserForm from '~/components/form/UserForm.vue'
import { formatAddress } from '~/utils/utils'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useAuthStore } from '@/stores/auth'
import { useFocusTrap } from '~/composables/useFocusTrap'
import { useNotificationsStore } from '~/stores/notifications'
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
const notifications = useNotificationsStore()
const { $gqlFetch } = useNuxtApp()
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
const DELETE_ME = gql`
    mutation {
        deleteMe
    }
`
const { mutate: mutationUpdateMe } = useGqlMutation<{ updateMe: User }>(UPDATE_ME)
const { mutate: mutationDeleteMe } = useGqlMutation<{ deleteMe: boolean }>(DELETE_ME)

/*
 * Soft guard: warn before deletion when an order is still in progress. Deletion
 * is never blocked (App Store 5.1.1(v)); the order keeps its denormalized data
 * and is fulfilled regardless, but the customer loses tracking once anonymized.
 */
const ACTIVE_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'AWAITING_PICK_UP', 'OUT_FOR_DELIVERY']
const MY_ACTIVE_ORDERS = print(gql`
    query {
        myOrders(first: 5) {
            id
            status
        }
    }
`)
const { data: activeOrdersData } = await useGqlQuery<{ myOrders: { id: string, status: string }[] }>(
    MY_ACTIVE_ORDERS, {}, { server: false },
)
const hasActiveOrder = computed(() =>
    (activeOrdersData.value?.myOrders ?? []).some(o => ACTIVE_ORDER_STATUSES.includes(o.status)),
)

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

const countries = EUROPEAN_COUNTRIES

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
        notifications.notify({
            message: t('me.profile.updateSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
    } catch (error) {
        if (import.meta.dev) console.error('Error during profile update:', error)
        notifications.notify({
            message: t('notify.errors.profileUpdateFailed'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
        return
    }
    closeModal()
}

// ── Account deletion (immediate, in-app — App Store 5.1.1(v) / GDPR) ──

const showDeleteModal = ref(false)
const deleteModalRef = ref<HTMLElement | null>(null)
useFocusTrap(deleteModalRef)
const deleting = ref(false)

// GitHub-style "type to confirm" guard: the user must retype their email.
const confirmText = ref('')
const canDelete = computed(() => {
    const email = (authStore.user?.email ?? '').trim().toLowerCase()
    return email.length > 0 && confirmText.value.trim().toLowerCase() === email
})

const openDeleteModal = () => {
    confirmText.value = ''
    showDeleteModal.value = true
}
const closeDeleteModal = () => {
    if (deleting.value) return
    confirmText.value = ''
    showDeleteModal.value = false
}

const handleDeleteAccount = async () => {
    if (deleting.value || !canDelete.value) return
    deleting.value = true
    try {
        // Run the mutation while still authenticated, then force-logout.
        // The access token stays cryptographically valid, so we must clear it locally.
        await mutationDeleteMe()
        trackEvent('account_deleted')
        await authStore.deleteAccountSession()
        notifications.notify({
            message: t('me.profile.deleteSuccess'),
            persistent: false,
            duration: 4000,
            variant: 'success',
        })
        await navigateTo(localePath('/'))
    } catch (error) {
        if (import.meta.dev) console.error('Error deleting account:', error)
        deleting.value = false
        notifications.notify({
            message: t('me.profile.deleteError'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
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
        notifications.notify({
            message: t('me.profile.addressUpdateSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
        closeAddressModal()
    } catch (error) {
        if (import.meta.dev) console.error('Error updating address:', error)
        notifications.notify({
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
        notifications.notify({
            message: t('me.notifications.updateSuccess'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
    } catch {
        notifications.notify({
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
                        class="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-gray-500 hover:text-red-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
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
                        class="inline-flex min-h-11 items-center text-sm text-gray-900 mt-1 hover:text-red-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded-md"
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
                        class="mt-2 min-h-11 text-sm text-red-500 hover:text-red-600 transition text-left rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        @click="openAddressModal"
                    >
                        {{ authStore.user?.address ? t('me.profile.editAddress') : t('me.profile.addAddress') }}
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
                                    class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                    :class="notifyMarketing ? 'translate-x-6' : 'translate-x-1'"
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
                                    class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                    :class="notifyOrderUpdates ? 'translate-x-6' : 'translate-x-1'"
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
                                'inline-flex min-h-11 items-center justify-center px-3 py-1.5 text-sm rounded-full transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300',
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
            <div class="bento-logout bento-cell self-start" style="--delay: 9">
                <button
                    type="button"
                    class="bg-tsb-two rounded-2xl p-6 w-full flex flex-col text-left hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
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
                type="button"
                class="inline-flex min-h-11 items-center text-xs text-gray-400 hover:text-red-500 transition rounded-md px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                @click="openDeleteModal"
            >
                {{ t('me.profile.deleteAccount') }}
            </button>
        </div>

        <!-- Delete Account Confirmation Modal -->
        <transition name="fade">
            <div
                v-if="showDeleteModal"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="closeDeleteModal"
            >
                <div
                    ref="deleteModalRef"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-account-title"
                    class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4"
                    @click.stop
                    @keydown.esc="closeDeleteModal"
                >
                    <h3 id="delete-account-title" class="text-xl font-semibold text-gray-900 text-center mb-3">
                        {{ t('me.profile.deleteConfirmTitle') }}
                    </h3>
                    <p class="text-sm text-gray-600 text-center mb-4">
                        {{ t('me.profile.deleteConfirmBody') }}
                    </p>

                    <!-- Soft warning when an order is still in progress (deletion not blocked) -->
                    <div
                        v-if="hasActiveOrder"
                        class="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                    >
                        <span aria-hidden="true">⚠️</span>
                        <span>{{ t('me.profile.deleteActiveOrderWarning') }}</span>
                    </div>

                    <!-- What happens: PII anonymized, orders retained for accounting law -->
                    <div class="mb-5 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600 space-y-2">
                        <p class="flex gap-2">
                            <span aria-hidden="true">🗑️</span>
                            <span>{{ t('me.profile.deleteAnonymizeNote') }}</span>
                        </p>
                        <p class="flex gap-2">
                            <span aria-hidden="true">📄</span>
                            <span>{{ t('me.profile.deleteOrdersNote') }}</span>
                        </p>
                    </div>

                    <!-- GitHub-style type-to-confirm -->
                    <label for="delete-confirm-input" class="block text-sm text-gray-600 mb-2">
                        {{ t('me.profile.deleteConfirmPrompt') }}
                    </label>
                    <p class="mb-2 select-all break-all rounded-md bg-gray-100 px-3 py-2 text-center font-mono text-sm text-gray-900">
                        {{ authStore.user?.email }}
                    </p>
                    <input
                        id="delete-confirm-input"
                        v-model="confirmText"
                        type="email"
                        inputmode="email"
                        autocomplete="off"
                        autocapitalize="none"
                        spellcheck="false"
                        :placeholder="t('me.profile.deleteConfirmPlaceholder')"
                        class="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                        @keydown.enter.prevent="canDelete && handleDeleteAccount()"
                    >

                    <p class="text-center mb-5">
                        <NuxtLinkLocale
                            to="/account-deletion"
                            class="text-xs text-gray-400 underline hover:text-gray-600 transition"
                        >
                            {{ t('me.profile.deleteLearnMore') }}
                        </NuxtLinkLocale>
                    </p>
                    <div class="flex gap-3">
                        <button
                            type="button"
                            :disabled="deleting"
                            class="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                            @click="closeDeleteModal"
                        >
                            {{ t('me.profile.deleteCancel') }}
                        </button>
                        <button
                            type="button"
                            :disabled="deleting || !canDelete"
                            class="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-white hover:bg-red-700 transition-colors font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            @click="handleDeleteAccount"
                        >
                            {{ deleting ? t('me.profile.deleting') : t('me.profile.deleteConfirmCta') }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>

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
                    <UserForm :initialValues="userInitialValues" @submit="submitProfileUpdate" @close="closeModal" />
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
                            class="flex-1 min-h-11 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                            @click="closeAddressModal"
                        >
                            {{ t('common.cancel') }}
                        </button>
                        <button
                            type="button"
                            :disabled="!pendingAddress?.id || addressLoading"
                            class="flex-1 min-h-11 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            @click="submitAddressUpdate"
                        >
                            {{ t('common.save') }}
                        </button>
                    </div>
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
        "notifications"
        "language"
        "logout"
        "orders";
}

.bento-profile { grid-area: profile; }
.bento-email { grid-area: email; }
.bento-phone { grid-area: phone; }
.bento-address { grid-area: address; }
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
            "address       notifications"
            "language      logout"
            "orders        orders";
    }
}

/* Desktop: 3 cols, asymmetric */
@media (min-width: 1024px) {
    .bento-grid {
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-areas:
            "profile       email          phone"
            "profile       address        notifications"
            "language      logout         logout"
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
