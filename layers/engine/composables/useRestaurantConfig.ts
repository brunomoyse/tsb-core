import { type ApiOrderingPolicy, ORDERING_POLICY_SELECTION, isPolicyUnsupportedError } from '#engine/utils/orderingPolicy'
import { type Ref, effectScope, shallowRef, watch } from 'vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { requestQuoteRefresh } from './useOrderQuote'
import { useGqlQuery } from './useGqlQuery'
import { useGqlSubscription } from './useGqlSubscription'
import { useState } from '#imports'

/*
 * The restaurant config: hours, the ordering switch, today's slots and (audit PR 4.5) the ordering policy the
 * backend enforces. `policy` is asked only while the backend knows the field: the first validation error that
 * names it switches to the legacy documents for good (`policyUnsupported`), and an old service keeps working with
 * the default policy (see useOrderingPolicy).
 */
const configFields = (withPolicy: boolean) => `
    orderingEnabled
    openingHours
    orderingHours
    preparationMinutes
    isCurrentlyOpen
    isOrderingCurrentlyOpen
    availableSlotsToday { label value isLunchOnlyAllowed }
    nextOpeningAt
    ${withPolicy ? ORDERING_POLICY_SELECTION : ''}
`

const RESTAURANT_CONFIG_QUERY = gql(`query RestaurantConfig { restaurantConfig { ${configFields(true)} } }`)
const RESTAURANT_CONFIG_QUERY_LEGACY = gql(`query RestaurantConfig { restaurantConfig { ${configFields(false)} } }`)
const SUB_RESTAURANT_CONFIG = gql(`subscription RestaurantConfigUpdated { restaurantConfigUpdated { ${configFields(true)} } }`)
const SUB_RESTAURANT_CONFIG_LEGACY = gql(`subscription RestaurantConfigUpdated { restaurantConfigUpdated { ${configFields(false)} } }`)

export interface RestaurantTimeSlot {
    label: string
    value: string
    isLunchOnlyAllowed: boolean
}

export interface RestaurantConfig {
    orderingEnabled: boolean
    openingHours: Record<string, { open: string; close: string; dinnerOpen?: string; dinnerClose?: string } | null>
    orderingHours: Record<string, { open: string; close: string; dinnerOpen?: string; dinnerClose?: string } | null> | null
    preparationMinutes: number
    isCurrentlyOpen: boolean
    isOrderingCurrentlyOpen: boolean
    availableSlotsToday: RestaurantTimeSlot[]
    nextOpeningAt: string | null
    /** Absent from an old backend (see useOrderingPolicy for the default). */
    policy?: ApiOrderingPolicy
}

export interface RestaurantConfigResponse { restaurantConfig: RestaurantConfig }

interface UseRestaurantConfigOptions {
    // When true, don't block on the initial query — callers render a loading state via the returned `pending` ref. Default preserves the original awaited semantics.
    lazy?: boolean
}

/*
 * The config is ONE value per app (audit R4): every call site of `useRestaurantConfig` and `useOrderingPolicy` reads
 * this state, and a single `restaurantConfigUpdated` subscription (`ensureLiveUpdates`) merges into it. It used to be
 * a subscription per call site, 2-3 identical ones on every page.
 */
export const useRestaurantConfigState = () => useState<RestaurantConfigResponse | null>('restaurant-config', () => null)

/** The backend does not know `RestaurantConfig.policy` (old service): the legacy documents are used from now on. */
const usePolicyUnsupported = () => useState<boolean>('restaurant-config-policy-unsupported', () => false)

/**
 * Opens the one `restaurantConfigUpdated` subscription of the app (browser only; nothing to push to a server render).
 * It lives in a detached effect scope so it is not tied to the component that happened to ask first: it keeps feeding
 * the shared state across client-side navigations, with the shared WebSocket client of useGqlSubscription.
 */
function ensureLiveUpdates(state: Ref<RestaurantConfigResponse | null>, policyUnsupported: Ref<boolean>, started: Ref<boolean>) {
    if (!import.meta.client || started.value) return
    started.value = true

    const subscribe = (withPolicy: boolean) => {
        const sub = useGqlSubscription<{ restaurantConfigUpdated: RestaurantConfig }>(
            print(withPolicy ? SUB_RESTAURANT_CONFIG : SUB_RESTAURANT_CONFIG_LEGACY),
        )
        watch(sub.data, (val) => {
            // An update that arrives before the initial query resolved is dropped: that query is up to date anyway.
            if (!val?.restaurantConfigUpdated || !state.value) return
            state.value = {
                ...state.value,
                restaurantConfig: { ...state.value.restaurantConfig, ...val.restaurantConfigUpdated },
            }
            // Hours, ordering switched off, slots, policy: what the quote of the cart on screen may now say differently.
            requestQuoteRefresh()
        })
        if (withPolicy) {
            // An old backend refuses the subscription document that names `policy`: ask the legacy one instead.
            const stopWatchingError = watch(sub.error, (err) => {
                if (!err || !isPolicyUnsupportedError(err)) return
                stopWatchingError()
                sub.stop()
                policyUnsupported.value = true
                scope.run(() => subscribe(false))
            })
        }
    }

    const scope = effectScope(true)
    scope.run(() => subscribe(!policyUnsupported.value))
}

export async function useRestaurantConfig(options: UseRestaurantConfigOptions = {}) {
    const state = useRestaurantConfigState()
    const policyUnsupported = usePolicyUnsupported()
    const subscriptionStarted = useState<boolean>('restaurant-config-subscribed', () => false)

    /*
     * Register the subscription and the watcher synchronously, before any await. After an `await`, Vue's active
     * effect-scope binding is fragile and the watch can leak across CSR navigations — manifesting as a "Cannot
     * destructure property 'bum' of 'v' as it is null" crash when the next page's Suspense unmounts and the stale
     * watch still mutates state on the unmounting component.
     *
     * The watcher follows the query's `data` (known after the await) through `answer`, so the answer of a later
     * refresh or of a language change replaces the shared state, which also drops whatever the subscription had
     * merged into the previous answer.
     */
    ensureLiveUpdates(state, policyUnsupported, subscriptionStarted)
    const answer = shallowRef<(() => RestaurantConfigResponse | null | undefined) | null>(null)
    watch(() => answer.value?.() ?? null, (fresh) => {
        if (fresh) state.value = fresh
    })

    const asyncData = await useGqlQuery<RestaurantConfigResponse>(
        RESTAURANT_CONFIG_QUERY,
        {},
        {
            immediate: true,
            cache: false,
            dedupe: 'defer',
            legacy: { query: RESTAURANT_CONFIG_QUERY_LEGACY, isUnsupported: isPolicyUnsupportedError, unsupported: policyUnsupported },
            ...(options.lazy ? { lazy: true } : {}),
        },
    )
    const { data, refresh, pending, error } = asyncData
    answer.value = () => data.value
    if (data.value) state.value = data.value

    return {
        config: state,
        refresh,
        pending,
        error,
    }
}
