// Runs a composable inside a real component instance (lifecycle hooks such as onMounted / onUnmounted / onScopeDispose,
// `useId` and injections behave as in a page) and returns what it returned, plus the wrapper to unmount it.
//
//   const { result, unmount } = mountComposable(() => useOrderCompleted('o-1'))
//   const { result } = mountComposable(() => useFocusTrap(...), { attach: true })   // in document.body: real DOM focus
//
// Every mounted component is unmounted after the test (test/setup/vue.ts); `unmount` ends one earlier.
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

export function mountComposable<T>(setup: () => T, options: { attach?: boolean } = {}) {
  let result!: T
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return () => h('div')
      },
    }),
    options.attach === false ? {} : { attachTo: document.body },
  )
  return {
    result,
    wrapper,
    unmount: () => {
      wrapper.unmount()
    },
  }
}

/** Same, inside the real Nuxt app (i18n, router, auto-imports available to the composable, as in a page). */
export async function mountComposableInNuxt<T>(setup: () => T) {
  const { mountSuspended } = await import('@nuxt/test-utils/runtime')
  let result!: T
  const wrapper = await mountSuspended(
    defineComponent({
      setup() {
        result = setup()
        return () => h('div')
      },
    }),
    { attachTo: document.body },
  )
  return {
    result,
    wrapper,
    unmount: () => {
      wrapper.unmount()
    },
  }
}
