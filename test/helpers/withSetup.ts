// Runs a composable inside a real component setup (a throw-away component mounted into the Nuxt test app), so that
// `onMounted`, `onScopeDispose`, `onBeforeUnmount`, `useId`, injections and `getCurrentScope` behave as in a page.
//
//   const { result, unmount } = withSetup(() => useOrderCompleted('o-1'))
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

export function withSetup<T>(setup: () => T): { result: T; unmount: () => void } {
  let result: T | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return () => h('div')
      },
    }),
  )
  return {
    result: result as T,
    unmount: () => {
      wrapper.unmount()
    },
  }
}
