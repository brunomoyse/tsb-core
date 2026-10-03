/*
 * Classifies what a customer typed in a phone field, so the form can say the RIGHT thing at the right
 * moment (audit M22): "keep typing" for a Belgian number that is not finished yet, "add the country code"
 * only for a number that looks complete but is not Belgian, "invalid" otherwise.
 *
 * libphonenumber-js (~75 KB) is loaded on first use, never at page load.
 */

export type PhoneInputState =
  | { kind: 'empty' }
  | { kind: 'valid'; e164: string }
  /** Looks like the start of a valid number: keep typing. */
  | { kind: 'incomplete' }
  /** A national-looking number that is not Belgian: it needs a country code (+33 ...). */
  | { kind: 'needsCountryCode' }
  | { kind: 'invalid' }

// A Belgian national number is 0 + 8 digits (landline) or 0 + 9 digits (mobile, 04xx): 9 or 10 digits.
const BE_LANDLINE_DIGITS = 9

export async function classifyPhoneInput(raw: string): Promise<PhoneInputState> {
  const trimmed = raw.trim()
  if (!trimmed) return { kind: 'empty' }

  const { parsePhoneNumberFromString, validatePhoneNumberLength } =
    await import('libphonenumber-js')
  // Default to BE so a leading "0" parses as a Belgian national number; a leading "+" or "00" overrides it.
  const parsed = parsePhoneNumberFromString(trimmed, 'BE')
  if (parsed?.isValid()) return { kind: 'valid', e164: parsed.format('E.164') }

  const length = validatePhoneNumberLength(trimmed, 'BE')
  if (length === 'TOO_LONG' || length === 'NOT_A_NUMBER') return { kind: 'invalid' }
  const tooShort = length === 'TOO_SHORT'
  const international = trimmed.startsWith('+') || trimmed.startsWith('00')
  if (international) return tooShort ? { kind: 'incomplete' } : { kind: 'invalid' }

  const digits = trimmed.replace(/\D/gu, '')
  if (tooShort || digits.length < BE_LANDLINE_DIGITS) return { kind: 'incomplete' }
  // 0 + 8 digits that is not a landline can still be a mobile that is one digit short ("0470 12 34 5").
  if (digits.length === BE_LANDLINE_DIGITS && digits.startsWith('04')) return { kind: 'incomplete' }
  // 9 digits that are neither a landline nor the start of a mobile cannot be completed into a Belgian number.
  if (digits.length === BE_LANDLINE_DIGITS) return { kind: 'invalid' }
  return { kind: 'needsCountryCode' }
}
