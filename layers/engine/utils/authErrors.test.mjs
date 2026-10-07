// Run: `vp test run layers/engine/utils/authErrors.test.mjs`.

import {
  authErrorKey,
  classifyAuthError,
  httpStatusOf,
  isIdpSignInCancelled,
  isUndeliverableEmailError,
} from './authErrors.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

test('the status comes from response.status or statusCode', () => {
  assert.equal(httpStatusOf({ response: { status: 429 } }), 429)
  assert.equal(httpStatusOf({ statusCode: 503 }), 503)
  assert.equal(httpStatusOf({ response: { status: 400 }, statusCode: 500 }), 400)
  assert.equal(httpStatusOf(new Error('boom')), undefined)
  assert.equal(httpStatusOf(null), undefined)
})

test('429 is the rate limiter, no status is the network, 5xx the server, the rest a refusal', () => {
  assert.equal(classifyAuthError({ statusCode: 429 }), 'rateLimited')
  assert.equal(classifyAuthError(new TypeError('Failed to fetch')), 'network')
  assert.equal(classifyAuthError(undefined), 'network')
  assert.equal(classifyAuthError({ response: { status: 500 } }), 'server')
  assert.equal(classifyAuthError({ response: { status: 599 } }), 'server')
  assert.equal(classifyAuthError({ response: { status: 401 } }), 'rejected')
  assert.equal(classifyAuthError({ response: { status: 499 } }), 'rejected')
})

test('each kind has its message, a refusal uses the one the screen gives', () => {
  assert.equal(authErrorKey({ statusCode: 429 }, 'x'), 'notify.errors.tooManyRequests')
  assert.equal(authErrorKey({}, 'x'), 'notify.errors.networkError')
  assert.equal(authErrorKey({ statusCode: 502 }, 'x'), 'notify.errors.serverError')
  assert.equal(
    authErrorKey({ statusCode: 400 }, 'notify.errors.invalidCode'),
    'notify.errors.invalidCode',
  )
})

test('a 422 invalid_email is an undeliverable address, nothing else is', () => {
  assert.equal(
    isUndeliverableEmailError({ statusCode: 422, data: { error: 'invalid_email' } }),
    true,
  )
  assert.equal(
    isUndeliverableEmailError({ response: { status: 422, _data: { error: 'invalid_email' } } }),
    true,
  )
  assert.equal(isUndeliverableEmailError({ statusCode: 422, data: { error: 'other' } }), false)
  assert.equal(
    isUndeliverableEmailError({ statusCode: 400, data: { error: 'invalid_email' } }),
    false,
  )
  assert.equal(isUndeliverableEmailError(new TypeError('Failed to fetch')), false)
})

test('a 400 idp_intent_not_succeeded is a sign-in the customer cancelled, nothing else is', () => {
  const body = { error: 'idp_intent_not_succeeded' }
  assert.equal(isIdpSignInCancelled({ statusCode: 400, data: body }), true)
  assert.equal(isIdpSignInCancelled({ response: { status: 400, _data: body } }), true)
  assert.equal(isIdpSignInCancelled({ statusCode: 400, data: { error: 'other' } }), false)
  assert.equal(isIdpSignInCancelled({ statusCode: 502, data: body }), false)
  assert.equal(isIdpSignInCancelled(new TypeError('Failed to fetch')), false)
})
