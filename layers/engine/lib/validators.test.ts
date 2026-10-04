import { describe, expect, it } from 'vite-plus/test'
import { isValidEmail } from './validators'

describe('isValidEmail', () => {
  it.each(['a@b.co', 'first.last+tag@sub.example.be', '  padded@example.com  '])(
    'accepts %j',
    (value) => {
      expect(isValidEmail(value)).toBe(true)
    },
  )

  it.each([
    '',
    'plain',
    '@example.com',
    'a@b',
    'a@b.',
    'a b@example.com',
    'a@exa mple.com',
    'a@@b.co',
  ])('rejects %j', (value) => {
    expect(isValidEmail(value)).toBe(false)
  })
})
