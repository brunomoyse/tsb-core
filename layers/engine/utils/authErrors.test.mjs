// Run: `node --test layers/engine/utils/authErrors.test.mjs`.

import { authErrorKey, classifyAuthError, httpStatusOf } from './authErrors.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

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
  assert.equal(authErrorKey({ statusCode: 400 }, 'notify.errors.invalidCode'), 'notify.errors.invalidCode')
})
