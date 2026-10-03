import { useLocalePath, useRuntimeConfig } from '#imports'

/**
 * Absolute, localized URL of a page of the site: `localizedUrl('/menu')` is `https://<domain>/fr/menu` in French.
 * For structured data and share tags, which must name the page a crawler lands on rather than a path that redirects
 * (audit PR 3.8, P9). `localizedUrl()` is the home page.
 */
export function useLocalizedUrl() {
  const localePath = useLocalePath()
  const baseUrl = (useRuntimeConfig().public.baseUrl as string).replace(/\/$/u, '')
  return (path = '/'): string => `${baseUrl}${localePath(path)}`
}
