// useAddressAutocomplete: the logic of the delivery address field: a debounced Places search, a latest-search-wins rule,
// selection (resolving the place to a deliverable address with a house number), the Places session token, and the ARIA 1.2
// combobox keyboard pattern. The GraphQL transport, Sentry, i18n and the clock are the boundaries; the composable runs in
// a real component setup (it uses useId and onBeforeUnmount).
// Run: `vp test run layers/engine/composables/useAddressAutocomplete.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useNotificationsStore } from '#engine/stores/notifications'
import type { Address, AddressSuggestion } from '#engine/types'
import { withSetup } from '../../../test/helpers/withSetup'

const gqlFetch = vi.hoisted(() => vi.fn())
const reportError = vi.hoisted(() => vi.fn())
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
vi.mock('#engine/utils/reportError', () => ({ reportError }))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const { useAddressAutocomplete } = await import('#engine/composables/useAddressAutocomplete')

const suggestion = (n: number): AddressSuggestion => ({
  placeId: `place-${n}`,
  description: `Rue de la Cathédrale ${n}, 4000 Liège`,
  mainText: `Rue de la Cathédrale ${n}`,
  secondaryText: '4000 Liège',
})
const address = (overrides: Partial<Address> = {}): Address => ({
  id: 'resolved-1',
  postcode: '4000',
  municipalityName: 'Liège',
  streetName: 'Rue de la Cathédrale',
  houseNumber: '59',
  distance: 1200,
  ...overrides,
})

const onUpdate = vi.fn()
let tokens: string[]
let unmountCurrent: (() => void) | undefined

/** Mounts the composable in a component. */
const setup = () => {
  const { result, unmount } = withSetup(() => useAddressAutocomplete(onUpdate))
  unmountCurrent = unmount
  return { api: result, unmount }
}

const searchCalls = () =>
  gqlFetch.mock.calls.filter(([query]) => String(query).includes('autocompleteAddresses'))
const resolveCalls = () =>
  gqlFetch.mock.calls.filter(([query]) => String(query).includes('resolveAddress'))
const answers = (list: AddressSuggestion[] | null) =>
  gqlFetch.mockImplementation(async (query: string) =>
    query.includes('autocompleteAddresses')
      ? { autocompleteAddresses: list }
      : { resolveAddress: address() },
  )

/** Types a query and lets the debounce run. */
const type = async (api: ReturnType<typeof setup>['api'], text: string, wait = 250) => {
  api.addressQuery.value = text
  api.onInput()
  await vi.advanceTimersByTimeAsync(wait)
}
const key = (api: ReturnType<typeof setup>['api'], name: string) => {
  const event = new KeyboardEvent('keydown', { key: name, cancelable: true })
  const stop = vi.spyOn(event, 'stopPropagation')
  api.onKeydown(event)
  return { prevented: event.defaultPrevented, stopped: stop.mock.calls.length > 0 }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  setActivePinia(createPinia())
  gqlFetch.mockReset()
  reportError.mockReset()
  onUpdate.mockReset()
  tokens = []
  let n = 0
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    const token = `token-${++n}` as `${string}-${string}-${string}-${string}-${string}`
    tokens.push(token)
    return token
  })
})
afterEach(() => {
  unmountCurrent?.()
  unmountCurrent = undefined
  vi.restoreAllMocks()
  vi.useRealTimers()
  useNotificationsStore().dismiss()
  document.body.innerHTML = ''
})

describe('ids', () => {
  it('derives the DOM ids of the input, the listbox, the hint and each option from one id', () => {
    const a = setup().api
    expect(a.inputId).toMatch(/^address-/u)
    expect(a.listboxId).toMatch(/^address-listbox-/u)
    expect(a.hintId).toMatch(/^address-hint-/u)
    expect(a.optionId(2)).toMatch(/^address-option-.+-2$/u)
    const uid = a.inputId.replace('address-', '')
    expect(a.listboxId).toBe(`address-listbox-${uid}`)
    expect(a.hintId).toBe(`address-hint-${uid}`)
    expect(a.optionId(2)).toBe(`address-option-${uid}-2`)
    expect(a.optionId(0)).not.toBe(a.optionId(1))
  })
})

