// UserForm (the profile dialog): the phone field. An invalid number is refused on Save; a number libphonenumber accepts
// but that looks like a mobile one digit short ("0470 12 34 5": 9 digits starting 04 is also a Liège landline) is saved
// all the same, with a hint under the field. Real libphonenumber; the address search and i18n are stubbed.
// Run: `vp test run layers/engine/components/form/UserForm.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from '../../../../test/helpers/settle'

vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

const AddressAutocompleteStub = defineComponent({ template: '<div />' })

const { default: UserForm } = await import('./UserForm.vue')

const submitted = vi.fn()
const mountForm = () =>
  mountSuspended(UserForm, {
    props: {
      initialValues: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test' },
      onSubmit: submitted,
    },
    global: { stubs: { AddressAutocomplete: AddressAutocompleteStub } },
  })

type Form = Awaited<ReturnType<typeof mountForm>>

const type = async (form: Form, value: string) => {
  const input = form.get('#phone')
  await input.setValue(value)
  return input
}
const hint = (form: Form) => form.find('#phone-hint')
const error = (form: Form) => form.find('#phone-error')
const save = async (form: Form) => {
  await form.get('form').trigger('submit')
  await settle()
}

describe('the hint for a mobile number one digit short', () => {
  it('shows under the field when the customer leaves it, and does not block anything', async () => {
    const form = await mountForm()
    const input = await type(form, '0470 12 34 5')
    expect(hint(form).exists()).toBe(false)

    await input.trigger('blur')
    await settle()

    expect(hint(form).text()).toBe('form.phoneMaybeMobile')
    expect(error(form).exists()).toBe(false)
    expect(input.attributes('aria-describedby')).toBe('phone-hint')
  })

  it('goes away as soon as the customer types again', async () => {
    const form = await mountForm()
    const input = await type(form, '0470 12 34 5')
    await input.trigger('blur')
    await settle()
    expect(hint(form).exists()).toBe(true)

    await input.setValue('0470 12 34 56')
    expect(hint(form).exists()).toBe(false)
    expect(input.attributes('aria-describedby')).toBeUndefined()
  })

  it('is not shown for a complete mobile, a Liège landline, or an empty field', async () => {
    const form = await mountForm()
    for (const value of ['0470 12 34 56', '04 222 98 88', '']) {
      const input = await type(form, value)
      await input.trigger('blur')
      await settle()
      expect(hint(form).exists(), value).toBe(false)
    }
  })

  it('is not shown for a number that is not valid (Save reports that one)', async () => {
    const form = await mountForm()
    const input = await type(form, '0470 12')
    await input.trigger('blur')
    await settle()
    expect(hint(form).exists()).toBe(false)
    expect(error(form).exists()).toBe(false)
  })

  it('is dropped when the country changes: the same digits are another number', async () => {
    const form = await mountForm()
    const input = await type(form, '0470 12 34 5')
    await input.trigger('blur')
    await settle()
    expect(hint(form).exists()).toBe(true)

    await form.get('#country').setValue('FR')
    expect(hint(form).exists()).toBe(false)
  })

  it('Save still sends the number (E.164) and keeps the hint on screen', async () => {
    const form = await mountForm()
    await type(form, '0470 12 34 5')
    await save(form)

    expect(submitted).toHaveBeenCalledOnce()
    expect(submitted.mock.calls[0]![0]).toMatchObject({ phoneNumber: '+3247012345' })
    expect(hint(form).text()).toBe('form.phoneMaybeMobile')
  })
})

describe('Save with a phone number', () => {
  it('an invalid number is refused with the error, and no hint', async () => {
    const form = await mountForm()
    await type(form, 'abc')
    await save(form)

    expect(error(form).text()).toBe('form.invalidPhone')
    expect(hint(form).exists()).toBe(false)
    expect(submitted).not.toHaveBeenCalled()
  })

  it('a valid mobile is sent as E.164, with no hint', async () => {
    const form = await mountForm()
    await type(form, '0470 12 34 56')
    await save(form)

    expect(submitted.mock.calls[0]![0]).toMatchObject({ phoneNumber: '+32470123456' })
    expect(hint(form).exists()).toBe(false)
  })
})
