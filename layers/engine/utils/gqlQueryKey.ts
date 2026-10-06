import { hash } from 'ohash'

/*
 * The useAsyncData key of a GraphQL query (audit R3).
 *
 * It used to be `gql:<hash(document)>:<locale>`: the same document asked with different variables (two products
 * through the same PRODUCT_QUERY, a deck of orders by page) shared one data slot and one SSR payload entry, so
 * once the server render and the hydration reuse the payload by key (audit PR 3.7) the second caller got the
 * first one's answer. The variables are part of the key now.
 *
 * `{}`, `undefined` and a variable set to `undefined` all mean "no variables" and keep the short key, so the keys
 * of the queries without variables are the same as before. Object keys are sorted, so `{ a, b }` and `{ b, a }`
 * are the same query.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const stableRecord = (value: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(value).sort()) {
    const v = value[k]
    if (v !== undefined) out[k] = stable(v)
  }
  return out
}

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable)
  if (isRecord(value)) return stableRecord(value)
  return value
}

export const gqlVariablesKey = (variables: Record<string, unknown> | undefined | null): string => {
  const stableVars = stableRecord(variables ?? {})
  return Object.keys(stableVars).length === 0 ? '' : hash(JSON.stringify(stableVars))
}

export const gqlQueryKey = (
  query: string,
  variables: Record<string, unknown> | undefined | null,
  locale: string,
): string => {
  const varsKey = gqlVariablesKey(variables)
  return `gql:${hash(query)}${varsKey === '' ? '' : `:${varsKey}`}:${locale}`
}
