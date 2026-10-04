// usePhoneCapture: the checkout phone capture. The field is validated when the customer is done with it (blur, Enter,
// save), never while typing; a valid new number is saved to the profile; the checkout commits a typed-but-unsaved number
// before it orders. Real libphonenumber, auth store, notifications and shared state; the API (updateMe), Sentry and i18n
// are the boundaries.
// Run: `vp test run layers/engine/composables/usePhoneCapture.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { clearNuxtState, useState } from '#imports'
import { createPinia, setActivePinia } from 'pinia'
import { settle } from '../../../test/helpers/settle'
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
  clearNuxtState([
    'checkout-phone-draft',
    'checkout-phone-error',
    'checkout-phone-editing',
    'checkout-phone-hint',
  ])
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

  it('the collapsed card shows the saved number in national format, the saved one stays E.164', async () => {
    saved('+32470123456')
    const phone = usePhoneCapture()
    // Until the formatter is loaded: the stored string.
    expect(phone.savedNumberDisplay.value).toBe('+32470123456')
    await settle()
    expect(phone.savedNumberDisplay.value).toBe('0470 12 34 56')
    expect(phone.savedNumber.value).toBe('+32470123456')
  })

  it('shows a number that misses a digit with its trunk 0, so the missing digit can be seen', async () => {
    saved('+3247012345')
    const phone = usePhoneCapture()
    await settle()
    expect(phone.savedNumberDisplay.value).toBe('0470 12 34 5')
  })

  it('drops the formatting of a number that was replaced while the library loaded', async () => {
    saved('+3242229888')
    const phone = usePhoneCapture()
    saved('+33612345678')
    await settle()
    expect(phone.savedNumberDisplay.value).toBe('+33 6 12 34 56 78')
  })

  it('follows a number saved later, and shows nothing without one', async () => {
    const phone = usePhoneCapture()
    expect(phone.savedNumberDisplay.value).toBe('')
    saved('+3242229888')
    await settle()
    expect(phone.savedNumberDisplay.value).toBe('04 222 98 88')
    saved('+33612345678')
    await settle()
    expect(phone.savedNumberDisplay.value).toBe('+33 6 12 34 56 78')
    saved(null)
    await settle()
    expect(phone.savedNumberDisplay.value).toBe('')
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
    await phone.startEditing()
    draft().value = 'abc' // Not a number: validating it would show an error
    const blurred = phone.onBlur() // The validation is waiting for libphonenumber to load...
    phone.cancelEditing() // ...when the customer cancels
    await blurred
    expect(phone.isCollapsed.value).toBe(true)
    expect(phone.phoneError.value).toBe('')
  })
})

// A 9-digit number starting 046-049 is a valid Liège landline for libphonenumber, and is also a mobile one digit short:
// it is accepted and saved, with a hint under the field (never an error, never a block).
describe('the hint for a mobile number one digit short', () => {
  const SHORT = '0470 12 34 5'

  it('shows after the customer leaves the field, with no error', async () => {
    const phone = usePhoneCapture()
    draft().value = SHORT
    expect(phone.phoneHint.value).toBe('')
    await phone.onBlur()
    expect(phone.phoneHint.value).toBe('form.phoneMaybeMobile')
    expect(phone.phoneError.value).toBe('')
  })

  it('is not shown for a complete mobile, a Liège landline, an unfinished or an invalid number', async () => {
    const phone = usePhoneCapture()
    for (const typed of ['0470 12 34 56', '04 222 98 88', '0470 12', 'abc']) {
      draft().value = typed
      await phone.onBlur()
      expect(phone.phoneHint.value, typed).toBe('')
    }
  })

  it('goes away when the customer types again', async () => {
    const phone = usePhoneCapture()
    draft().value = SHORT
    await phone.onBlur()
    phone.onInput()
    expect(phone.phoneHint.value).toBe('')
  })

  it('is checked again by Save, which still saves the number', async () => {
    updateMeAnswers('+3247012345')
    const phone = usePhoneCapture()
    draft().value = SHORT
    editing().value = true
    expect(await phone.submit()).toBe(true)
    expect(gqlFetch.mock.calls[0]![1]).toEqual({
      variables: { input: { phoneNumber: '+3247012345' } },
    })
    expect(auth.user?.phoneNumber).toBe('+3247012345')
  })

  it('stays on the collapsed card that shows such a saved number, so it can be corrected', async () => {
    saved('+3247012345')
    const phone = usePhoneCapture()
    expect(phone.isCollapsed.value).toBe(true)
    expect(phone.phoneHint.value).toBe('form.phoneMaybeMobile')
    await phone.startEditing()
    expect(phone.phoneHint.value).toBe('')
    phone.cancelEditing()
    expect(phone.phoneHint.value).toBe('form.phoneMaybeMobile')
  })

  it('is not on the collapsed card of an ordinary saved number', () => {
    saved('+32470123456')
    expect(usePhoneCapture().phoneHint.value).toBe('')
  })

  it('does not appear on a card that was collapsed while the library loaded (Cancel)', async () => {
    saved('+3242229888')
    const phone = usePhoneCapture()
    await phone.startEditing()
    draft().value = SHORT
    const blurred = phone.onBlur()
    phone.cancelEditing()
    await blurred
    expect(phone.phoneHint.value).toBe('')
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
