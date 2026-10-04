// usePhoneCapture: the checkout phone capture. The field is validated when the customer is done with it (blur, Enter,
// save), never while typing; a valid new number is saved to the profile; the checkout commits a typed-but-unsaved number
// before it orders. Real libphonenumber, auth store, notifications and shared state; the API (updateMe), Sentry and i18n
// are the boundaries.
// Run: `vp test run layers/engine/composables/usePhoneCapture.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { clearNuxtState, useState } from '#imports'
import { createPinia, setActivePinia } from 'pinia'
import { makeUser } from '../../../test/fixtures/auth'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { useAuthStore } from '#engine/stores/auth'
import { useNotificationsStore } from '#engine/stores/notifications'

const gqlFetch = vi.hoisted(() => vi.fn())
const reportError = vi.hoisted(() => vi.fn())
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
vi.mock('#engine/utils/reportError', () => ({ reportError }))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

const { usePhoneCapture } = await import('#engine/composables/usePhoneCapture')

let auth: ReturnType<typeof useAuthStore>
let notifications: ReturnType<typeof useNotificationsStore>

const draft = () => useState<string>('checkout-phone-draft')
const editing = () => useState<boolean>('checkout-phone-editing')
const saved = (phoneNumber: string | null) => {
  auth.setUser(makeUser({ phoneNumber }))
}
const updateMeAnswers = (phoneNumber: string) =>
  gqlFetch.mockResolvedValue({ updateMe: { id: 'user-1', phoneNumber } })

beforeEach(() => {
  setActivePinia(createPinia())
  auth = useAuthStore()
  notifications = useNotificationsStore()
  clearNuxtState(['checkout-phone-draft', 'checkout-phone-error', 'checkout-phone-editing'])
  gqlFetch.mockReset()
  reportError.mockReset()
})

describe('what the field shows', () => {
  it('without a saved number the field is open and empty', () => {
    const phone = usePhoneCapture()
    expect(phone.saved.value).toBe(false)
    expect(phone.savedNumber.value).toBe('')
    expect(phone.isCollapsed.value).toBe(false)
    expect(phone.hasUnsavedInput.value).toBe(false)
  })

  it('with a saved number it is collapsed until the customer edits it', () => {
    saved('+3242229888')
    const phone = usePhoneCapture()
    expect(phone.saved.value).toBe(true)
    expect(phone.savedNumber.value).toBe('+3242229888')
    expect(phone.isCollapsed.value).toBe(true)
    expect(phone.hasUnsavedInput.value).toBe(false)
  })

  it('an open field holding something is unsaved input; whitespace is not', () => {
    const phone = usePhoneCapture()
    draft().value = '   '
    expect(phone.hasUnsavedInput.value).toBe(false)
    draft().value = '0470'
    expect(phone.hasUnsavedInput.value).toBe(true)
  })

  it('the draft is shared state: the checkout page sees what the field component typed', () => {
    draft().value = '0470 12 34 56'
    expect(usePhoneCapture().phoneLocal.value).toBe('0470 12 34 56')
  })
})

describe('startEditing / cancelEditing', () => {
  it('a Belgian saved number opens in national format', async () => {
    saved('+3242229888')
    const phone = usePhoneCapture()
    await phone.startEditing()
    expect(phone.phoneLocal.value).toBe('04 222 98 88')
    expect(phone.isCollapsed.value).toBe(false)
    expect(editing().value).toBe(true)
  })

  it('a foreign saved number opens in international format', async () => {
    saved('+33612345678')
    const phone = usePhoneCapture()
    await phone.startEditing()
    expect(phone.phoneLocal.value).toBe('+33 6 12 34 56 78')
  })

  it('a saved value that is not a phone number opens as it is', async () => {
    saved('call me')
    const phone = usePhoneCapture()
    await phone.startEditing()
    expect(phone.phoneLocal.value).toBe('call me')
  })

  it('with nothing saved it opens empty, and clears a stale error', async () => {
    const phone = usePhoneCapture()
    draft().value = 'old'
    phone.phoneError.value = 'stale'
    await phone.startEditing()
    expect(phone.phoneLocal.value).toBe('')
    expect(phone.phoneError.value).toBe('')
    expect(editing().value).toBe(true)
  })

  it('puts the cursor in the field', async () => {
    const input = document.createElement('input')
    document.body.append(input)
    const phone = usePhoneCapture(ref(input))
    await phone.startEditing()
    expect(document.activeElement).toBe(input)
    input.remove()
  })

  it('works without an input ref (no focus to move)', async () => {
    await expect(usePhoneCapture().startEditing()).resolves.toBeUndefined()
  })

  it('cancel collapses the field and clears the error', async () => {
    saved('+3242229888')
    const phone = usePhoneCapture()
    await phone.startEditing()
    phone.phoneError.value = 'x'
    phone.cancelEditing()
    expect(phone.isCollapsed.value).toBe(true)
    expect(phone.phoneError.value).toBe('')
  })

  it('typing clears a stale error, and never saves or collapses by itself', () => {
    const phone = usePhoneCapture()
    phone.phoneError.value = 'stale'
    draft().value = '0470 12 34 56'
    phone.onInput()
    expect(phone.phoneError.value).toBe('')
    expect(gqlFetch).not.toHaveBeenCalled()
  })
})

