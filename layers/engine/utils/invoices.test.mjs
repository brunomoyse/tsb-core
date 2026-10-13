// Per-brand invoice download switch.
// Run: `vp test run layers/engine/utils/invoices.test.mjs`.

import assert from 'node:assert/strict'
import { brandIssuesInvoices } from './invoices.ts'
import { test } from 'vite-plus/test'

test('invoices are issued unless the brand turns them off', () => {
  assert.equal(brandIssuesInvoices(undefined), true)
  assert.equal(brandIssuesInvoices(true), true)
  assert.equal(brandIssuesInvoices(false), false)
})
