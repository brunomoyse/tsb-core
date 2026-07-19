<script setup lang="ts">
import { useNotificationsStore } from '#engine/stores/notifications'

const { t } = useI18n()
const { $api } = useNuxtApp()
const notifications = useNotificationsStore()
const config = useRuntimeConfig()
const turnstileSiteKey = config.public.turnstileSiteKey as string

const name = ref('')
const email = ref('')
const serviceType = ref('')
const feedbackType = ref('')
const message = ref('')
const website = ref('') // Honeypot
const submitting = ref(false)
const submitted = ref(false)

// Turnstile
const turnstileToken = ref('')
const turnstileWidgetId = ref<string | null>(null)
const turnstileContainer = ref<HTMLElement | null>(null)

// Set placeholder callback before script injection to avoid race condition
// (script may load before onMounted runs)
if (import.meta.client && turnstileSiteKey) {
    window.onTurnstileLoaded = () => {}
}

if (turnstileSiteKey) {
    useHead({
        script: [{
            src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoaded',
            async: true,
            defer: true,
        }],
    })
}

onMounted(() => {
    if (!turnstileSiteKey) return

    const renderWidget = () => {
        if (window.turnstile && turnstileContainer.value) {
            turnstileWidgetId.value = window.turnstile.render(turnstileContainer.value, {
                sitekey: turnstileSiteKey,
                theme: 'light',
                callback: (token: string) => { turnstileToken.value = token },
                'expired-callback': () => { turnstileToken.value = '' },
                'error-callback': () => { turnstileToken.value = '' },
            })
        }
    }

    if (window.turnstile) {
        renderWidget()
    } else {
        window.onTurnstileLoaded = renderWidget
    }
})

onUnmounted(() => {
    if (turnstileWidgetId.value && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.value)
    }
    window.onTurnstileLoaded = undefined
})

const serviceTypes = ['takeaway', 'dine-in', 'delivery'] as const
const feedbackTypes = ['improvement', 'complaint', 'compliment'] as const

const canSubmit = computed(() =>
    name.value.trim().length > 0 &&
    email.value.trim().length > 0 &&
    serviceType.value !== '' &&
    feedbackType.value !== '' &&
    message.value.trim().length >= 10 &&
    (turnstileSiteKey === '' || turnstileToken.value !== '') &&
    !submitting.value
)

function resetTurnstile() {
    if (window.turnstile && turnstileWidgetId.value) {
        window.turnstile.reset(turnstileWidgetId.value)
    }
    turnstileToken.value = ''
}

async function handleSubmit() {
    if (!canSubmit.value) return

    submitting.value = true
    try {
        await $api('/feedback', {
            method: 'POST',
            body: {
                name: name.value.trim(),
                email: email.value.trim(),
                serviceType: serviceType.value,
                feedbackType: feedbackType.value,
                message: message.value.trim(),
                website: website.value,
                turnstileToken: turnstileToken.value,
            },
        })
        submitted.value = true
    } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status
        const errorCode = (error as { data?: { error?: string } })?.data?.error
        if (status === 429) {
            notifications.notify({ message: t('feedback.errorTooManyRequests'), variant: 'error', duration: 5000 })
        } else if (status === 400 && errorCode === 'captcha_failed') {
            notifications.notify({ message: t('feedback.errorCaptchaFailed'), variant: 'error', duration: 5000 })
        } else if (status === 400) {
            notifications.notify({ message: t('feedback.errorInvalidInput'), variant: 'error', duration: 5000 })
        } else {
            notifications.notify({ message: t('feedback.errorGeneric'), variant: 'error', duration: 5000 })
        }
    } finally {
        submitting.value = false
        resetTurnstile()
    }
}

function resetForm() {
    name.value = ''
    email.value = ''
    serviceType.value = ''
    feedbackType.value = ''
    message.value = ''
    website.value = ''
    submitted.value = false
    resetTurnstile()
}
</script>