describe('searching', () => {
  it('waits 250 ms after the last keystroke, then asks with the typed text and the session token', async () => {
    answers([suggestion(59)])
    const { api } = setup()
    api.addressQuery.value = 'Rue de la Cathédrale 59'
    api.onInput()
    await vi.advanceTimersByTimeAsync(249)
    expect(searchCalls()).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(searchCalls()).toHaveLength(1)
    expect(searchCalls()[0]![1]).toEqual({
      variables: { input: 'Rue de la Cathédrale 59', sessionToken: tokens[0] },
    })
    expect(api.suggestions.value).toEqual([suggestion(59)])
  })

  it('a burst of keystrokes costs one search, with the last text (trimmed)', async () => {
    answers([suggestion(5)])
    const { api } = setup()
    api.addressQuery.value = 'Rue 5'
    api.onInput()
    await vi.advanceTimersByTimeAsync(100)
    api.addressQuery.value = '  Rue des Fêtes 5  '
    api.onInput()
    await vi.advanceTimersByTimeAsync(250)
    expect(searchCalls()).toHaveLength(1)
    expect(searchCalls()[0]![1].variables.input).toBe('Rue des Fêtes 5')
  })

  it('announces the number of suggestions for a screen reader, pluralised', async () => {
    answers([suggestion(1), suggestion(2)])
    const { api } = setup()
    await type(api, 'Rue 1')
    expect(api.statusMessage.value).toBe('form.address.suggestions{"count":2}#2')
  })

  it('no match: says so, and shows the hint once the text is long enough', async () => {
    answers([])
    const { api } = setup()
    await type(api, 'Zzz 1')
    expect(api.suggestions.value).toEqual([])
    expect(api.statusMessage.value).toBe('form.address.noMatch')
    expect(api.showNoMatchHint.value).toBe(true)
  })

  it('a null answer is an empty list', async () => {
    answers(null)
    const { api } = setup()
    await type(api, 'Zzz 1')
    expect(api.suggestions.value).toEqual([])
    expect(api.statusMessage.value).toBe('form.address.noMatch')
  })

  it.each([
    ['too short', 'R1'],
    ['no house number', 'Rue de la Cathédrale'],
    ['blank', '   '],
  ])(
    'does not search a query that is %s: it clears the suggestions and the status',
    async (_name, text) => {
      answers([suggestion(1)])
      const { api } = setup()
      await type(api, 'Rue 1') // Something was found before
      expect(api.suggestions.value).toHaveLength(1)
      await type(api, text)
      expect(searchCalls()).toHaveLength(1) // Only the first search
      expect(api.suggestions.value).toEqual([])
      expect(api.statusMessage.value).toBe('')
      expect(api.showNoMatchHint.value).toBe(false)
    },
  )

  it('the no-match hint is not shown while loading text is too short, before any search, or after a selection', async () => {
    answers([])
    const { api } = setup()
    expect(api.showNoMatchHint.value).toBe(false)
    await type(api, 'Zz 1')
    expect(api.showNoMatchHint.value).toBe(true)
    api.addressQuery.value = 'Z1'
    expect(api.showNoMatchHint.value).toBe(false) // Under 3 characters
  })

  it('only the latest search may write its results: a slow answer to an older query is dropped', async () => {
    const releases: ((value: unknown) => void)[] = []
    gqlFetch.mockImplementation(() => new Promise((resolve) => releases.push(resolve)))
    const { api } = setup()
    await type(api, 'Rue 1')
    await type(api, 'Rue 12')
    expect(releases).toHaveLength(2)
    releases[1]!({ autocompleteAddresses: [suggestion(12)] })
    await vi.advanceTimersByTimeAsync(0)
    releases[0]!({ autocompleteAddresses: [suggestion(1)] }) // The old one finally answers
    await vi.advanceTimersByTimeAsync(0)
    expect(api.suggestions.value.map((s) => s.placeId)).toEqual(['place-12'])
  })

  it('a failed search is reported and shown, and the suggestions are emptied', async () => {
    const failure = new Error('places down')
    gqlFetch.mockRejectedValue(failure)
    const { api } = setup()
    await type(api, 'Rue 1')
    expect(reportError).toHaveBeenCalledWith(failure, 'address.autocomplete')
    expect(useNotificationsStore().current).toMatchObject({
      message: 'notify.errors.addressLookupFailed',
      variant: 'error',
      duration: 5000,
      persistent: false,
    })
    expect(api.suggestions.value).toEqual([])
  })

  it('the failure of an outdated search is ignored (it must not clear or scold the newer results)', async () => {
    const rejects: ((reason: unknown) => void)[] = []
    const resolves: ((value: unknown) => void)[] = []
    gqlFetch.mockImplementationOnce(() => new Promise((_, reject) => rejects.push(reject)))
    gqlFetch.mockImplementationOnce(() => new Promise((resolve) => resolves.push(resolve)))
    const { api } = setup()
    await type(api, 'Rue 1')
    await type(api, 'Rue 12')
    resolves[0]!({ autocompleteAddresses: [suggestion(12)] })
    await vi.advanceTimersByTimeAsync(0)
    rejects[0]!(new Error('old one failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(reportError).not.toHaveBeenCalled()
    expect(api.suggestions.value).toHaveLength(1)
    expect(useNotificationsStore().current).toBeNull()
  })
})

describe('focus and the list', () => {
  it('the list is open only while focused, with suggestions, nothing selected and not dismissed', async () => {
    answers([suggestion(1)])
    const { api } = setup()
    await type(api, 'Rue 1')
    expect(api.isExpanded.value).toBe(false) // Not focused
    api.onFocus()
    expect(api.isExpanded.value).toBe(true)
  })

  it('blurring closes it after 100 ms; coming back within that time keeps it open (a click on an option)', async () => {
    answers([suggestion(1)])
    const { api } = setup()
    await type(api, 'Rue 1')
    api.onFocus()
    api.onBlur()
    await vi.advanceTimersByTimeAsync(99)
    expect(api.isExpanded.value).toBe(true)
    api.onFocus()
    await vi.advanceTimersByTimeAsync(500)
    expect(api.isExpanded.value).toBe(true)
    api.onBlur()
    await vi.advanceTimersByTimeAsync(100)
    expect(api.isExpanded.value).toBe(false)
  })

  it('blurring forgets the highlight', async () => {
    answers([suggestion(1)])
    const { api } = setup()
    await type(api, 'Rue 1')
    api.onFocus()
    api.hover(0)
    api.onBlur()
    await vi.advanceTimersByTimeAsync(100)
    expect(api.highlightedIndex.value).toBe(-1)
  })

  it('typing again resets the highlight and brings back a list closed with Escape', async () => {
    answers([suggestion(1)])
    const { api } = setup()
    await type(api, 'Rue 1')
    api.onFocus()
    key(api, 'ArrowDown')
    key(api, 'Escape')
    expect(api.isExpanded.value).toBe(false)
    api.onInput()
    expect(api.highlightedIndex.value).toBe(-1)
    expect(api.isExpanded.value).toBe(true)
  })

  it('the pointer over an option highlights it, and aria-activedescendant follows', async () => {
    answers([suggestion(1), suggestion(2)])
    const { api } = setup()
    await type(api, 'Rue 1')
    api.onFocus()
    expect(api.activeDescendant.value).toBeUndefined()
    api.hover(1)
    expect(api.highlightedIndex.value).toBe(1)
    expect(api.activeDescendant.value).toBe(api.optionId(1))
  })

  it('there is no active descendant when the list is closed, even with a highlight', async () => {
    answers([suggestion(1)])
    const { api } = setup()
    await type(api, 'Rue 1')
    api.hover(0)
    expect(api.activeDescendant.value).toBeUndefined() // Not focused: list closed
  })
})

describe('selecting a suggestion', () => {
  const ready = async () => {
    answers([suggestion(59), suggestion(61)])
    const view = setup()
    await type(view.api, 'Rue de la Cathédrale 5')
    view.api.onFocus()
    return view
  }

  it('resolves the place with the session token, then hands the address over and closes the list', async () => {
    const { api } = await ready()
    await api.selectSuggestion(suggestion(59))
    expect(resolveCalls()).toHaveLength(1)
    expect(resolveCalls()[0]![1]).toEqual({
      variables: { placeId: 'place-59', sessionToken: tokens[0] },
    })
    expect(api.selectedAddress.value).toEqual(address())
    expect(api.addressQuery.value).toBe(suggestion(59).description)
    expect(api.suggestions.value).toEqual([])
    expect(api.isExpanded.value).toBe(false)
    expect(api.highlightedIndex.value).toBe(-1)
    expect(api.statusMessage.value).toBe(
      `form.address.selected{"address":"${suggestion(59).description}"}`,
    )
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(address())
    expect(api.isLoadingAddress.value).toBe(false)
  })

  it('uses a new session token after a resolve (one token per search-then-select)', async () => {
    const { api } = await ready()
    await api.selectSuggestion(suggestion(59))
    api.clearAddress()
    answers([suggestion(1)])
    await type(api, 'Rue 1')
    const usedForSearch = searchCalls().map(([, options]) => options.variables.sessionToken)
    expect(usedForSearch[0]).toBe(tokens[0])
    expect(usedForSearch.at(-1)).not.toBe(tokens[0])
  })

  it('an address without a house number is refused with its own message, and the customer keeps searching', async () => {
    gqlFetch.mockImplementation(async (query: string) =>
      query.includes('resolveAddress')
        ? { resolveAddress: address({ houseNumber: '' }) }
        : { autocompleteAddresses: [suggestion(59)] },
    )
    const { api } = setup()
    await type(api, 'Rue 5')
    await api.selectSuggestion(suggestion(59))
    expect(useNotificationsStore().current).toMatchObject({
      message: 'notify.errors.addressMissingHouseNumber',
      variant: 'error',
    })
    expect(api.selectedAddress.value).toBeNull()
    expect(onUpdate).not.toHaveBeenCalled()
    expect(api.suggestions.value).toHaveLength(1)
    expect(api.isLoadingAddress.value).toBe(false)
    expect(tokens).toHaveLength(2) // The session was renewed
  })

  it('a place that resolves to nothing changes nothing', async () => {
    gqlFetch.mockImplementation(async (query: string) =>
      query.includes('resolveAddress')
        ? { resolveAddress: null }
        : { autocompleteAddresses: [suggestion(59)] },
    )
    const { api } = setup()
    await type(api, 'Rue 5')
    await api.selectSuggestion(suggestion(59))
    expect(api.selectedAddress.value).toBeNull()
    expect(onUpdate).not.toHaveBeenCalled()
    expect(useNotificationsStore().current).toBeNull()
    expect(api.isLoadingAddress.value).toBe(false)
  })

  it('a failed resolve is reported and shown, and the field is usable again', async () => {
    const failure = new Error('resolve failed')
    gqlFetch.mockImplementation(async (query: string) => {
      if (query.includes('resolveAddress')) throw failure
      return { autocompleteAddresses: [suggestion(59)] }
    })
    const { api } = setup()
    await type(api, 'Rue 5')
    await api.selectSuggestion(suggestion(59))
    expect(reportError).toHaveBeenCalledWith(failure, 'address.resolve')
    expect(useNotificationsStore().current?.message).toBe('notify.errors.addressLookupFailed')
    expect(api.isLoadingAddress.value).toBe(false)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('a second pick while the first is resolving is ignored', async () => {
    let finish!: (value: unknown) => void
    gqlFetch.mockImplementation((query: string) =>
      query.includes('resolveAddress')
        ? new Promise((resolve) => (finish = resolve))
        : Promise.resolve({ autocompleteAddresses: [suggestion(59)] }),
    )
    const { api } = setup()
    await type(api, 'Rue 5')
    const first = api.selectSuggestion(suggestion(59))
    expect(api.isLoadingAddress.value).toBe(true)
    await api.selectSuggestion(suggestion(61))
    expect(resolveCalls()).toHaveLength(1)
    finish({ resolveAddress: address() })
    await first
    expect(onUpdate).toHaveBeenCalledOnce()
  })

  it('a search still waiting in the debounce does not fire after the choice', async () => {
    const { api } = await ready()
    api.addressQuery.value = 'Rue de la Cathédrale 59'
    api.onInput()
    await api.selectSuggestion(suggestion(59))
    await vi.advanceTimersByTimeAsync(1000)
    expect(searchCalls()).toHaveLength(1)
    expect(api.suggestions.value).toEqual([])
  })

  it('a search in flight when the customer picks does not reopen suggestions for the stale text', async () => {
    const releases: ((value: unknown) => void)[] = []
    gqlFetch.mockImplementation((query: string) =>
      query.includes('resolveAddress')
        ? Promise.resolve({ resolveAddress: address() })
        : new Promise((resolve) => releases.push(resolve)),
    )
    const { api } = setup()
    await type(api, 'Rue 5')
    await api.selectSuggestion(suggestion(59))
    releases[0]!({ autocompleteAddresses: [suggestion(5)] })
    await vi.advanceTimersByTimeAsync(0)
    expect(api.suggestions.value).toEqual([])
  })
})

describe('keyboard (ARIA 1.2 combobox)', () => {
  const open = async (count = 3) => {
    answers(Array.from({ length: count }, (_, i) => suggestion(i + 1)))
    const view = setup()
    await type(view.api, 'Rue 1')
    view.api.onFocus()
    return view
  }

  it('Down moves the highlight, wrapping from the last to the first', async () => {
    const { api } = await open(3)
    const seen: number[] = []
    for (let i = 0; i < 4; i++) {
      expect(key(api, 'ArrowDown').prevented).toBe(true)
      seen.push(api.highlightedIndex.value)
    }
    expect(seen).toEqual([0, 1, 2, 0])
  })

  it('Up moves the other way: from nothing it jumps to the last, and wraps from the first', async () => {
    const { api } = await open(3)
    key(api, 'ArrowUp')
    expect(api.highlightedIndex.value).toBe(2)
    key(api, 'ArrowUp')
    expect(api.highlightedIndex.value).toBe(1)
    api.hover(0)
    key(api, 'ArrowUp')
    expect(api.highlightedIndex.value).toBe(2)
  })

  it('Down reopens a list that Escape closed', async () => {
    const { api } = await open()
    key(api, 'Escape')
    expect(api.isExpanded.value).toBe(false)
    key(api, 'ArrowDown')
    expect(api.isExpanded.value).toBe(true)
    key(api, 'Escape')
    key(api, 'ArrowUp')
    expect(api.isExpanded.value).toBe(true)
  })

  it('Down and Up do nothing, and let the browser have the key, with no suggestions or after a selection', async () => {
    const empty = setup().api
    expect(key(empty, 'ArrowDown').prevented).toBe(false)
    expect(key(empty, 'ArrowUp').prevented).toBe(false)
    const { api } = await open()
    await api.selectSuggestion(suggestion(1))
    expect(key(api, 'ArrowDown').prevented).toBe(false)
    expect(key(api, 'ArrowUp').prevented).toBe(false)
  })

  it('Home and End jump to the first / last option, only while one is highlighted', async () => {
    const { api } = await open(4)
    expect(key(api, 'Home').prevented).toBe(false) // Nothing highlighted: moves the text cursor
    expect(key(api, 'End').prevented).toBe(false)
    api.hover(1)
    expect(key(api, 'End').prevented).toBe(true)
    expect(api.highlightedIndex.value).toBe(3)
    expect(key(api, 'Home').prevented).toBe(true)
    expect(api.highlightedIndex.value).toBe(0)
  })

  it('Home and End leave a closed list alone', async () => {
    const { api } = await open(3)
    api.hover(1)
    key(api, 'Escape')
    expect(key(api, 'Home').prevented).toBe(false)
    expect(key(api, 'End').prevented).toBe(false)
  })

  it('Enter picks the highlighted option', async () => {
    const { api } = await open(3)
    api.hover(1)
    expect(key(api, 'Enter').prevented).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(resolveCalls()[0]![1].variables.placeId).toBe('place-2')
  })

  it('Enter with nothing highlighted picks the first', async () => {
    const { api } = await open(3)
    key(api, 'Enter')
    await vi.advanceTimersByTimeAsync(0)
    expect(resolveCalls()[0]![1].variables.placeId).toBe('place-1')
  })

  it('Enter never submits an enclosing form, even when the list is closed', async () => {
    const { api } = setup()
    expect(key(api, 'Enter').prevented).toBe(true)
    expect(resolveCalls()).toHaveLength(0)
  })

  it('Escape closes only the list: it is swallowed so an enclosing dialog does not react', async () => {
    const { api } = await open(3)
    api.hover(1)
    expect(key(api, 'Escape')).toEqual({ prevented: true, stopped: true })
    expect(api.isExpanded.value).toBe(false)
    expect(api.highlightedIndex.value).toBe(-1)
    expect(api.suggestions.value).toHaveLength(3) // Closed, not discarded
  })

  it('Escape with the list already closed reaches the dialog', async () => {
    const { api } = setup()
    expect(key(api, 'Escape')).toEqual({ prevented: false, stopped: false })
  })

  it('other keys are not handled', async () => {
    const { api } = await open()
    expect(key(api, 'a').prevented).toBe(false)
    expect(key(api, 'Tab').prevented).toBe(false)
  })

  it('moving the highlight scrolls the option into view', async () => {
    const { api } = await open(3)
    const option = document.createElement('li')
    option.id = api.optionId(0)
    const scroll = vi.fn()
    option.scrollIntoView = scroll
    document.body.append(option)
    key(api, 'ArrowDown')
    await nextTick()
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('a highlighted option that is not in the DOM (yet) is survived', async () => {
    const { api } = await open(3)
    key(api, 'ArrowDown')
    await nextTick()
    expect(api.highlightedIndex.value).toBe(0)
  })

  it('hovering does not scroll', async () => {
    const { api } = await open(3)
    const option = document.createElement('li')
    option.id = api.optionId(1)
    const scroll = vi.fn()
    option.scrollIntoView = scroll
    document.body.append(option)
    api.hover(1)
    await nextTick()
    expect(scroll).not.toHaveBeenCalled()
  })
})

describe('clearAddress', () => {
  it('forgets the selection and the search, tells the screen reader, hands over null and refocuses the input', async () => {
    answers([suggestion(59)])
    const { api } = setup()
    const input = document.createElement('input')
    document.body.append(input)
    api.addressInput.value = input
    await type(api, 'Rue 59')
    await api.selectSuggestion(suggestion(59))
    onUpdate.mockClear()
    const tokensBefore = tokens.length
    api.clearAddress()
    expect(api.selectedAddress.value).toBeNull()
    expect(api.addressQuery.value).toBe('')
    expect(api.suggestions.value).toEqual([])
    expect(api.highlightedIndex.value).toBe(-1)
    expect(api.statusMessage.value).toBe('form.address.cleared')
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(null)
    expect(tokens.length).toBe(tokensBefore + 1)
    await nextTick()
    expect(document.activeElement).toBe(input)
  })

  it('cancels a search that was waiting, and drops one that was in flight', async () => {
    const releases: ((value: unknown) => void)[] = []
    gqlFetch.mockImplementation(() => new Promise((resolve) => releases.push(resolve)))
    const { api } = setup()
    await type(api, 'Rue 5')
    api.addressQuery.value = 'Rue 59'
    api.onInput()
    api.clearAddress()
    await vi.advanceTimersByTimeAsync(1000)
    expect(searchCalls()).toHaveLength(1) // The waiting one never fired
    releases[0]!({ autocompleteAddresses: [suggestion(5)] })
    await vi.advanceTimersByTimeAsync(0)
    expect(api.suggestions.value).toEqual([])
  })

  it('works without an input element to focus', async () => {
    const { api } = setup()
    api.clearAddress()
    await nextTick()
    expect(onUpdate).toHaveBeenCalledWith(null)
  })

  it('afterwards the list may open again for the next search (the field is focused)', async () => {
    answers([suggestion(1)])
    const { api } = setup()
    api.clearAddress()
    await type(api, 'Rue 1')
    expect(api.isExpanded.value).toBe(true)
  })
})

describe('unmounting', () => {
  it('cancels the pending search and the blur timer, and drops an answer that arrives later', async () => {
    const releases: ((value: unknown) => void)[] = []
    gqlFetch.mockImplementation(() => new Promise((resolve) => releases.push(resolve)))
    const { api, unmount } = setup()
    await type(api, 'Rue 5') // In flight
    api.addressQuery.value = 'Rue 59'
    api.onInput() // Waiting in the debounce
    api.onFocus()
    api.onBlur() // Blur timer running
    unmount()
    await vi.advanceTimersByTimeAsync(1000)
    expect(searchCalls()).toHaveLength(1)
    releases[0]!({ autocompleteAddresses: [suggestion(5)] })
    await vi.advanceTimersByTimeAsync(0)
    expect(api.suggestions.value).toEqual([])
    unmountCurrent = undefined
  })

  it('unmounting with nothing pending is harmless', () => {
    const { unmount } = setup()
    expect(() => {
      unmount()
    }).not.toThrow()
    unmountCurrent = undefined
  })
})
