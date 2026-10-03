// The checkout gate: open, or closed with a bookable slot left today (audit M6).
// Run: `vp test run layers/engine/utils/orderingAvailability.test.mjs`.

import {
  bookableSlots,
  canPlaceOrder,
  orderingStatus,
  preparationBufferMs,
} from './orderingAvailability.ts'
import assert from 'node:assert/strict'
import { DEFAULT_ORDERING_POLICY as policy } from './orderingPolicy.ts'
import { test } from 'vite-plus/test'

const NOW = Date.parse('2026-10-01T09:00:00Z')
const at = (minutes) => new Date(NOW + minutes * 60_000).toISOString()
const slot = (minutes, label = 'xx:xx') => ({ label, value: at(minutes) })

test('open: orderable whatever the slots say', () => {
  const config = { orderingEnabled: true, isOrderingCurrentlyOpen: true, availableSlotsToday: [] }
  assert.equal(orderingStatus(config, NOW, policy), 'open')
  assert.equal(canPlaceOrder(config, NOW, policy), true)
})

test('closed with a bookable slot today: pre-order, orderable', () => {
  const config = {
    orderingEnabled: true,
    isOrderingCurrentlyOpen: false,
    availableSlotsToday: [slot(120, '19:00')],
    preparationMinutes: 30,
  }
  assert.equal(orderingStatus(config, NOW, policy), 'preorder')
  assert.equal(canPlaceOrder(config, NOW, policy), true)
})

test('closed with no slot left today: not orderable', () => {
  assert.equal(
    orderingStatus(
      { orderingEnabled: true, isOrderingCurrentlyOpen: false, availableSlotsToday: [] },
      NOW,
      policy,
    ),
    'closed',
  )
  assert.equal(
    canPlaceOrder(
      { orderingEnabled: true, isOrderingCurrentlyOpen: false, availableSlotsToday: null },
      NOW,
      policy,
    ),
    false,
  )
  assert.equal(
    canPlaceOrder({ orderingEnabled: true, isOrderingCurrentlyOpen: false }, NOW, policy),
    false,
  )
})

test('ordering switched off: never orderable, even when open or with slots', () => {
  const open = {
    orderingEnabled: false,
    isOrderingCurrentlyOpen: true,
    availableSlotsToday: [slot(120)],
  }
  assert.equal(orderingStatus(open, NOW, policy), 'disabled')
  assert.equal(canPlaceOrder(open, NOW, policy), false)
})

test('no config (not loaded): not orderable and reported as disabled, callers check the load state first', () => {
  assert.equal(canPlaceOrder(null, NOW, policy), false)
  assert.equal(canPlaceOrder(undefined, NOW, policy), false)
})

test('slots inside the preparation window no longer count (stale config)', () => {
  // 20 minutes from now with a 30 minute preparation time: too soon, like the slot picker says.
  const stale = {
    orderingEnabled: true,
    isOrderingCurrentlyOpen: false,
    availableSlotsToday: [slot(20), slot(25)],
    preparationMinutes: 30,
  }
  assert.equal(canPlaceOrder(stale, NOW, policy), false)
  assert.deepEqual(
    bookableSlots(stale.availableSlotsToday, { preparationMinutes: 30, nowMs: NOW }, policy),
    [],
  )
  // The same config a little earlier still has them.
  assert.equal(canPlaceOrder(stale, NOW - 15 * 60_000, policy), true)
})

test('bookableSlots keeps the order and defaults the preparation time to 30 minutes', () => {
  const slots = [slot(10, 'a'), slot(31, 'b'), slot(60, 'c')]
  assert.deepEqual(
    bookableSlots(slots, { preparationMinutes: undefined, nowMs: NOW }, policy).map((s) => s.label),
    ['b', 'c'],
  )
  // A short configured time is raised to the backend's 15 minute floor (a slot 10 minutes away is refused there).
  assert.deepEqual(
    bookableSlots(slots, { preparationMinutes: 5, nowMs: NOW }, policy).map((s) => s.label),
    ['b', 'c'],
  )
})

test('the buffer mirrors the backend: max(preparation, 15 min), 30 only when there is no usable value', () => {
  assert.equal(preparationBufferMs(45, policy), 45 * 60_000)
  assert.equal(preparationBufferMs(10, policy), 15 * 60_000)
  assert.equal(preparationBufferMs(0, policy), 15 * 60_000)
  assert.equal(preparationBufferMs(-5, policy), 15 * 60_000)
  assert.equal(preparationBufferMs(null, policy), 30 * 60_000)
  assert.equal(preparationBufferMs(undefined, policy), 30 * 60_000)
  assert.equal(preparationBufferMs(Number.NaN, policy), 30 * 60_000)
})

test('a slot exactly on the cut-off is still bookable (the backend only refuses a slot BEFORE it)', () => {
  assert.deepEqual(
    bookableSlots(
      [slot(30, 'edge'), slot(29, 'early')],
      { preparationMinutes: 30, nowMs: NOW },
      policy,
    ).map((s) => s.label),
    ['edge'],
  )
  assert.deepEqual(
    bookableSlots(
      [slot(15, 'edge'), slot(14, 'early')],
      { preparationMinutes: 0, nowMs: NOW },
      policy,
    ).map((s) => s.label),
    ['edge'],
  )
})

test("the preparation floor is the policy's, not a constant", () => {
  const floor = { minimumPreparationMinutes: 25 }
  assert.equal(preparationBufferMs(10, floor), 25 * 60_000)
  assert.equal(preparationBufferMs(45, floor), 45 * 60_000)
  assert.deepEqual(
    bookableSlots(
      [slot(24, 'early'), slot(25, 'edge')],
      { preparationMinutes: 0, nowMs: NOW },
      floor,
    ).map((s) => s.label),
    ['edge'],
  )
})
