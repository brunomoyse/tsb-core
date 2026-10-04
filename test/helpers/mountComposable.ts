// Runs a composable inside a real component instance (lifecycle hooks such as onUnmounted/onBeforeUnmount work) and
// returns what it returned, plus the wrapper to unmount it. Mounted into document.body so the real DOM is observable.
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

export function mountComposable<T>(setup: () => T, template?: () => ReturnType<typeof h>) {
  let result!: T
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return () => (template ? template() : h('div'))
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
