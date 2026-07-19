<template>
    <form autocomplete="off">
        <!-- ADDRESS FIELD -->
        <div class="relative">
            <label class="field-label" for="address">
                {{ $t('form.address.label') }}
            </label>
            <div class="relative">
                <input
                    id="address"
                    ref="addressInput"
                    v-model="addressQuery"
                    :placeholder="$t('form.address.placeholder')"
                    class="field pr-10"
                    :disabled="Boolean(selectedAddress)"
                    @focus="onAddressFocus"
                    @blur="onAddressBlur"
                    @keydown.enter.prevent="selectFirstSuggestion"
                    @input="handleAddressInput"
                />
                <div class="absolute top-0 bottom-0 right-2 flex items-center gap-2">
                    <svg v-if="isLoadingAddress" class="w-5 h-5 animate-spin" :style="{ color: 'var(--ygf-gray-400)' }" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <svg v-if="selectedAddress && !isLoadingAddress" @mousedown.prevent="clearAddress" class="w-5 h-5 cursor-pointer" :style="{ color: 'var(--ygf-gray-600)' }" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    <svg v-if="selectedAddress" class="w-5 h-5" :style="{ color: 'var(--ygf-success)' }" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </div>
            </div>
            <!-- Suggestions dropdown -->
            <ul
                v-show="isAddressFocused && !selectedAddress && suggestions.length > 0"
                role="listbox"
                class="absolute z-10 w-full bg-ygf-white border shadow-md max-h-60 overflow-auto rounded-ygf-card"
                style="border-color: rgba(242, 123, 32, 0.12)"
                @mousedown.prevent
            >
                <li
                    v-for="(suggestion, index) in suggestions"
                    :key="suggestion.placeId"
                    role="option"
                    class="p-3 cursor-pointer transition-colors duration-200"
                    :class="{ 'bg-ygf-orange-light': highlightedIndex === index }"
                    style="border-bottom-color: rgba(242, 123, 32, 0.12)"
                    :style="{ borderBottomWidth: index < suggestions.length - 1 ? '1px' : '0' }"
                    @mousedown="selectSuggestion(suggestion)"
                    @mouseenter="highlightedIndex = index"
                >
                    <div class="font-medium text-sm text-ygf-black">{{ suggestion.mainText }}</div>
                    <div class="text-xs text-ygf-gray-600 mt-0.5">{{ suggestion.secondaryText }}</div>
                </li>
            </ul>
            <div
                v-if="!selectedAddress"
                class="mt-2 flex items-start gap-2 rounded-ygf-card border px-3 py-2 text-xs"
                :class="showNoMatchHint
                    ? 'text-ygf-orange-on-white'
                    : 'text-ygf-gray-600'"
                :style="showNoMatchHint
                    ? { 'border-color': 'rgba(242, 123, 32, 0.3)', 'background-color': 'rgba(242, 123, 32, 0.08)' }
                    : { 'border-color': 'rgba(242, 123, 32, 0.12)' }"
            >
                <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p v-if="showNoMatchHint">
                    <span class="font-semibold">{{ $t('form.address.noMatch') }}</span>
                    <span class="block mt-0.5 opacity-90">
                        {{ $t('form.address.callHint') }}
                        <a href="tel:+32422298888" class="underline font-medium whitespace-nowrap hover:opacity-80">+32 4 222 98 88</a>
                    </span>
                </p>
                <p v-else>
                    <span class="font-semibold">{{ $t('form.address.houseNumberRequired') }}</span>
                    <span class="block mt-0.5 opacity-90">{{ $t('form.address.example') }}</span>
                </p>
            </div>
        </div>
    </form>
</template>

<script lang="ts" setup>
import type { Address, AddressSuggestion } from '#engine/types'
import { computed, nextTick, ref, watch } from 'vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useNuxtApp } from '#imports'

const emit = defineEmits<{
    'update:address': [address: Address | null]
}>()
const { $gqlFetch } = useNuxtApp()
const { t } = useI18n()
const notifications = useNotificationsStore()

const AUTOCOMPLETE_ADDRESSES = gql`
    query ($input: String!, $sessionToken: String!) {
        autocompleteAddresses(input: $input, sessionToken: $sessionToken) {
            placeId
            description
            mainText
            secondaryText
        }
    }
`

const RESOLVE_ADDRESS = gql`
    query ($placeId: String!, $sessionToken: String!) {
        resolveAddress(placeId: $placeId, sessionToken: $sessionToken) {
            id
            postcode
            municipalityName
            streetName
            houseNumber
            boxNumber
            distance
            lat
            lng
            duration
        }
    }
`

