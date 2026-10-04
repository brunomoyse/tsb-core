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

/*
 * A valid Belgian number that is shaped like a Liège landline (04 xxx xx xx) but starts 046-049, the mobile prefixes:
 * most likely a mobile number with one digit missing ("0470 12 34 5"). libphonenumber accepts it as a landline, and
 * some may really be one, so it stays valid: the form only asks the customer to check it. Takes the E.164 string.
 */
export function looksLikeShortMobile(e164: string): boolean {
  // Belgian country code, then 8 digits starting 46-49 (a complete mobile has 9).
  return e164.startsWith('+32') && /^4[6-9]\d{6}$/u.test(e164.slice(3))
}

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
  // 9 digits that are neither a landline nor the start of a mobile cannot be completed into a Belgian number.
  if (digits.length === BE_LANDLINE_DIGITS) return { kind: 'invalid' }
  return { kind: 'needsCountryCode' }
}
