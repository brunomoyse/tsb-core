// A deterministic stand-in for vue-i18n's `t`: it returns the key (with its params), so a test asserts WHICH message
// A composable picked without depending on the wording of a locale file.
//
//   Vi.mock('vue-i18n', async (importOriginal) => {
//     Const { fakeI18n } = await import('../../../test/helpers/i18n')
//     Return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
//   })
//
//   Fakest('cart.undo')                 // 'cart.undo'
//   Fakest('cart.removedUndo', { name: 'Ramen' })   // 'cart.removedUndo{"name":"Ramen"}'
//   Fakest('cart.announce.added', { count: 2 }, 2)  // 'cart.announce.added{"count":2}#2'  (plural choice)
import { ref } from 'vue'

export function fakeT(key: string, params?: unknown, plural?: unknown): string {
  const named =
    params !== undefined &&
    typeof params === 'object' &&
    params !== null &&
    Object.keys(params).length > 0
      ? JSON.stringify(params)
      : ''
  const choice = typeof plural === 'number' ? `#${plural}` : ''
  return `${key}${named}${choice}`
}

export function fakeI18n() {
  return { t: fakeT, locale: ref('fr') }
}
