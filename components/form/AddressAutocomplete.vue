<template>
    <form autocomplete="off">
        <!-- ADDRESS FIELD -->
        <div class="relative">
            <label class="block text-sm text-gray-700 mb-1" for="address">
                {{ $t('register.address') }}
            </label>
            <div class="relative">
                <input
                    id="address"
                    ref="addressInput"
                    v-model="addressQuery"
                    :placeholder="$t('register.addressPlaceholder')"
                    class="w-full h-10 px-3 pr-10 py-2 leading-5 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                    :disabled="Boolean(selectedAddress)"
                    @focus="onAddressFocus"
                    @blur="onAddressBlur"
                    @keydown.enter.prevent="selectFirstSuggestion"
                    @input="handleAddressInput"
                />
                <div class="absolute top-0 bottom-0 right-2 flex items-center gap-2">
                    <svg v-if="isLoadingAddress" class="w-5 h-5 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <svg v-if="selectedAddress && !isLoadingAddress" @mousedown.prevent="clearAddress" class="w-5 h-5 text-gray-500 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    <svg v-if="selectedAddress" class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </div>
            </div>
            <!-- Suggestions dropdown -->
            <ul
                v-show="isAddressFocused && !selectedAddress && suggestions.length > 0"
                role="listbox"
                class="absolute z-10 w-full bg-white border border-gray-200 shadow-lg max-h-60 overflow-auto rounded-md"
                @mousedown.prevent
            >
                <li
                    v-for="(suggestion, index) in suggestions"
                    :key="suggestion.placeId"
                    role="option"
                    class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    :class="{ 'bg-gray-50': highlightedIndex === index }"
                    @mousedown="selectSuggestion(suggestion)"
                >
                    <div class="font-medium text-sm text-gray-900">{{ suggestion.mainText }}</div>
                    <div class="text-xs text-gray-500 mt-0.5">{{ suggestion.secondaryText }}</div>
                </li>
            </ul>
        </div>
    </form>
</template>

<script lang="ts" setup>
import type { Address, AddressSuggestion } from '~/types'
import { computed, nextTick, ref, watch } from 'vue'
import { eventBus } from '~/eventBus'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from 'vue-i18n'
import { useNuxtApp } from '#imports'

const emit = defineEmits<{
    'update:address': [address: Address | null]
}>()
const { $gqlFetch } = useNuxtApp()
const { t } = useI18n()

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

// Session token for Google Places API
let sessionToken = generateSessionToken()

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null

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
        if (addressQuery.value.trim().length < 3) {
            suggestions.value = []
            return
        }

        try {
            const data: { autocompleteAddresses: AddressSuggestion[] } = await $gqlFetch(
                print(AUTOCOMPLETE_ADDRESSES),
                {
                    variables: {
                        input: addressQuery.value.trim(),
                        sessionToken,
                    }
                }
            )

            if (data.autocompleteAddresses) {
                suggestions.value = data.autocompleteAddresses
            }
        } catch (err) {
            if (import.meta.dev) console.error('Autocomplete failed:', err)
            eventBus.emit('notify', {
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
        eventBus.emit('notify', {
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