describe('onBlur: the error shows when the customer is done with the field', () => {
  const blurWith = async (typed: string) => {
    const phone = usePhoneCapture()
    draft().value = typed
    await phone.onBlur()
    return phone.phoneError.value
  }

  it('left empty: nothing to scold', async () => {
    expect(await blurWith('')).toBe('')
    expect(await blurWith('   ')).toBe('')
  })

  it('an unfinished Belgian number says "incomplete", not "add the country code"', async () => {
    expect(await blurWith('0470 12')).toBe('form.incompletePhone')
  })

  it('a complete-looking foreign number asks for the country prefix', async () => {
    expect(await blurWith('06 12 34 56 78')).toBe('checkout.phoneCapture.addCountryPrefix')
  })

  it('garbage is invalid', async () => {
    expect(await blurWith('abc')).toBe('form.invalidPhone')
  })

  it('a valid number shows no error', async () => {
    expect(await blurWith('0470 12 34 56')).toBe('')
  })

  it('an error is not shown on a card that was collapsed while the library loaded (Cancel)', async () => {
    saved('+3242229888')
    const phone = usePhoneCapture()
    draft().value = 'abc' // Typed, but the card is collapsed (not editing)
    await phone.onBlur()
    expect(phone.phoneError.value).toBe('')
  })
})

