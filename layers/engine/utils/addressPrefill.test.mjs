// Run: `vp test run layers/engine/utils/addressPrefill.test.mjs`.

import assert from 'node:assert/strict'
import { createAddressPrefill } from './addressPrefill.ts'
import { test } from 'vite-plus/test'

const setup = (userAddress = null, cartAddress = null) => {
  const state = { user: userAddress, cart: cartAddress }
  const prefill = createAddressPrefill({
    userAddress: () => state.user,
    cartAddress: () => state.cart,
    setCartAddress: (address) => {
      state.cart = address
    },
  })
  return { state, ...prefill }
}

const home = { id: 'home' }
const work = { id: 'work' }

test('the saved address fills an empty cart', () => {
  const { state, prefill } = setup(home)
  prefill()
  assert.equal(state.cart, home)
})

test('an address already in the cart is not replaced', () => {
  const { state, prefill } = setup(home, work)
  prefill()
  assert.equal(state.cart, work)
})

test('it happens once: a cleared address does not come back', () => {
  const { state, prefill } = setup(home)
  prefill()
  state.cart = null
  prefill()
  assert.equal(state.cart, null)
})

test('nothing to copy before the user record arrives, then it fills', () => {
  const { state, prefill } = setup(null)
  prefill()
  assert.equal(state.cart, null)
  state.user = home
  prefill()
  assert.equal(state.cart, home)
})

test('a dropped session takes its address along, and re-arms the pre-fill', () => {
  const { state, prefill, onUserChanged } = setup(home)
  prefill()
  state.user = null
  onUserChanged(null)
  assert.equal(state.cart, null)
  state.user = home
  prefill()
  assert.equal(state.cart, home)
})

test('a dropped session keeps an address the customer chose themselves', () => {
  const { state, prefill, onUserChanged } = setup(home)
  prefill()
  state.cart = work
  state.user = null
  onUserChanged(null)
  assert.equal(state.cart, work)
})

test('a user that is still there changes nothing', () => {
  const { state, prefill, onUserChanged } = setup(home)
  prefill()
  onUserChanged({ id: 'u' })
  assert.equal(state.cart, home)
})
