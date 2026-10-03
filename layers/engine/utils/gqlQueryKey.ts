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
const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[k]
      if (v !== undefined) out[k] = stable(v)
    }
    return out
  }
  return value
}

export const gqlVariablesKey = (variables: Record<string, unknown> | undefined | null): string => {
  const stableVars = stable(variables ?? {}) as Record<string, unknown>
  return Object.keys(stableVars).length === 0 ? '' : hash(JSON.stringify(stableVars))
}

export const gqlQueryKey = (
  query: string,
  variables: Record<string, unknown> | undefined | null,
  locale: string,
): string => {
  const varsKey = gqlVariablesKey(variables)
  return `gql:${hash(query)}${varsKey ? `:${varsKey}` : ''}:${locale}`
}
