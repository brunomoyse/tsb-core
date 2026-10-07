// lastOrder: which past order the "your last order" bar offers again, and how it is summed up.
// Run: `vp test run layers/engine/utils/lastOrder.test.mjs`.

import { pickReorderableOrder, summarizeOrder } from './lastOrder.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

const product = (id, over = {}) => ({
  id,
  name: `Product ${id}`,
  isAvailable: true,
  isVisible: true,
  price: '5.00',
  choices: [],
  choiceGroups: [],
  ...over,
})

const item = (id, quantity = 1, over = {}) => ({
  quantity,
  product: product(id, over),
  choice: null,
  selections: [],
})

const order = (id, status, createdAt, items = [item('p1')]) => ({ id, status, createdAt, items })

test('offers the most recent delivered or picked-up order, whatever the order of the list', () => {
  const older = order('old', 'DELIVERED', '2026-09-01T18:00:00Z')
  const newer = order('new', 'PICKED_UP', '2026-10-01T18:00:00Z')
  assert.equal(pickReorderableOrder([older, newer])?.id, 'new')
  assert.equal(pickReorderableOrder([newer, older])?.id, 'new')
})

test('offers nothing while an order is still in progress: the customer is waiting for food', () => {
  for (const status of [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'AWAITING_PICK_UP',
    'OUT_FOR_DELIVERY',
  ]) {
    const orders = [
      order('done', 'DELIVERED', '2026-09-01T18:00:00Z'),
      order('live', status, '2026-10-01T18:00:00Z'),
    ]
    assert.equal(pickReorderableOrder(orders), null, status)
  }
})

test('passes over cancelled and failed orders to the last one that reached the customer', () => {
  const orders = [
    order('cancelled', 'CANCELLED', '2026-10-02T18:00:00Z'),
    order('failed', 'FAILED', '2026-10-01T18:00:00Z'),
    order('delivered', 'DELIVERED', '2026-09-20T18:00:00Z'),
  ]
  assert.equal(pickReorderableOrder(orders)?.id, 'delivered')
})

test('skips an order none of whose products can be ordered any more', () => {
  const gone = order('gone', 'DELIVERED', '2026-10-01T18:00:00Z', [
    item('p1', 1, { isAvailable: false }),
  ])
  const ok = order('ok', 'DELIVERED', '2026-09-01T18:00:00Z')
  assert.equal(pickReorderableOrder([gone, ok])?.id, 'ok')
  assert.equal(pickReorderableOrder([gone]), null)
})

test('offers nothing without orders', () => {
  assert.equal(pickReorderableOrder([]), null)
})

test('sums an order up by its first product names, the lines left out and its units', () => {
  const summary = summarizeOrder({ items: [item('a', 2), item('b'), item('c', 3)] })
  assert.deepEqual(summary, { names: ['Product a', 'Product b'], more: 1, units: 6 })
  assert.deepEqual(summarizeOrder({ items: [item('a')] }, 3), {
    names: ['Product a'],
    more: 0,
    units: 1,
  })
})
