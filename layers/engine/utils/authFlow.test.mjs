// The sign-in flow decisions (AuthFlow.vue): email check, every failure of each step, resend countdown, return path.
// Run: `vp test run layers/engine/utils/authFlow.test.mjs`.

import {
  RESEND_COOLDOWN_SECONDS,
  authStepIndex,
  describeGenericFailure,
  describeIdpStartFailure,
  describeRequestCodeFailure,
  describeVerifyFailure,
  emailFormatInvalid,
  hasUsableOtpSession,
  isResendDisabled,
  isVerifyDisabled,
  postAuthTarget,
  rememberCurrentPage,
  sanitizeReturnTo,
  stepAfterVerify,
  tickResendCooldown,
  totalAuthSteps,
} from './authFlow.ts'
import { describe, test } from 'vite-plus/test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const http = (status, data) => ({ response: { status, _data: data }, statusCode: status, data })
const offline = new TypeError('Failed to fetch')

describe('email format', () => {
  test('an empty or blank field is not an error yet, a malformed address is', () => {
    assert.equal(emailFormatInvalid(''), false)
    assert.equal(emailFormatInvalid('   '), false)
    for (const bad of ['plain', 'a@b', '@b.com', 'a@.com', 'a b@c.com', 'a@b@c.com'])
      assert.equal(emailFormatInvalid(bad), true, bad)
  })

  test('a valid address is accepted, surrounding spaces included', () => {
    for (const good of ['a@b.co', ' name@example.com ', 'first.last+tag@sub.example.be'])
      assert.equal(emailFormatInvalid(good), false, good)
  })
})

describe('code request (step 1)', () => {
  test('a 422 invalid_email is shown on the field, whichever shape the error has', () => {
    assert.deepEqual(describeRequestCodeFailure(http(422, { error: 'invalid_email' })), {
      kind: 'undeliverable',
    })
    assert.deepEqual(
      describeRequestCodeFailure({ response: { status: 422, _data: { error: 'invalid_email' } } }),
      { kind: 'undeliverable' },
    )
  })

  test('a 422 with another body is a plain refusal, not the field error', () => {
    assert.deepEqual(describeRequestCodeFailure(http(422, { error: 'nope' })), {
      kind: 'message',
      key: 'notify.errors.requestFailed',
    })
  })

  test('429, network, 5xx and 4xx each have their own message', () => {
    const key = (e) => describeRequestCodeFailure(e).key
    assert.equal(key(http(429)), 'notify.errors.tooManyRequests')
    assert.equal(key(offline), 'notify.errors.networkError')
    assert.equal(key(http(500)), 'notify.errors.serverError')
    assert.equal(key(http(503)), 'notify.errors.serverError')
    assert.equal(key(http(400)), 'notify.errors.requestFailed')
  })

  test('an empty session from the backend is not usable (the flow must not move to the code step)', () => {
    assert.equal(hasUsableOtpSession({ sessionId: 's', sessionToken: 't' }), true)
    assert.equal(hasUsableOtpSession({ sessionId: '', sessionToken: 't' }), false)
    assert.equal(hasUsableOtpSession({ sessionId: 's', sessionToken: '' }), false)
    assert.equal(hasUsableOtpSession({}), false)
    assert.equal(hasUsableOtpSession(null), false)
    assert.equal(hasUsableOtpSession(undefined), false)
  })
})

describe('code check (step 2)', () => {
  test('a refused code (wrong or expired) says "invalid code" and is tracked', () => {
    for (const status of [400, 401, 403, 404, 410]) {
      assert.deepEqual(describeVerifyFailure(http(status)), {
        key: 'notify.errors.invalidCode',
        track: 'invalid_code',
      })
    }
  })

  test('the rate limiter says "too many requests" and is tracked as such', () => {
    assert.deepEqual(describeVerifyFailure(http(429)), {
      key: 'notify.errors.tooManyRequests',
      track: 'rate_limited',
    })
  })

  test('a network or server fault is not blamed on the code, and is not tracked as a wrong code', () => {
    assert.deepEqual(describeVerifyFailure(offline), {
      key: 'notify.errors.networkError',
      track: null,
    })
    assert.deepEqual(describeVerifyFailure(http(502)), {
      key: 'notify.errors.serverError',
      track: null,
    })
  })

  test('a verified code on a new account goes to the profile step, an existing one finalizes', () => {
    assert.equal(stepAfterVerify({ requiresProfile: true }), 'profile')
    assert.equal(stepAfterVerify({ requiresProfile: false }), 'finalize')
  })

  test('the verify button needs 6 digits and no request in flight', () => {
    assert.equal(isVerifyDisabled('12345', false), true)
    assert.equal(isVerifyDisabled('', false), true)
    assert.equal(isVerifyDisabled('123456', true), true)
    assert.equal(isVerifyDisabled('123456', false), false)
  })
})

