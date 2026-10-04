// Run: `vp test run layers/engine/utils/silentRenewError.test.mjs`.
import assert from 'node:assert/strict'
import { SilentRenewUnavailableError, isSilentRenewUnavailable } from './silentRenewError.ts'
import { test } from 'vite-plus/test'

test('the error keeps what went wrong as its cause', () => {
  const cause = new TypeError('Failed to fetch')
  const err = new SilentRenewUnavailableError({ cause })
  assert.equal(err.cause, cause)
  assert.equal(err.name, 'SilentRenewUnavailableError')
  assert.ok(err instanceof Error)
})

test('it is recognised, and nothing else is', () => {
  assert.equal(isSilentRenewUnavailable(new SilentRenewUnavailableError()), true)
  assert.equal(isSilentRenewUnavailable(new TypeError('Failed to fetch')), false)
  assert.equal(isSilentRenewUnavailable(new Error('invalid_grant')), false)
  assert.equal(isSilentRenewUnavailable({ name: 'SilentRenewUnavailableError' }), false)
  assert.equal(isSilentRenewUnavailable(null), false)
  assert.equal(isSilentRenewUnavailable(undefined), false)
})

test('it is recognised by name, so a second copy of the module still matches', () => {
  const lookalike = Object.assign(new Error('x'), { name: 'SilentRenewUnavailableError' })
  assert.equal(isSilentRenewUnavailable(lookalike), true)
})
