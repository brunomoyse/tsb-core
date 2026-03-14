<script setup lang="ts">
import { eventBus } from '~/eventBus'

const { t } = useI18n()
const { $api } = useNuxtApp()

const name = ref('')
const email = ref('')
const serviceType = ref('')
const feedbackType = ref('')
const message = ref('')
const website = ref('') // Honeypot
const submitting = ref(false)
const submitted = ref(false)

const serviceTypes = ['takeaway', 'dine-in', 'delivery'] as const
const feedbackTypes = ['improvement', 'complaint', 'compliment'] as const

const canSubmit = computed(() =>
    name.value.trim().length > 0 &&
    email.value.trim().length > 0 &&
    serviceType.value !== '' &&
    feedbackType.value !== '' &&
    message.value.trim().length >= 10 &&
    !submitting.value
)

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
            },
        })
        submitted.value = true
    } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 429) {
            eventBus.emit('notify', { message: t('feedback.errorTooManyRequests'), variant: 'error', duration: 5000 })
        } else if (status === 400) {
            eventBus.emit('notify', { message: t('feedback.errorInvalidInput'), variant: 'error', duration: 5000 })
        } else {
            eventBus.emit('notify', { message: t('feedback.errorGeneric'), variant: 'error', duration: 5000 })
        }
    } finally {
        submitting.value = false
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
}
</script>

<template>
    <div class="bg-tsb-two rounded-2xl p-6 sm:p-7 h-full">
        <!-- Header -->
        <div class="flex items-start gap-4 mb-5">
            <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
                </svg>
            </div>
            <div>
                <h2 class="font-semibold text-gray-900 text-[15px]">{{ $t('feedback.title') }}</h2>
                <p class="text-sm text-gray-500 mt-0.5">{{ $t('feedback.subtitle') }}</p>
            </div>
        </div>

        <!-- Success state -->
        <div v-if="submitted" class="text-center py-8">
            <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
            </div>
            <p class="text-sm text-gray-700 leading-relaxed max-w-md mx-auto">{{ $t('feedback.success') }}</p>
            <button
                type="button"
                class="mt-4 text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-300"
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
                    <label for="feedback-name" class="block text-xs font-medium text-gray-600 mb-1.5">{{ $t('feedback.name') }}</label>
                    <input
                        id="feedback-name"
                        v-model="name"
                        type="text"
                        maxlength="100"
                        :placeholder="$t('feedback.namePlaceholder')"
                        class="w-full bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-red-400/50 focus:border-red-300"
                    />
                </div>
                <div>
                    <label for="feedback-email" class="block text-xs font-medium text-gray-600 mb-1.5">{{ $t('feedback.email') }}</label>
                    <input
                        id="feedback-email"
                        v-model="email"
                        type="email"
                        maxlength="255"
                        :placeholder="$t('feedback.emailPlaceholder')"
                        class="w-full bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-red-400/50 focus:border-red-300"
                    />
                </div>
            </div>

            <!-- Service type pills -->
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">{{ $t('feedback.serviceType') }}</label>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="st in serviceTypes"
                        :key="st"
                        type="button"
                        :class="[
                            'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 border',
                            serviceType === st
                                ? 'bg-tsb-four text-red-700 border-red-200'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-tsb-four/40'
                        ]"
                        @click="serviceType = st"
                    >
                        {{ $t(`feedback.serviceTypes.${st}`) }}
                    </button>
                </div>
            </div>

            <!-- Feedback type pills -->
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">{{ $t('feedback.feedbackType') }}</label>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="ft in feedbackTypes"
                        :key="ft"
                        type="button"
                        :class="[
                            'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 border',
                            feedbackType === ft
                                ? 'bg-tsb-four text-red-700 border-red-200'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-tsb-four/40'
                        ]"
                        @click="feedbackType = ft"
                    >
                        {{ $t(`feedback.feedbackTypes.${ft}`) }}
                    </button>
                </div>
            </div>

            <!-- Message textarea -->
            <div>
                <label for="feedback-message" class="block text-xs font-medium text-gray-600 mb-1.5">{{ $t('feedback.message') }}</label>
                <textarea
                    id="feedback-message"
                    v-model="message"
                    maxlength="2000"
                    rows="4"
                    :placeholder="$t('feedback.messagePlaceholder')"
                    class="w-full bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-red-400/50 focus:border-red-300 resize-none"
                />
                <p class="text-xs text-gray-400 text-right mt-1">{{ message.length }} / 2000</p>
            </div>

            <!-- Submit button -->
            <button
                type="submit"
                :disabled="!canSubmit"
                :class="[
                    'w-full sm:w-auto px-8 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300',
                    canSubmit
                        ? 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                ]"
            >
                {{ submitting ? $t('feedback.sending') : $t('feedback.submit') }}
            </button>
        </form>
    </div>
</template>
