import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MockOrder, MockState } from './state.ts'
import type { MollieBehavior, OrderPatch, PaymentStatus } from './types.ts'

/*
 * A stand-in for Mollie's hosted checkout. `createOrder` for an online order hands the app
 * `payment.links.checkout.href` = `<mock>/mollie/checkout/<orderId>`; the app then navigates there (full page load).
 * That page either shows buttons (scenario.mollie = 'ask': a spec clicks one) or answers on its own with the scenario's
 * result, then sends the browser back to `<app>/<locale>/order-completed/<orderId>` exactly like tsb-service's redirect URL.
 *
 * What the webhook would have done is applied first, in the same step, except for `open` / `pending`: the customer comes
 * back before the webhook landed (settle later with `mock.settleOrder`, which also pushes it over the subscription).
 */

/** The order and payment state each Mollie outcome leaves behind. */
const OUTCOMES: Record<PaymentStatus, OrderPatch> = {
  paid: { status: 'CONFIRMED', paymentStatus: 'paid' },
  failed: { status: 'FAILED', paymentStatus: 'failed' },
  canceled: { status: 'CANCELLED', paymentStatus: 'canceled' },
  expired: { status: 'CANCELLED', paymentStatus: 'expired' },
  open: { paymentStatus: 'open' },
  pending: { paymentStatus: 'pending' },
}

const BUTTONS: { result: PaymentStatus; label: string }[] = [
  { result: 'paid', label: 'Payer (paid)' },
  { result: 'failed', label: 'Paiement échoué (failed)' },
  { result: 'canceled', label: 'Annuler (canceled)' },
  { result: 'expired', label: 'Session expirée (expired)' },
  { result: 'open', label: 'Revenir sans confirmation (open)' },
]

export const isPaymentStatus = (value: string): value is PaymentStatus => value in OUTCOMES

function returnUrl(order: MockOrder, fallbackAppUrl: string): string {
  const origin = order.returnTo?.origin || fallbackAppUrl
  const locale = /^(fr|en|nl|zh)/u.exec(order.returnTo?.locale ?? '')?.[1] ?? 'fr'
  return `${origin}/${locale}/order-completed/${order.id}`
}

function redirect(res: ServerResponse, location: string): void {
  res.writeHead(302, { Location: location })
  res.end()
}

function page(res: ServerResponse, order: MockOrder): void {
  const links = BUTTONS.map(
    ({ result, label }) =>
      `<a data-testid="mollie-${result}" href="/mollie/pay/${order.id}/${result}">${label}</a>`,
  ).join('\n')
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mollie (mock)</title>
<style>body{font-family:system-ui;margin:2rem auto;max-width:28rem;padding:0 1rem}a{display:block;margin:.5rem 0;padding:.9rem;border:1px solid #888;border-radius:.5rem;text-decoration:none;color:#000}</style></head>
<body><h1 data-testid="mollie-page">Mollie (mock)</h1><p>Commande ${order.id}<br>Montant ${order.totalPrice} EUR</p>
${links}</body></html>`)
}

/** Handles `/mollie/...`; returns false when the URL is not one of ours. */
export function handleMollie(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  state: MockState,
  fallbackAppUrl: string,
): boolean {
  const checkout = /^\/mollie\/checkout\/([^/]+)$/u.exec(url.pathname)
  const pay = /^\/mollie\/pay\/([^/]+)\/([a-z]+)$/u.exec(url.pathname)
  if (!checkout && !pay) return false
  const order = state.orders.get((checkout ?? pay)?.[1] ?? '')
  if (!order || req.method !== 'GET') {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('mock mollie: unknown order')
    return true
  }
  if (pay) {
    const result = pay[2] ?? ''
    if (!isPaymentStatus(result)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.end(`mock mollie: unknown result ${result}`)
      return true
    }
    settle(state, order, result)
    redirect(res, returnUrl(order, fallbackAppUrl))
    return true
  }
  const behavior: MollieBehavior = state.scenario.mollie
  if (behavior === 'ask') page(res, order)
  else {
    settle(state, order, behavior)
    redirect(res, returnUrl(order, fallbackAppUrl))
  }
  return true
}

function settle(state: MockState, order: MockOrder, result: PaymentStatus): void {
  state.patchOrder(order.id, OUTCOMES[result])
}
