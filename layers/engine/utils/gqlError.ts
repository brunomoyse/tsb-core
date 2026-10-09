/*
 * The one error type every GraphQL call of the engine throws ($gqlFetch, useGqlQuery,
 * useGqlMutation), replacing the plain `errors` array the transport used to throw (audit R9):
 * a real Error for Sentry (stack, grouping), with the stable backend `code` for the UI.
 *
 * Customer-facing text NEVER comes from `message` (English, backend wording): map the `code`
 * with `describeGqlError` (utils/gqlErrors.ts) / `useGqlErrorMessage()`.
 */

export interface GqlErrorEntry {
  message: string
  path?: (string | number)[]
  extensions?: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const numberOf = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined

/** The optional `path` / `extensions` of an error entry received over the wire, kept only when well-formed. */
const entryDetails = (
  entry: Record<string, unknown>,
): Pick<GqlErrorEntry, 'path' | 'extensions'> => {
  const { path, extensions } = entry
  const segments = Array.isArray(path)
    ? path.filter(
        (part): part is string | number => typeof part === 'string' || typeof part === 'number',
      )
    : []
  return {
    ...(segments.length > 0 ? { path: segments } : {}),
    ...(isRecord(extensions) ? { extensions } : {}),
  }
}

export interface GqlErrorInit {
  operationName?: string | null
  /** HTTP status when the request itself failed (not a GraphQL `errors` response). */
  status?: number | null
  cause?: unknown
}

/** Codes the transport itself produces (the backend sends none of these). */
export const GQL_NETWORK_ERROR = 'NETWORK_ERROR'
export const GQL_HTTP_ERROR = 'HTTP_ERROR'

export class GqlError extends Error {
  /** `extensions.code` of the first error ("PRODUCT_NOT_FOUND"), null when the backend sent none (old service). */
  readonly code: string | null
  /** `extensions` of the first error: the code plus its parameters (`field`, `productId`, `minimum`). */
  readonly extensions: Record<string, unknown>
  /** Every error of the response, as received. */
  readonly errors: GqlErrorEntry[]
  readonly operationName: string | null
  readonly status: number | null

