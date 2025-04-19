// composables/useGqlMutation.ts
import { ref } from 'vue'
import { print } from 'graphql'
import { useNuxtApp } from '#imports'

type Vars = Record<string, unknown>

export function useGqlMutation<T = unknown>(
    rawMutation: string | import('graphql').DocumentNode,
) {
  const { $gqlFetch } = useNuxtApp()

  const data     = ref<T>()
  const loading  = ref(false)
  const error    = ref<any>()

  async function execute(variables: Vars = {}) {
    loading.value = true
    error.value   = undefined
    try {
      data.value = await $gqlFetch<T>(printIfAst(rawMutation), { variables })
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
    return data.value
  }

  return { execute, data, loading, error }
}

function printIfAst(q: string | import('graphql').DocumentNode): string {
  return typeof q === 'string' ? q : print(q)
}
