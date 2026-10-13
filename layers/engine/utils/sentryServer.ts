/*
 * The server side's own Sentry filter. Scanners reach the shop by its bare IP with a Host header no URL parser accepts
 * (`149.202.059.064`: an IPv4 address with a leading zero), and every h3 helper that rebuilds the request URL (the i18n
 * locale detection first) throws "Invalid URL" (TSB-CORE-6/K, curl). No visitor sends such a request, so its errors are
 * dropped rather than reported.
 */

/** What the filter reads of a Sentry event. */
interface RequestEvent {
  request?: { url?: string }
}

/** Whether the event comes from a request whose URL, as Sentry recorded it, does not parse. */
export function isMalformedRequest(event: RequestEvent): boolean {
  const url = event.request?.url
  return typeof url === 'string' && url !== '' && !URL.canParse(url)
}