  constructor(errors: GqlErrorEntry[], init: GqlErrorInit = {}) {
    const [first] = errors
    super(
      first?.message ?? 'GraphQL request failed',
      init.cause === undefined ? undefined : { cause: init.cause },
    )
    this.name = 'GqlError'
    this.errors = errors
    this.extensions = first?.extensions ?? {}
    const { code } = this.extensions
    this.code = typeof code === 'string' ? code : null
    this.operationName = init.operationName ?? null
    this.status = init.status ?? null
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /** True when any error of the response has this code (the first one wins for `code`). */
  hasCode(code: string): boolean {
    return this.errors.some((entry) => entry.extensions?.code === code)
  }

  /**
   * A failed HTTP request / dropped connection, wrapped so callers only ever deal with GqlError.
   * A non-2xx response that still carries a GraphQL `errors` body (gqlgen answers a query that
   * fails validation with HTTP 422, for instance) keeps those errors, so their `extensions.code`
   * (GRAPHQL_VALIDATION_FAILED...) stays readable.
   */
  static fromTransport(err: unknown, operationName: string | null = null): GqlError {
    const raw = isRecord(err) ? err : null
    const status = numberOf(raw?.status) ?? numberOf(raw?.statusCode) ?? null
    const data = raw?.data
    const rawErrors = isRecord(data) ? data.errors : undefined
    const bodyErrors: unknown[] = Array.isArray(rawErrors) ? rawErrors : []
    const entries = bodyErrors.flatMap((entry): GqlErrorEntry[] =>
      isRecord(entry) && typeof entry.message === 'string'
        ? [{ message: entry.message, ...entryDetails(entry) }]
        : [],
    )
    if (entries.length > 0) return new GqlError(entries, { operationName, status, cause: err })
    const code = status !== null && status !== 0 ? GQL_HTTP_ERROR : GQL_NETWORK_ERROR
    const message = typeof raw?.message === 'string' ? raw.message : 'Request failed'
    return new GqlError([{ message, extensions: { code } }], { operationName, status, cause: err })
  }
}

export const isGqlError = (err: unknown): err is GqlError => err instanceof GqlError

/**
 * The GqlError behind an error, if any. `useAsyncData` (so `useGqlQuery`) wraps what its handler
 * throws in a NuxtError whose `cause` is the original, so `error.value` needs this to be read.
 */
export function unwrapGqlError(err: unknown): GqlError | null {
  let current: unknown = err
  for (let depth = 0; depth < 3 && isRecord(current); depth++) {
    if (current instanceof GqlError) return current
    current = current.cause
  }
  return null
}

/** Normalises whatever a transport hands over (graphql-ws sends an array of GraphQL errors) to an Error. */
export function toGqlError(err: unknown, operationName: string | null = null): Error {
  if (err instanceof Error) return err
  if (Array.isArray(err) && err.length > 0) {
    return new GqlError(
      err.map((entry: unknown): GqlErrorEntry => {
        const fields = isRecord(entry) ? entry : {}
        return {
          message: typeof fields.message === 'string' ? fields.message : 'GraphQL error',
          ...entryDetails(fields),
        }
      }),
      { operationName },
    )
  }
  return new Error(String(err))
}

/** "query Foo { ... }" → "Foo" (null for anonymous operations). */
export const operationNameOf = (query: string): string | null =>
  /\b(?:query|mutation|subscription)\s+(?<name>\w+)/u.exec(query)?.groups?.name ?? null

/**
 * An aborted request is control flow (a refresh cancelled the previous call), not a failure.
 * ofetch wraps the browser's AbortError in a FetchError (and the transport in a GqlError), so the
 * cause chain is read too.
 */
export const isAbortError = (err: unknown): boolean => {
  let current: unknown = err
  for (let depth = 0; depth < 3 && isRecord(current); depth++) {
    if (current.name === 'AbortError') return true
    current = current.cause
  }
  return false
}

/*
 * What the browser's own `fetch` rejects with when the request never got an answer (offline, the connection dropped,
 * the tab was suspended): a plain TypeError whose message depends on the browser. Safari says "Load failed", Chrome
 * "Failed to fetch", Firefox "NetworkError when attempting to fetch resource.". Code that calls `fetch` directly (e.g.
 * oidc-client-ts reading Zitadel's discovery document) gets it without the FetchError ofetch would wrap it in.
 */
const BROWSER_NETWORK_FAILURE =
  /^(?:Load failed|Failed to fetch|NetworkError when attempting to fetch resource\.?|The network connection was lost\.?|The Internet connection appears to be offline\.?)$/u

/** A dropped connection reported by the browser's `fetch`, as opposed to a TypeError of our own code. */
const isBrowserNetworkFailure = (err: unknown): boolean =>
  err instanceof TypeError && BROWSER_NETWORK_FAILURE.test(err.message)

/*
 * Codes that mean "our fault" (the backend flags the same ones as unexpected): reported to Sentry.
 * Every other code is the customer's input or session and is only shown, never reported.
 */
const SERVER_FAULT_CODES = new Set([
  'ORDER_CREATE_FAILED',
  'PAYMENT_FAILED',
  'COUPON_RESERVE_FAILED',
  'ADDRESS_UNRESOLVABLE',
  'INTERNAL_SERVER_ERROR',
])

/** Whether an error deserves a Sentry event (see utils/reportError.ts). */
export function isReportableError(raw: unknown): boolean {
  if (isAbortError(raw) || isBrowserNetworkFailure(raw)) return false
  const err = unwrapGqlError(raw)
  if (!err) {
    /*
     * A REST call that failed (the OTP / address endpoints use $fetch): a 4xx is the customer's
     * input (wrong code, unknown address) and a FetchError without a status is a dropped connection.
     */
    const http = isRecord(raw) ? raw : null
    const response = http?.response
    const status =
      numberOf(http?.status) ??
      numberOf(http?.statusCode) ??
      (isRecord(response) ? numberOf(response.status) : undefined)
    if (status !== undefined && status !== 0) return status >= 500
    return http?.name !== 'FetchError'
  }
  if (err.code === GQL_NETWORK_ERROR) return false
  if (err.code === GQL_HTTP_ERROR) return (err.status ?? 0) >= 500
  // No code at all: an error of an old backend, i.e. unclassified.
  return err.code === null || SERVER_FAULT_CODES.has(err.code)
}