describe('submit', () => {
  it('saves a valid new number as E.164, updates the profile, collapses and says so', async () => {
    updateMeAnswers('+32470123456')
    const phone = usePhoneCapture()
    draft().value = '0470 12 34 56'
    editing().value = true
    expect(await phone.submit()).toBe(true)
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(gqlFetch.mock.calls[0]![1]).toEqual({
      variables: { input: { phoneNumber: '+32470123456' } },
    })
    expect(auth.user?.phoneNumber).toBe('+32470123456')
    expect(editing().value).toBe(false)
    expect(phone.loading.value).toBe(false)
    expect(notifications.current).toMatchObject({
      message: 'checkout.phoneCapture.saved',
      variant: 'success',
      duration: 3000,
      persistent: false,
    })
    notifications.dismiss()
  })

  it('an empty field is refused with the "required before order" message, nothing is sent', async () => {
    const phone = usePhoneCapture()
    expect(await phone.submit()).toBe(false)
    expect(phone.phoneError.value).toBe('checkout.phoneCapture.requiredBeforeOrder')
    expect(gqlFetch).not.toHaveBeenCalled()
  })

  it('an invalid number is refused with its own message, nothing is sent', async () => {
    const phone = usePhoneCapture()
    draft().value = 'abc'
    expect(await phone.submit()).toBe(false)
    expect(phone.phoneError.value).toBe('form.invalidPhone')
    expect(gqlFetch).not.toHaveBeenCalled()
  })

  it('an unfinished number is refused as incomplete', async () => {
    const phone = usePhoneCapture()
    draft().value = '0470 12'
    expect(await phone.submit()).toBe(false)
    expect(phone.phoneError.value).toBe('form.incompletePhone')
  })

  it('the same number as the saved one sends nothing and just closes the editor', async () => {
    saved('+32470123456')
    const phone = usePhoneCapture()
    draft().value = '0470 12 34 56'
    editing().value = true
    expect(await phone.submit()).toBe(true)
    expect(gqlFetch).not.toHaveBeenCalled()
    expect(editing().value).toBe(false)
    expect(notifications.current).toBeNull()
  })

  it('a failed save is reported, shown on the field, and the customer can retry', async () => {
    const failure = new Error('500')
    gqlFetch.mockRejectedValue(failure)
    const phone = usePhoneCapture()
    draft().value = '0470 12 34 56'
    editing().value = true
    expect(await phone.submit()).toBe(false)
    expect(reportError).toHaveBeenCalledWith(failure, 'checkout.savePhone')
    expect(phone.phoneError.value).toBe('notify.errors.profileUpdateFailed')
    expect(phone.loading.value).toBe(false)
    expect(editing().value).toBe(true)
    expect(auth.user).toBeNull()
    expect(notifications.current).toBeNull()
  })

  it('while the save is in flight loading is true', async () => {
    let finish!: (value: unknown) => void
    gqlFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const phone = usePhoneCapture()
    draft().value = '0470 12 34 56'
    const pending = phone.submit()
    await vi.waitFor(() => {
      expect(phone.loading.value).toBe(true)
    })
    finish({ updateMe: { id: 'user-1', phoneNumber: '+32470123456' } })
    await pending
    expect(phone.loading.value).toBe(false)
    notifications.dismiss()
  })

  it('Save then Pay: a second submit while the first is in flight waits for it, one request only', async () => {
    updateMeAnswers('+32470123456')
    const phone = usePhoneCapture()
    draft().value = '0470 12 34 56'
    const [first, second] = await Promise.all([phone.submit(), phone.submit()])
    expect([first, second]).toEqual([true, true])
    expect(gqlFetch).toHaveBeenCalledOnce()
    notifications.dismiss()
  })

  it('a later submit, once the first has finished, is a new one', async () => {
    gqlFetch.mockRejectedValueOnce(new Error('500'))
    const phone = usePhoneCapture()
    draft().value = '0470 12 34 56'
    expect(await phone.submit()).toBe(false)
    updateMeAnswers('+32470123456')
    expect(await phone.submit()).toBe(true)
    expect(gqlFetch).toHaveBeenCalledTimes(2)
    notifications.dismiss()
  })
})

describe('commitPending (the checkout, before it validates the order)', () => {
  it('"none" when the field holds nothing unsaved (a saved number, collapsed)', async () => {
    saved('+3242229888')
    expect(await usePhoneCapture().commitPending()).toBe('none')
    expect(gqlFetch).not.toHaveBeenCalled()
  })

  it('"none" for an empty open field: the checkout then asks for a number itself', async () => {
    expect(await usePhoneCapture().commitPending()).toBe('none')
  })

  it('saves a typed-but-unsaved number first, so Pay uses what the customer sees', async () => {
    updateMeAnswers('+32470123456')
    const phone = usePhoneCapture()
    draft().value = '0470 12 34 56'
    expect(await phone.commitPending()).toBe('saved')
    expect(auth.user?.phoneNumber).toBe('+32470123456')
    notifications.dismiss()
  })

  it('"invalid" when the typed number is not acceptable or could not be saved: the order must not go on', async () => {
    const phone = usePhoneCapture()
    draft().value = 'abc'
    expect(await phone.commitPending()).toBe('invalid')
    expect(phone.phoneError.value).toBe('form.invalidPhone')
    draft().value = '0470 12 34 56'
    gqlFetch.mockRejectedValue(new Error('500'))
    expect(await phone.commitPending()).toBe('invalid')
  })

  it('waits for a save already in flight (Save tapped, then Pay), then finds nothing left to commit', async () => {
    let finish!: (value: unknown) => void
    gqlFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const phone = usePhoneCapture()
    draft().value = '0470 12 34 56'
    editing().value = true
    const save = phone.submit()
    const commit = phone.commitPending()
    await vi.waitFor(() => {
      expect(gqlFetch).toHaveBeenCalled()
    })
    finish({ updateMe: { id: 'user-1', phoneNumber: '+32470123456' } })
    await save
    expect(await commit).toBe('none') // The save collapsed the field: the number is now the saved one
    expect(gqlFetch).toHaveBeenCalledOnce()
    notifications.dismiss()
  })
})
