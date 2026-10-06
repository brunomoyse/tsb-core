import type { Address, AddressSuggestion } from '#engine/types'
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import { reportError } from '#engine/utils/reportError'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useNuxtApp } from '#imports'

const AUTOCOMPLETE_ADDRESSES = /* GraphQL */ `
  query ($input: String!, $sessionToken: String!) {
    autocompleteAddresses(input: $input, sessionToken: $sessionToken) {
      placeId
      description
      mainText
      secondaryText
    }
  }
`

const RESOLVE_ADDRESS = /* GraphQL */ `
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

const hasHouseNumberInQuery = (input: string): boolean => /\d/u.test(input)

/*
 * Logic of the address field shared by both brands' <AddressAutocomplete> (markup stays per brand): the Google
 * Places session, debounced search, selection, and the ARIA 1.2 combobox pattern (audit A5): editable input
 * `role=combobox` + popup `role=listbox`, with focus staying in the input and the highlighted option exposed
 * through `aria-activedescendant`.
 *
 * Keys: Down/Up move the highlight (wrapping; Down reopens a list closed with Escape), Home/End jump to the
 * first/last option while one is highlighted (otherwise they move the text cursor), Enter picks the highlighted
 * option (or the first one), Escape closes the list (and only the list: it does not reach an enclosing dialog).
 */
export function useAddressAutocomplete(onUpdate: (address: Address | null) => void) {
  const { $gqlFetch } = useNuxtApp()
  const { t } = useI18n()
  const notifications = useNotificationsStore()

  const uid = useId()
  const inputId = `address-${uid}`
  const listboxId = `address-listbox-${uid}`
  const hintId = `address-hint-${uid}`
  const optionId = (index: number): string => `address-option-${uid}-${index}`

  const addressInput = ref<HTMLInputElement | null>(null)
  const addressQuery = ref('')
  const suggestions = ref<AddressSuggestion[]>([])
  const selectedAddress = ref<Address | null>(null)
  const isAddressFocused = ref(false)
  const isLoadingAddress = ref(false)
  const highlightedIndex = ref(-1)
  const hasSearched = ref(false)
  // Escape closes the list without discarding the suggestions; typing or Down brings it back.
  const isDismissed = ref(false)
  // Text of the screen-reader live region (number of suggestions, selection, clearing).
  const statusMessage = ref('')

  const isExpanded = computed(
    () =>
      isAddressFocused.value &&
      !selectedAddress.value &&
      !isDismissed.value &&
      suggestions.value.length > 0,
  )
  const activeDescendant = computed(() =>
    isExpanded.value && highlightedIndex.value >= 0 ? optionId(highlightedIndex.value) : undefined,
  )
  const showNoMatchHint = computed(
    () =>
      hasSearched.value &&
      !isLoadingAddress.value &&
      suggestions.value.length === 0 &&
      addressQuery.value.trim().length >= 3 &&
      !selectedAddress.value,
  )

  // Session token for the Places API: one per search-then-select, regenerated after a resolve or a reset.
  let sessionToken = crypto.randomUUID()
  const regenerateSessionToken = (): void => {
    sessionToken = crypto.randomUUID()
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let blurTimer: ReturnType<typeof setTimeout> | null = null
  // Only the latest search may write its results (a slow answer to an older query must not overwrite a newer one).
  let searchSeq = 0

  // A search still waiting in the debounce must not fire after the choice (or the clear): it would reopen suggestions for stale text.
  const cancelPendingSearch = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = null
  }

  onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (blurTimer) clearTimeout(blurTimer)
    searchSeq++
  })

  const scrollHighlightIntoView = async (): Promise<void> => {
    await nextTick()
    if (highlightedIndex.value >= 0)
      document
        .getElementById(optionId(highlightedIndex.value))
        ?.scrollIntoView({ block: 'nearest' })
  }

  const highlight = (index: number): void => {
    highlightedIndex.value = index
    void scrollHighlightIntoView()
  }

  // The pointer moving over an option highlights it too (no scrolling: the option is already under the pointer).
  const hover = (index: number): void => {
    highlightedIndex.value = index
  }

  const onFocus = (): void => {
    if (blurTimer) clearTimeout(blurTimer)
    isAddressFocused.value = true
  }

  const onBlur = (): void => {
    blurTimer = setTimeout(() => {
      isAddressFocused.value = false
      highlightedIndex.value = -1
    }, 100)
  }

  const onInput = (): void => {
    highlightedIndex.value = -1
    isDismissed.value = false
    cancelPendingSearch()

    const search = async () => {
      const query = addressQuery.value.trim()
      const seq = ++searchSeq

      if (query.length < 3 || !hasHouseNumberInQuery(query)) {
        suggestions.value = []
        hasSearched.value = false
        statusMessage.value = ''
        return
      }

      try {
        const data: { autocompleteAddresses: AddressSuggestion[] } = await $gqlFetch(
          AUTOCOMPLETE_ADDRESSES,
          { variables: { input: query, sessionToken } },
        )
        if (seq !== searchSeq) return

        suggestions.value = data.autocompleteAddresses ?? []
        hasSearched.value = true
        statusMessage.value =
          suggestions.value.length > 0
            ? t(
                'form.address.suggestions',
                { count: suggestions.value.length },
                suggestions.value.length,
              )
            : t('form.address.noMatch')
      } catch (err) {
        if (seq !== searchSeq) return
        reportError(err, 'address.autocomplete')
        notifications.notify({
          message: t('notify.errors.addressLookupFailed'),
          persistent: false,
          duration: 5000,
          variant: 'error',
        })
        suggestions.value = []
      }
    }
    debounceTimer = setTimeout(() => {
      void search()
    }, 250)
  }

  const selectSuggestion = async (suggestion: AddressSuggestion): Promise<void> => {
    if (isLoadingAddress.value) return
    cancelPendingSearch()
    isLoadingAddress.value = true
    try {
      const data: { resolveAddress: Address | null } = await $gqlFetch(RESOLVE_ADDRESS, {
        variables: { placeId: suggestion.placeId, sessionToken },
      })

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
        searchSeq++
        selectedAddress.value = data.resolveAddress
        addressQuery.value = suggestion.description
        suggestions.value = []
        highlightedIndex.value = -1
        isAddressFocused.value = false
        statusMessage.value = t('form.address.selected', { address: suggestion.description })
        onUpdate(selectedAddress.value)
        regenerateSessionToken()
      }
    } catch (err) {
      reportError(err, 'address.resolve')
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

  const onKeydown = (event: KeyboardEvent): void => {
    const count = suggestions.value.length
    switch (event.key) {
      case 'ArrowDown':
        if (selectedAddress.value || count === 0) return
        event.preventDefault()
        isDismissed.value = false
        highlight(highlightedIndex.value + 1 >= count ? 0 : highlightedIndex.value + 1)
        break
      case 'ArrowUp':
        if (selectedAddress.value || count === 0) return
        event.preventDefault()
        isDismissed.value = false
        highlight(highlightedIndex.value <= 0 ? count - 1 : highlightedIndex.value - 1)
        break
      case 'Home':
        if (!isExpanded.value || highlightedIndex.value < 0) return
        event.preventDefault()
        highlight(0)
        break
      case 'End':
        if (!isExpanded.value || highlightedIndex.value < 0) return
        event.preventDefault()
        highlight(count - 1)
        break
      case 'Enter':
        // Never submits an enclosing form; picks the highlighted option, else the first.
        event.preventDefault()
        if (!isExpanded.value) return
        void selectSuggestion(
          suggestions.value[highlightedIndex.value >= 0 ? highlightedIndex.value : 0]!,
        )
        break
      case 'Escape':
        if (!isExpanded.value) return
        // Only the list closes: an enclosing dialog must not react to this Escape.
        event.preventDefault()
        event.stopPropagation()
        isDismissed.value = true
        highlightedIndex.value = -1
        break
    }
  }

  const clearAddress = (): void => {
    selectedAddress.value = null
    addressQuery.value = ''
    suggestions.value = []
    isAddressFocused.value = true
    isDismissed.value = false
    highlightedIndex.value = -1
    hasSearched.value = false
    cancelPendingSearch()
    searchSeq++
    statusMessage.value = t('form.address.cleared')
    regenerateSessionToken()
    onUpdate(null)

    void nextTick(() => addressInput.value?.focus())
  }

  return {
    inputId,
    listboxId,
    hintId,
    optionId,
    addressInput,
    addressQuery,
    suggestions,
    selectedAddress,
    isLoadingAddress,
    highlightedIndex,
    isExpanded,
    activeDescendant,
    showNoMatchHint,
    statusMessage,
    onFocus,
    onBlur,
    onInput,
    onKeydown,
    selectSuggestion,
    clearAddress,
    hover,
  }
}
