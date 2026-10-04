import { describe, expect, it } from 'vite-plus/test'
import { classifyPhoneInput } from './phoneInput'

const kind = async (raw: string) => (await classifyPhoneInput(raw)).kind

describe('classifyPhoneInput', () => {
  it('empty or blank', async () => {
    expect(await kind('')).toBe('empty')
    expect(await kind('   ')).toBe('empty')
  })

  it('a valid Belgian number comes back in E.164, national or international', async () => {
    expect(await classifyPhoneInput('04 70 12 34 56')).toEqual({
      kind: 'valid',
      e164: '+32470123456',
    })
    expect(await classifyPhoneInput('+32 4 222 98 88')).toEqual({
      kind: 'valid',
      e164: '+3242229888',
    })
    expect(await classifyPhoneInput('0032 470 12 34 56')).toEqual({
      kind: 'valid',
      e164: '+32470123456',
    })
  })

  it('a Belgian number still being typed is incomplete', async () => {
    expect(await kind('04')).toBe('incomplete')
    expect(await kind('0470 12 34')).toBe('incomplete')
  })

  it('an international number that is too short is incomplete, otherwise invalid', async () => {
    expect(await kind('+32 47')).toBe('incomplete')
    expect(await kind('+32 470 12 34 567 89')).toBe('invalid')
  })

  it('9 digits that libphonenumber rejects cannot be completed', async () => {
    expect(await kind('0000 00 00 0')).toBe('invalid')
  })

  it('a complete-looking national number that is not Belgian needs a country code', async () => {
    expect(await kind('06 12 34 56 78')).toBe('needsCountryCode')
  })

  it('letters and over-long input are invalid', async () => {
    expect(await kind('hello')).toBe('invalid')
    expect(await kind('0470 12 34 56 78 90 12 34')).toBe('invalid')
  })
})