// Reactive State
const addressInput = ref<HTMLInputElement | null>(null)
const addressQuery = ref('')
const suggestions = ref<AddressSuggestion[]>([])
const selectedAddress = ref<Address | null>(null)
const isAddressFocused = ref(false)
const isLoadingAddress = ref(false)
const highlightedIndex = ref(-1)
const hasSearched = ref(false)

const showNoMatchHint = computed(
    () => hasSearched.value
        && !isLoadingAddress.value
        && suggestions.value.length === 0
        && addressQuery.value.trim().length >= 3
        && !selectedAddress.value,
)

// Session token for Google Places API
let sessionToken = generateSessionToken()

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const hasHouseNumberInQuery = (input: string): boolean => /\d/u.test(input)

// Generate a UUID for session token
function generateSessionToken(): string {
    return crypto.randomUUID()
}

// Regenerate session token (after successful address resolve or reset)
function regenerateSessionToken(): void {
    sessionToken = generateSessionToken()
}

// Input handlers
const onAddressFocus = () => {
    isAddressFocused.value = true
}

const onAddressBlur = () => {
    setTimeout(() => {
        isAddressFocused.value = false
        highlightedIndex.value = -1
    }, 100)
}

const handleAddressInput = () => {
    highlightedIndex.value = -1
    if (debounceTimer) clearTimeout(debounceTimer)

    debounceTimer = setTimeout(async () => {
        const query = addressQuery.value.trim()

        if (query.length < 3 || !hasHouseNumberInQuery(query)) {
            suggestions.value = []
            hasSearched.value = false
            return
        }

        try {
            const data: { autocompleteAddresses: AddressSuggestion[] } = await $gqlFetch(
                print(AUTOCOMPLETE_ADDRESSES),
                {
                    variables: {
                        input: query,
                        sessionToken,
                    }
                }
            )

            suggestions.value = data.autocompleteAddresses ?? []
            hasSearched.value = true
        } catch (err) {
            if (import.meta.dev) console.error('Autocomplete failed:', err)
            notifications.notify({
                message: t('notify.errors.addressLookupFailed'),
                persistent: false,
                duration: 5000,
                variant: 'error',
            })
            suggestions.value = []
        }
    }, 250)
}

// Keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
    if (!isAddressFocused.value || suggestions.value.length === 0) return

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault()
            highlightedIndex.value = Math.min(highlightedIndex.value + 1, suggestions.value.length - 1)
            break
        case 'ArrowUp':
            event.preventDefault()
            highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
            break
        case 'Enter':
            event.preventDefault()
            if (highlightedIndex.value >= 0) {
                selectSuggestion(suggestions.value[highlightedIndex.value]!)
            }
            break
        case 'Escape':
            event.preventDefault()
            isAddressFocused.value = false
            break
    }
}

const selectFirstSuggestion = () => {
    if (suggestions.value.length > 0) {
        selectSuggestion(suggestions.value[0]!)
    }
}

const selectSuggestion = async (suggestion: AddressSuggestion) => {
    isLoadingAddress.value = true
    try {
        const data: { resolveAddress: Address } = await $gqlFetch(
            print(RESOLVE_ADDRESS),
            {
                variables: {
                    placeId: suggestion.placeId,
                    sessionToken,
                }
            }
        )

        if (data.resolveAddress) {
            if (!data.resolveAddress.houseNumber) {
                notifications.notify({
                    message: t('notify.errors.addressMissingHouseNumber'),
                    persistent: false,
                    duration: 5000,
                    variant: 'error',
                })
                regenerateSessionToken()
                return
            }
            selectedAddress.value = data.resolveAddress
            addressQuery.value = suggestion.description
            suggestions.value = []
            isAddressFocused.value = false
            emit('update:address', selectedAddress.value)
            // Regenerate session token for next use
            regenerateSessionToken()
        }
    } catch (err) {
        if (import.meta.dev) console.error('Resolve address failed:', err)
        notifications.notify({
            message: t('notify.errors.addressLookupFailed'),
            persistent: false,
            duration: 5000,
            variant: 'error',
        })
    } finally {
        isLoadingAddress.value = false
    }
}

const clearAddress = () => {
    selectedAddress.value = null
    addressQuery.value = ''
    suggestions.value = []
    isAddressFocused.value = true
    highlightedIndex.value = -1
    hasSearched.value = false
    regenerateSessionToken()
    emit('update:address', null)

    nextTick(() => {
        if (addressInput.value) {
            addressInput.value.focus()
        }
    })
}

// Watch for keyboard events
if (import.meta.client) {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
        if (addressInput.value && addressInput.value === document.activeElement) {
            handleKeyDown(event)
        }
    }

    if (process.client) {
        document.addEventListener('keydown', handleGlobalKeyDown)
    }
}
</script>
