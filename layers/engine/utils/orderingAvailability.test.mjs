// The checkout gate: open, or closed with a bookable slot left today (audit M6).
// Run: `node --test layers/engine/utils/orderingAvailability.test.mjs`.

import {
  bookableSlots,
  canPlaceOrder,
  orderingStatus,
  preparationBufferMs,
} from './orderingAvailability.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const NOW = Date.parse('2026-10-01T09:00:00Z')
const at = (minutes) => new Date(NOW + minutes * 60_000).toISOString()
const slot = (minutes, label = 'xx:xx') => ({ label, value: at(minutes) })

test('open: orderable whatever the slots say', () => {
  const config = { orderingEnabled: true, isOrderingCurrentlyOpen: true, availableSlotsToday: [] }
  assert.equal(orderingStatus(config, NOW), 'open')
  assert.equal(canPlaceOrder(config, NOW), true)
})

test('closed with a bookable slot today: pre-order, orderable', () => {
  const config = {
    orderingEnabled: true,
    isOrderingCurrentlyOpen: false,
    availableSlotsToday: [slot(120, '19:00')],
    preparationMinutes: 30,
  }
  assert.equal(orderingStatus(config, NOW), 'preorder')
  assert.equal(canPlaceOrder(config, NOW), true)
})

test('closed with no slot left today: not orderable', () => {
  assert.equal(
    orderingStatus(
      { orderingEnabled: true, isOrderingCurrentlyOpen: false, availableSlotsToday: [] },
      NOW,
    ),
    'closed',
  )
  assert.equal(
    canPlaceOrder(
      { orderingEnabled: true, isOrderingCurrentlyOpen: false, availableSlotsToday: null },
      NOW,
    ),
    false,
  )
  assert.equal(canPlaceOrder({ orderingEnabled: true, isOrderingCurrentlyOpen: false }, NOW), false)
})

test('ordering switched off: never orderable, even when open or with slots', () => {
  const open = {
    orderingEnabled: false,
    isOrderingCurrentlyOpen: true,
    availableSlotsToday: [slot(120)],
  }
  assert.equal(orderingStatus(open, NOW), 'disabled')
  assert.equal(canPlaceOrder(open, NOW), false)
})

test('no config (not loaded): not orderable and reported as disabled, callers check the load state first', () => {
  assert.equal(canPlaceOrder(null, NOW), false)
  assert.equal(canPlaceOrder(undefined, NOW), false)
})

test('slots inside the preparation window no longer count (stale config)', () => {
  // 20 minutes from now with a 30 minute preparation time: too soon, like the slot picker says.
  const stale = {
    orderingEnabled: true,
    isOrderingCurrentlyOpen: false,
    availableSlotsToday: [slot(20), slot(25)],
    preparationMinutes: 30,
  }
  assert.equal(canPlaceOrder(stale, NOW), false)
  assert.deepEqual(bookableSlots(stale.availableSlotsToday, 30, NOW), [])
  // The same config a little earlier still has them.
  assert.equal(canPlaceOrder(stale, NOW - 15 * 60_000), true)
})

test('bookableSlots keeps the order and defaults the preparation time to 30 minutes', () => {
  const slots = [slot(10, 'a'), slot(31, 'b'), slot(60, 'c')]
  assert.deepEqual(
    bookableSlots(slots, undefined, NOW).map((s) => s.label),
    ['b', 'c'],
  )
  // A short configured time is raised to the backend's 15 minute floor (a slot 10 minutes away is refused there).
  assert.deepEqual(
    bookableSlots(slots, 5, NOW).map((s) => s.label),
    ['b', 'c'],
  )
})

test('the buffer mirrors the backend: max(preparation, 15 min), 30 only when there is no usable value', () => {
  assert.equal(preparationBufferMs(45), 45 * 60_000)
  assert.equal(preparationBufferMs(10), 15 * 60_000)
  assert.equal(preparationBufferMs(0), 15 * 60_000)
  assert.equal(preparationBufferMs(-5), 15 * 60_000)
  assert.equal(preparationBufferMs(null), 30 * 60_000)
  assert.equal(preparationBufferMs(undefined), 30 * 60_000)
  assert.equal(preparationBufferMs(Number.NaN), 30 * 60_000)
})

test('a slot exactly on the cut-off is still bookable (the backend only refuses a slot BEFORE it)', () => {
  assert.deepEqual(
    bookableSlots([slot(30, 'edge'), slot(29, 'early')], 30, NOW).map((s) => s.label),
    ['edge'],
  )
  assert.deepEqual(
    bookableSlots([slot(15, 'edge'), slot(14, 'early')], 0, NOW).map((s) => s.label),
    ['edge'],
  )
})