<template>
    <div class="rounded-2xl p-6 sm:p-8 h-full" style="background-color: var(--ygf-white)">
        <!-- Header -->
        <div class="mb-5">
            <h2 class="font-semibold text-ygf-black mb-1 flex items-center gap-2 text-[15px]">
                <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" :style="{ color: 'var(--ygf-orange-on-white)' }"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>
                {{ $t('feedback.title') }}
            </h2>
            <p class="text-sm text-ygf-gray-600">{{ $t('feedback.subtitle') }}</p>
        </div>

        <!-- Success state -->
        <div v-if="submitted" class="text-center py-8">
            <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" :style="{ 'background-color': 'rgba(76, 175, 80, 0.15)' }">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color: var(--ygf-success)">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
            </div>
            <p class="text-sm text-ygf-gray-700 leading-relaxed max-w-md mx-auto">{{ $t('feedback.success') }}</p>
            <button
                type="button"
                class="mt-4 text-sm font-medium transition-opacity duration-300 hover:opacity-70"
                :style="{ 'color': 'var(--ygf-orange-on-white)' }"
                @click="resetForm"
            >
                {{ $t('feedback.sendAnother') }}
            </button>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Honeypot (hidden from real users) -->
            <div aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden;" tabindex="-1">
                <label for="website">Website</label>
                <input id="website" v-model="website" type="text" name="website" autocomplete="off" tabindex="-1" />
            </div>

            <!-- Name & Email row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="feedback-name" class="block text-xs font-medium text-ygf-gray-600 mb-1.5">{{ $t('feedback.name') }}</label>
                    <input
                        id="feedback-name"
                        v-model="name"
                        type="text"
                        maxlength="100"
                        :placeholder="$t('feedback.namePlaceholder')"
                        class="field text-sm"
                    />
                </div>
                <div>
                    <label for="feedback-email" class="block text-xs font-medium text-ygf-gray-600 mb-1.5">{{ $t('feedback.email') }}</label>
                    <input
                        id="feedback-email"
                        v-model="email"
                        type="email"
                        maxlength="255"
                        :placeholder="$t('feedback.emailPlaceholder')"
                        class="field text-sm"
                    />
                </div>
            </div>

            <!-- Service type pills -->
            <div>
                <label class="block text-xs font-medium text-ygf-gray-600 mb-2">{{ $t('feedback.serviceType') }}</label>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="st in serviceTypes"
                        :key="st"
                        type="button"
                        class="px-4 py-2 rounded-ygf-card text-sm font-medium transition-all duration-300 border"
                        :style="serviceType === st
                            ? { 'background-color': 'rgba(242, 123, 32, 0.12)', 'color': 'var(--ygf-orange-on-white)', 'border-color': 'rgba(242, 123, 32, 0.3)' }
                            : { 'background-color': 'var(--ygf-white)', 'color': 'var(--ygf-gray-600)', 'border-color': 'rgba(242, 123, 32, 0.12)' }"
                        @click="serviceType = st"
                    >
                        {{ $t(`feedback.serviceTypes.${st}`) }}
                    </button>
                </div>
            </div>

            <!-- Feedback type pills -->
            <div>
                <label class="block text-xs font-medium text-ygf-gray-600 mb-2">{{ $t('feedback.feedbackType') }}</label>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="ft in feedbackTypes"
                        :key="ft"
                        type="button"
                        class="px-4 py-2 rounded-ygf-card text-sm font-medium transition-all duration-300 border"
                        :style="feedbackType === ft
                            ? { 'background-color': 'rgba(242, 123, 32, 0.12)', 'color': 'var(--ygf-orange-on-white)', 'border-color': 'rgba(242, 123, 32, 0.3)' }
                            : { 'background-color': 'var(--ygf-white)', 'color': 'var(--ygf-gray-600)', 'border-color': 'rgba(242, 123, 32, 0.12)' }"
                        @click="feedbackType = ft"
                    >
                        {{ $t(`feedback.feedbackTypes.${ft}`) }}
                    </button>
                </div>
            </div>

            <!-- Message textarea -->
            <div>
                <label for="feedback-message" class="block text-xs font-medium text-ygf-gray-600 mb-1.5">{{ $t('feedback.message') }}</label>
                <textarea
                    id="feedback-message"
                    v-model="message"
                    maxlength="2000"
                    rows="4"
                    :placeholder="$t('feedback.messagePlaceholder')"
                    class="field text-sm resize-none"
                />
                <p class="text-xs text-ygf-gray-500 text-right mt-1">{{ message.length }} / 2000</p>
            </div>

            <!-- Turnstile widget -->
            <div v-if="turnstileSiteKey" ref="turnstileContainer" />

            <!-- Submit button -->
            <button
                type="submit"
                :disabled="!canSubmit"
                class="btn w-full sm:w-auto px-8"
                :class="canSubmit ? 'btn-primary' : 'btn-disabled'"
            >
                {{ submitting ? $t('feedback.sending') : $t('feedback.submit') }}
            </button>
        </form>
    </div>
</template>