describe('resend countdown', () => {
  test('it starts at 20 s and ticks down to done', () => {
    assert.equal(RESEND_COOLDOWN_SECONDS, 20)
    let seconds = RESEND_COOLDOWN_SECONDS
    let ticks = 0
    for (;;) {
      const tick = tickResendCooldown(seconds)
      ;({ seconds } = tick)
      ticks++
      if (tick.done) break
    }
    assert.equal(ticks, 20)
    assert.equal(seconds, 0)
  })

  test('the resend button is locked while counting down or loading, free otherwise', () => {
    assert.equal(isResendDisabled(5, false), true)
    assert.equal(isResendDisabled(0, true), true)
    assert.equal(isResendDisabled(0, false), false)
  })

  test('a failed resend uses the shared wording (throttle, network, server, refusal)', () => {
    assert.equal(describeGenericFailure(http(429)), 'notify.errors.tooManyRequests')
    assert.equal(describeGenericFailure(offline), 'notify.errors.networkError')
    assert.equal(describeGenericFailure(http(500)), 'notify.errors.serverError')
    assert.equal(describeGenericFailure(http(400)), 'notify.errors.requestFailed')
  })
})

describe('steps and social sign-in', () => {
  test('the indicator has 2 steps, 3 for a new account, and follows the step', () => {
    assert.equal(totalAuthSteps(false), 2)
    assert.equal(totalAuthSteps(true), 3)
    assert.deepEqual(['email', 'code', 'profile'].map(authStepIndex), [0, 1, 2])
  })

  test('a failed Google / Apple start: throttle or "sign-in failed"', () => {
    assert.equal(describeIdpStartFailure(http(429)), 'notify.errors.tooManyRequests')
    assert.equal(describeIdpStartFailure(http(500)), 'notify.errors.oauthFailed')
    assert.equal(describeIdpStartFailure(offline), 'notify.errors.oauthFailed')
  })
})

describe('return to the checkout after signing in', () => {
  test('the stashed return path survives only when it is a same-site page', () => {
    assert.equal(sanitizeReturnTo('/fr/checkout'), '/fr/checkout')
    assert.equal(sanitizeReturnTo('/en/menu?x=1#y'), '/en/menu?x=1#y')
    assert.equal(sanitizeReturnTo('/fr/me/orders'), '/fr/me/orders')
  })

  test('nothing, off-site, protocol-relative and scheme URLs are dropped', () => {
    assert.equal(sanitizeReturnTo(null), null)
    assert.equal(sanitizeReturnTo(undefined), null)
    assert.equal(sanitizeReturnTo(''), null)
    assert.equal(sanitizeReturnTo('https://evil.example/fr/checkout'), null)
    assert.equal(sanitizeReturnTo('//evil.example'), null)
    assert.equal(sanitizeReturnTo('javascript:alert(1)'), null)
    assert.equal(sanitizeReturnTo('fr/checkout'), null)
  })

  test('browser quirks that turn a "same-site" path into another host are refused', () => {
    // A browser reads `/\\evil.example` as `//evil.example`, and ignores a tab or newline inside the URL.
    assert.equal(sanitizeReturnTo('/\\evil.example'), null)
    assert.equal(sanitizeReturnTo('/fr/\\evil.example'), null)
    assert.equal(sanitizeReturnTo('/\t/evil.example'), null)
    assert.equal(sanitizeReturnTo('/\n/evil.example'), null)
    assert.equal(sanitizeReturnTo('/fr/menu\u0000'), null)
  })

  test('the auth pages themselves are never a return target (no login loop)', () => {
    assert.equal(sanitizeReturnTo('/fr/auth/login'), null)
    assert.equal(sanitizeReturnTo('/en/auth/callback'), null)
    assert.equal(sanitizeReturnTo('/fr/auth'), null)
    // A page whose name merely starts with "auth" is fine.
    assert.equal(sanitizeReturnTo('/fr/authors'), '/fr/authors')
  })

  test('a return path wins; otherwise an empty cart browses, a full cart heads to checkout', () => {
    assert.deepEqual(postAuthTarget('/fr/checkout', false), { kind: 'path', path: '/fr/checkout' })
    assert.deepEqual(postAuthTarget('/fr/checkout', true), { kind: 'path', path: '/fr/checkout' })
    assert.deepEqual(postAuthTarget(null, true), { kind: 'menu' })
    assert.deepEqual(postAuthTarget(null, false), { kind: 'checkout-if-open' })
  })
})

