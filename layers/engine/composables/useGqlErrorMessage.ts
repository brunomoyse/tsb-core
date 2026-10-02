import { describeGqlError } from '#engine/utils/gqlErrors'
import { useI18n } from 'vue-i18n'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'

/**
 * `message(err, fallbackKey)` → the translated text for a failed GraphQL call.
 *
 * The backend's `extensions.code` is mapped to an i18n key (utils/gqlErrors.ts); anything the map
 * does not know shows the caller's own generic key. The raw backend message is never displayed.
 */
export function useGqlErrorMessage() {
    const { t } = useI18n()
    const { policy } = useOrderingPolicy()

    return (err: unknown, fallbackKey = 'notify.errors.requestFailed'): string => {
        const described = describeGqlError(err, policy.value)
        return described ? t(described.key, described.params ?? {}) : t(fallbackKey)
    }
}
