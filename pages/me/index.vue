<script lang="ts" setup>
import type { Address, UpdateUserRequest, User } from '@/types'
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useGqlMutation } from '#imports'
import OrdersWidget from '~/components/me/OrdersWidget.vue'
import UserForm from '~/components/form/UserForm.vue'
import { eventBus } from '~/eventBus'
import { formatAddress } from '~/utils/utils'
import gql from 'graphql-tag'
import { useAuthStore } from '@/stores/auth'
import { useFocusTrap } from '~/composables/useFocusTrap'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: false })

const { t } = useI18n()
const authStore = useAuthStore()
const { trackEvent, optIn, optOut, hasOptedIn } = useTracking()

const analyticsEnabled = ref(false)
onMounted(() => {
    analyticsEnabled.value = hasOptedIn()
})
const toggleAnalytics = () => {
    if (analyticsEnabled.value) {
        optOut()
        analyticsEnabled.value = false
    } else {
        optIn()
        analyticsEnabled.value = true
    }
}

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

// ── Profile edit logic (absorbed from ProfileWidget) ──

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
        console.error('Error during profile update:', error)
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

<template>
    <section class="max-w-5xl mx-auto pt-6 sm:pt-8 pb-8 px-4 sm:px-6">

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
                    <span class="text-sm text-gray-900 mt-1">
                        {{ authStore.user?.address ? formatAddress(authStore.user.address) : '–' }}
                    </span>
                </div>
            </div>

            <!-- Analytics toggle cell -->
            <div class="bento-analytics bento-cell" style="--delay: 5">
                <div class="bg-tsb-two rounded-2xl p-6 h-full flex flex-col">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-3">
                        <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
                        </svg>
                    </div>
                    <span class="text-xs text-gray-500 uppercase tracking-wider">{{ t('me.analytics.title') }}</span>
                    <div class="flex items-center gap-3 mt-2">
                        <button
                            type="button"
                            role="switch"
                            :aria-checked="analyticsEnabled"
                            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                            :class="analyticsEnabled ? 'bg-red-400' : 'bg-gray-200'"
                            @click="toggleAnalytics"
                        >
                            <span
                                class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                :class="analyticsEnabled ? 'translate-x-5' : 'translate-x-0'"
                            />
                        </button>
                        <span class="text-sm text-gray-700">
                            {{ analyticsEnabled ? t('me.analytics.enabled') : t('me.analytics.disabled') }}
                        </span>
                    </div>
                    <p class="text-xs text-gray-400 mt-2">{{ t('me.analytics.description') }}</p>
                </div>
            </div>

            <!-- Orders — hero cell -->
            <div class="bento-orders bento-cell" style="--delay: 6">
                <OrdersWidget />
            </div>

        </div>

        <!-- Account deletion — subtle, outside the grid -->
        <div class="mt-8 text-center bento-cell" style="--delay: 7">
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
        "analytics"
        "orders";
}

.bento-profile { grid-area: profile; }
.bento-email { grid-area: email; }
.bento-phone { grid-area: phone; }
.bento-address { grid-area: address; }
.bento-analytics { grid-area: analytics; }
.bento-orders { grid-area: orders; }

/* Tablet: 2 cols */
@media (min-width: 640px) {
    .bento-grid {
        grid-template-columns: 1fr 1fr;
        grid-template-areas:
            "profile   profile"
            "email     phone"
            "address   analytics"
            "orders    orders";
    }
}

/* Desktop: 3 cols, asymmetric */
@media (min-width: 1024px) {
    .bento-grid {
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-areas:
            "profile email     phone"
            "profile address   analytics"
            "orders  orders    orders";
    }
}

/* ── Staggered entrance ── */
.bento-cell {
    animation: bento-enter 0.5s ease-out both;
    animation-delay: calc(var(--delay, 0) * 80ms);
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
