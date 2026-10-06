/*
 * The `?q=` of the menu page (audit PR 3.8, P9). The home page's schema.org SearchAction (and any shared link) points
 * at `/<locale>/menu?q=<term>`, which the menu never read: it opened unfiltered. It now starts with that term in its
 * search box. A repeated parameter takes the first one; the length is capped like what a person would type.
 */
export const MAX_SEARCH_LENGTH = 100

export const searchFromQuery = (q: unknown): string => {
  const value: unknown = Array.isArray(q) ? q[0] : q
  return typeof value === 'string' ? value.trim().slice(0, MAX_SEARCH_LENGTH) : ''
}