describe('remembering the page before a dead session sends the customer to the login', () => {
  /** Runs `fn` as a browser tab at `url` whose sessionStorage is `storage` (this file runs in plain Node). */
  const inTab = (url, storage, fn) => {
    const { pathname, search, hash } = new URL(url, 'https://shop.test')
    globalThis.window = { location: { pathname, search, hash } }
    globalThis.sessionStorage = storage
    try {
      fn()
    } finally {
      delete globalThis.window
      delete globalThis.sessionStorage
    }
  }
  const memory = () => {
    const data = new Map()
    return { data, setItem: (k, v) => data.set(k, v), getItem: (k) => data.get(k) ?? null }
  }

  test('keeps path, query and hash of the current page where useAuthCallback will read it', () => {
    const storage = memory()
    inTab('/fr/me/orders?tab=past#o-1', storage, rememberCurrentPage)
    assert.equal(storage.getItem('oidc_return_to'), '/fr/me/orders?tab=past#o-1')
  })

  test('keeps what was stored when the page is the auth flow (no login loop)', () => {
    const storage = memory()
    storage.setItem('oidc_return_to', '/fr/checkout')
    inTab('/fr/auth/login?session=expired', storage, rememberCurrentPage)
    assert.equal(storage.getItem('oidc_return_to'), '/fr/checkout')
  })

  test('does nothing without a window (SSR) and survives a storage that refuses writes', () => {
    assert.doesNotThrow(rememberCurrentPage)
    const refusing = {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    assert.doesNotThrow(() => {
      inTab('/fr/me', refusing, rememberCurrentPage)
    })
  })
})

describe('translations of the sign-in flow', () => {
  const flatten = (node, prefix = '', out = {}) => {
    for (const [k, v] of Object.entries(node)) {
      const full = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === 'object') flatten(v, full, out)
      else out[full] = v
    }
    return out
  }
  const KEYS = [
    'notify.errors.tooManyRequests',
    'notify.errors.networkError',
    'notify.errors.serverError',
    'notify.errors.requestFailed',
    'notify.errors.invalidCode',
    'notify.errors.oauthFailed',
    'notify.errors.sessionExpired',
    'notify.errors.undeliverableEmail',
    'notify.errors.invalidEmail',
    'login.sendCode',
    'login.codeSent',
    'login.codeLabel',
    'login.verify',
    'login.resendCode',
    'login.resendCooldown',
    'login.backToEmail',
    'login.stepEmail',
    'login.stepCode',
    'login.stepProfile',
    'login.completeSignup',
  ]
  for (const lang of ['fr', 'en', 'nl', 'zh']) {
    test(`every message of the flow exists in ${lang}, with its parameters`, () => {
      const messages = flatten(
        JSON.parse(readFileSync(new URL(`../locales/${lang}.json`, import.meta.url), 'utf8')),
      )
      for (const key of KEYS) {
        assert.equal(typeof messages[key], 'string', `${lang}: missing ${key}`)
        assert.notEqual(messages[key].trim(), '', `${lang}: empty ${key}`)
      }
      assert.match(messages['login.codeSent'], /\{email\}/u, `${lang}: codeSent shows the email`)
      assert.match(
        messages['login.resendCooldown'],
        /\{seconds\}/u,
        `${lang}: resendCooldown shows the seconds`,
      )
    })
  }
})
