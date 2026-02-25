// Composables: useGqlMutation.ts
import { type DocumentNode, print } from 'graphql'
import { ref } from 'vue'
import { useNuxtApp } from '#imports'

type Vars = Record<string, unknown>

/**
 * Returns a mutate() you can await anywhere (even inside handlers),
 * plus reactive data/loading/error for your UI.
 */
export function useGqlMutation<T = unknown>(
    rawMutation: string | DocumentNode,
) {
  const { $gqlFetch } = useNuxtApp()
  const data    = ref<T>()
  const loading = ref(false)
  const error   = ref<unknown>()

  /** Call this and await the result */
  const mutate = async (variables: Vars = {}): Promise<T> => {
    loading.value = true
    error.value   = undefined
    try {
      const queryStr = typeof rawMutation === 'string'
          ? rawMutation
          : print(rawMutation)

      const res = await $gqlFetch<T>(queryStr, { variables })
      data.value = res
      return res
    } catch (e) {
      error.value = e
      throw e
    } finally {
      loading.value = false
    }
  }

  return { mutate, data, loading, error }
}
