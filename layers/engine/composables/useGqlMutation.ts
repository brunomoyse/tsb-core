// Composables: useGqlMutation.ts
import { ref } from 'vue'
import { useNuxtApp } from '#imports'

type Vars = Record<string, unknown>

/**
 * Returns a mutate() you can await anywhere (even inside handlers),
 * plus reactive data/loading/error for your UI. Failures throw (and `error` holds) a `GqlError`:
 * show `useGqlErrorMessage()(err)`, never `err.message`.
 */
export function useGqlMutation<T = unknown>(mutation: string) {
  const { $gqlFetch } = useNuxtApp()
  const data = ref<T>()
  const loading = ref(false)
  const error = ref<unknown>()
  // Calls in flight: `loading` stays true until the last one is done (a double tap must not look finished after the first answer).
  let inFlight = 0

  /** Call this and await the result */
  const mutate = async (variables: Vars = {}): Promise<T> => {
    inFlight += 1
    loading.value = true
    error.value = undefined
    try {
      const res = await $gqlFetch<T>(mutation, { variables })
      data.value = res
      return res
    } catch (e) {
      error.value = e
      throw e
    } finally {
      inFlight -= 1
      loading.value = inFlight > 0
    }
  }

  return { mutate, data, loading, error }
}
