// useKeepTypedValue: a server-rendered email / tel field that was filled before hydration keeps its value in the model
// (Vue's v-model would otherwise write the empty model back over it); a model that has a value, and any setup that is not
// the first hydration, are left alone.
// Run: `vp test run layers/engine/composables/useKeepTypedValue.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { ref } from 'vue'
import { setFlags } from '../../../test/flags'
import { useKeepTypedValue } from './useKeepTypedValue'

// The real app: only its hydration flag is set (it is false once a test has run in the real runtime).
const hydrating = (value: boolean) => {
  useNuxtApp().isHydrating = value
}

const field = (id: string, value: string) => {
  const input = document.createElement('input')
  input.id = id
  input.type = 'email'
  document.body.append(input)
  input.value = value
  return input
}

beforeEach(() => {
  hydrating(true)
})
afterEach(() => {
  document.body.replaceChildren()
  hydrating(false)
})

describe('useKeepTypedValue', () => {
  it('copies what was typed into the empty model while the page hydrates', () => {
    field('auth-email', 'eva@example.com')
    const model = ref('')
    useKeepTypedValue(model, 'auth-email')
    expect(model.value).toBe('eva@example.com')
  })

  it('never overwrites a model that already has a value (a saved profile wins over the field)', () => {
    field('auth-email', 'typed@example.com')
    const model = ref('saved@example.com')
    useKeepTypedValue(model, 'auth-email')
    expect(model.value).toBe('saved@example.com')
  })

  it('does nothing when the field is empty or missing', () => {
    const model = ref('')
    useKeepTypedValue(model, 'nowhere')
    field('auth-email', '')
    useKeepTypedValue(model, 'auth-email')
    expect(model.value).toBe('')
  })

  it('does nothing after the first hydration: a field of the previous page must not leak into a new one', () => {
    field('auth-email', 'old@example.com')
    hydrating(false)
    const model = ref('')
    useKeepTypedValue(model, 'auth-email')
    expect(model.value).toBe('')
  })

  it('does nothing on the server', () => {
    setFlags({ server: true, client: false })
    field('auth-email', 'eva@example.com')
    const model = ref('')
    useKeepTypedValue(model, 'auth-email')
    expect(model.value).toBe('')
  })
})
