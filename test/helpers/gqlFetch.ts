// `$gqlFetch` is the GraphQL transport of the app (plugins/gqlFetch.ts) and the boundary of every composable that asks
// The API (`useGqlMutation`, `useGqlQuery`, `useNuxtApp().$gqlFetch`). Nuxt defines the plugin's `$gqlFetch` as a
// Read-only getter on the app, so a test wraps `useNuxtApp` instead (the real app, with `$gqlFetch` swapped):
//
//   Const gqlFetch = vi.hoisted(() => vi.fn())
//   MockNuxtImport('useNuxtApp', async (original) => {
//     Const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
//     Return () => withGqlFetch(original(), gqlFetch)
//   })
//
// Any other property still reads from the real Nuxt app.
export function withGqlFetch<T extends object>(app: T, gqlFetch: unknown): T {
  return new Proxy(app, {
    get(target, key, receiver) {
      return key === '$gqlFetch' ? gqlFetch : Reflect.get(target, key, receiver)
    },
  })
}
