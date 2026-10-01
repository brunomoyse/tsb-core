<template>
    <section
        id="checkout-phone-capture"
        tabindex="-1"
        class="rounded-lg border p-4 shadow-sm"
        :class="isCollapsed
            ? 'bg-white border-neutral-200'
            : 'bg-amber-50/70 border-amber-200'"
    >
        <div class="flex items-start gap-3">
            <svg class="w-5 h-5 mt-0.5 shrink-0" :class="isCollapsed ? 'text-neutral-600' : 'text-amber-700'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path v-if="isCollapsed" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.5 5.5l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
            </svg>
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold" :class="isCollapsed ? 'text-neutral-900' : 'text-amber-800'">
                    {{ $t('checkout.phoneCapture.title') }}
                </h3>
                <p v-if="isCollapsed" class="text-xs mt-0.5 text-neutral-600 tabular-nums">
                    {{ savedNumber }}
                </p>
                <p v-else class="text-xs mt-0.5 text-amber-800">
                    {{ $t('checkout.phoneCapture.description') }}
                </p>
            </div>
            <button
                v-if="isCollapsed"
                type="button"
                :aria-label="$t('checkout.phoneCapture.editAria')"
                class="min-h-11 min-w-11 inline-flex items-center justify-center px-3 -mr-2 text-sm font-medium text-ygf-orange-text hover:text-primary-900 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:outline-none transition-colors"
                @click="startEditing"
            >
                {{ $t('checkout.phoneCapture.edit') }}
            </button>
        </div>

        <form v-if="!isCollapsed" class="mt-3" novalidate @submit.prevent="submit">
            <div class="flex items-stretch gap-2">
                <div class="relative flex-1 min-w-0">
                    <input
                        id="checkout-phone-input"
                        ref="phoneInputRef"
                        v-model="phoneLocal"
                        type="tel"
                        autocomplete="tel"
                        inputmode="tel"
                        data-testid="checkout-phone-input"
                        :placeholder="$t('form.phonePlaceholder')"
                        :aria-label="$t('form.phone')"
                        :aria-invalid="phoneError ? 'true' : undefined"
                        :aria-describedby="phoneError ? 'checkout-phone-error' : undefined"
                        class="w-full px-3 py-2.5 pr-9 bg-white border border-neutral-200 rounded-xl text-base sm:text-sm text-neutral-900 placeholder-neutral-600 tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring focus-visible:outline-none transition-all duration-300"
                        @input="onInput"
                        @blur="onBlur"
                    />
                    <span v-if="loading" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-neutral-300 border-t-primary-500 rounded-full animate-spin" />
                </div>
                <button
                    v-if="saved"
                    type="button"
                    data-testid="checkout-phone-cancel"
                    :disabled="loading"
                    class="min-h-11 shrink-0 px-3 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                    @click="cancelEditing"
                >
                    {{ $t('common.cancel') }}
                </button>
                <button
                    type="submit"
                    data-testid="checkout-phone-save"
                    :disabled="loading"
                    class="min-h-11 shrink-0 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 disabled:cursor-wait"
                >
                    {{ $t('common.save') }}
                </button>
            </div>
        </form>

        <p v-if="phoneError" id="checkout-phone-error" role="alert" class="text-xs text-red-700 mt-2">{{ phoneError }}</p>
    </section>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { usePhoneCapture } from '#engine/composables/usePhoneCapture'

// The logic (validate on blur / Enter / Save, never while typing) lives in the engine, shared by both brands.
const phoneInputRef = ref<HTMLInputElement | null>(null)
const {
    phoneLocal,
    phoneError,
    loading,
    isCollapsed,
    saved,
    savedNumber,
    startEditing,
    cancelEditing,
    onInput,
    onBlur,
    submit,
} = usePhoneCapture(phoneInputRef)
</script>
