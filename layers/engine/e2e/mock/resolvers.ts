import { GraphQLFailure, type Operations, type RequestContext } from './graphql.ts'
import { type MockOrder, type MockState } from './state.ts'
import { PLACES, describePlace, findPlace, policyFor, restaurantConfigFor } from './restaurant.ts'
import { allProducts, findProduct } from './catalog/index.ts'
import { evaluateCoupon, money, quote, toCents } from './pricing.ts'
import type { QuoteInput } from './pricing.ts'
import type { Scenario } from './types.ts'

/*
 * The mock's API: one resolver per root field the apps use. Everything reads and writes the MockState, so a spec that
 * changes the scenario or the user through the control API changes what the next request sees.
 *
 * Adding an operation: write the resolver here, return an object that has every field the app selects (a missing one
 * is reported as a gap and fails the test), and add the topic to `subscriptions` if it is pushed.
 */

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const failure = (spec: NonNullable<Scenario['quoteFailure']>) =>
  new GraphQLFailure(
    spec.code,
    spec.message ?? spec.code,
    spec.productId ? { productId: spec.productId } : {},
  )

/** `@auth`: the request needs a session the mock accepts. */
function requireAuth(context: RequestContext): void {
  if (!context.authenticated || context.state.scenario.rejectSession) {
    throw new GraphQLFailure('UNAUTHENTICATED', 'unauthenticated')
  }
}

const strArg = (value: unknown): string => (typeof value === 'string' ? value : '')

function orderOut(state: MockState, order: MockOrder) {
  return {
    ...order,
    customer: state.user,
    items: order.items.map((line) => ({
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      totalPrice: line.lineTotal,
      product: findProduct(state.catalog, line.productId) ?? null,
      choice: null,
      selections: line.selections,
    })),
  }
}

function quoteContext(context: RequestContext) {
  const { state } = context
  return {
    catalog: state.catalog,
    coupons: state.scenario.coupons,
    authenticated: context.authenticated && !state.scenario.rejectSession,
    deliveryEnabled: policyFor(state.brand).deliveryEnabled,
  }
}

function createOrder(context: RequestContext, args: Record<string, unknown>) {
  const { state } = context
  const input = args.input as QuoteInput & Record<string, unknown>
  const priced = quote(quoteContext(context), input)
  // What the real service refuses: any line issue, any order issue (a delivery order without an address is refused too).
  const blocking = priced.issues[0] ?? null
  const lineIssue = priced.lines.find((line) => line.issues.length > 0)
  if (blocking)
    throw new GraphQLFailure(
      blocking.code,
      blocking.code,
      blocking.minimum ? { minimum: blocking.minimum } : {},
    )
  if (lineIssue) {
    const [issue] = lineIssue.issues
    throw new GraphQLFailure(issue?.code ?? 'INVALID_PRICE', issue?.code, {
      productId: lineIssue.productId,
    })
  }
  if (priced.coupon && !priced.coupon.valid) {
    throw new GraphQLFailure(priced.coupon.errorCode ?? 'COUPON_INVALID', 'coupon refused')
  }
  // Ordering availability, as tsb-service validates it before pricing is trusted.
  const mode = state.scenario.restaurant
  if (mode === 'disabled') throw new GraphQLFailure('ORDERING_UNAVAILABLE', 'ordering is disabled')
  if (mode === 'closed') throw new GraphQLFailure('ORDERING_CLOSED_TODAY', 'closed for today')
  if (mode === 'scheduled-only' && !input.preferredReadyTime) {
    throw new GraphQLFailure('SLOT_REQUIRED', 'a fixed time is required while closed')
  }

  const id = state.nextOrderId()
  const now = new Date().toISOString()
  const online = Boolean(input.isOnlinePayment)
  const origin = context.origin ?? ''
  const order: MockOrder = {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'PENDING',
    type: input.orderType,
    isOnlinePayment: online,
    discountAmount: money(toCents(priced.pickupDiscount) + toCents(priced.couponDiscount)),
    deliveryFee: priced.deliveryFee,
    transactionFee: priced.onlineFee,
    totalPrice: priced.total,
    couponCode: input.couponCode ?? null,
    cashPaymentAmount: (input.cashPaymentAmount as string | null | undefined) ?? null,
    estimatedReadyTime: new Date(Date.now() + 20 * 60_000).toISOString(),
    addressExtra: (input.addressExtra as string | null | undefined) ?? null,
    orderNote: (input.orderNote as string | null | undefined) ?? null,
    orderExtra: input.orderExtra ?? null,
    cancellationReason: null,
    address: findPlace(input.addressPlaceId) ?? null,
    payment: online
      ? {
          id: state.nextPaymentId(),
          status: 'open',
          createdAt: now,
          links: { checkout: { href: `${context.selfUrl}/mollie/checkout/${id}` } },
        }
      : null,
    items: priced.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      selections: line.selections.map(({ groupId, choiceId, quantity }) => ({
        groupId,
        choiceId,
        quantity,
      })),
    })),
    input,
    returnTo: { origin, locale: context.locale },
  }
  state.orders.set(id, order)
  return orderOut(state, order)
}

export const operations: Operations = {
  queries: {
    restaurantConfig: ({ state }) => restaurantConfigFor(state.scenario.restaurant, state.brand),
    productCategories: ({ state }) => state.catalog,
    productCategoryBySlug: ({ state }, { slug }) =>
      state.catalog.find((category) => category.slug === slug) ?? null,
    product: ({ state }, { id }) => findProduct(state.catalog, strArg(id)) ?? null,

    me: (context) => {
      requireAuth(context)
      return context.state.user
    },
    myOrders: (context, { first }) => {
      requireAuth(context)
      const { state } = context
      const limit = typeof first === 'number' ? first : 50
      return state
        .ordersNewestFirst()
        .slice(0, limit)
        .map((order) => orderOut(state, order))
    },
    myOrder: (context, { id }) => {
      requireAuth(context)
      const order = context.state.orders.get(strArg(id))
      return order ? orderOut(context.state, order) : null
    },

    validateCoupon: (context, { code, orderAmount }) => {
      requireAuth(context)
      const result = evaluateCoupon(
        context.state.scenario.coupons[strArg(code).trim().toUpperCase()],
        toCents(strArg(orderAmount)),
      )
      if ('errorCode' in result) {
        return {
          valid: false,
          discountAmount: '0.00',
          errorMessage: result.errorCode,
          errorCode: result.errorCode,
        }
      }
      return {
        valid: true,
        discountAmount: money(result.discountCents),
        errorMessage: null,
        errorCode: null,
      }
    },

    quoteOrder: async (context, { input }) => {
      const { scenario } = context.state
      if (scenario.quoteDelayMs) await sleep(scenario.quoteDelayMs)
      if (scenario.quoteFailure) throw failure(scenario.quoteFailure)
      return quote(quoteContext(context), input as QuoteInput)
    },

    autocompleteAddresses: (_context, { input }) => {
      const needle = strArg(input).toLowerCase()
      return PLACES.filter(
        (place) => describePlace(place).toLowerCase().includes(needle) || needle.length < 3,
      ).map((place) => ({
        placeId: place.id,
        description: describePlace(place),
        mainText: `${place.streetName} ${place.houseNumber}`,
        secondaryText: `${place.postcode} ${place.municipalityName}`,
      }))
    },
    resolveAddress: (_context, { placeId }) => {
      const place = findPlace(strArg(placeId))
      if (!place) throw new GraphQLFailure('ADDRESS_UNRESOLVABLE', 'address not found')
      return place
    },
  },

  mutations: {
    updateMe: (context, { input }) => {
      requireAuth(context)
      const { state } = context
      const patch = (input ?? {}) as Record<string, unknown>
      for (const key of [
        'firstName',
        'lastName',
        'phoneNumber',
        'notifyMarketing',
        'notifyOrderUpdates',
      ] as const) {
        if (key in patch && patch[key] !== undefined)
          Object.assign(state.user, { [key]: patch[key] })
      }
      if ('addressPlaceId' in patch) {
        const place = findPlace(patch.addressPlaceId as string | null)
        if (patch.addressPlaceId && !place)
          throw new GraphQLFailure('ADDRESS_UNRESOLVABLE', 'address not found')
        state.user.address = place ?? null
      }
      return state.user
    },
    deleteMe: (context) => {
      requireAuth(context)
      context.state.user.deletionRequestedAt = new Date().toISOString()
      return true
    },
    createOrder: async (context, args) => {
      requireAuth(context)
      const { scenario } = context.state
      if (scenario.createOrderDelayMs) await sleep(scenario.createOrderDelayMs)
      if (scenario.createOrderFailure) throw failure(scenario.createOrderFailure)
      return createOrder(context, args)
    },
  },

  subscriptions: {
    restaurantConfigUpdated: {
      topic: () => 'restaurantConfigUpdated',
      payload: (_event, { state }) => restaurantConfigFor(state.scenario.restaurant, state.brand),
    },
    productUpdated: { topic: () => 'productUpdated', payload: (event) => event },
    myOrderUpdated: {
      topic: (args) => `myOrderUpdated:${strArg(args.orderId)}`,
      payload: (event, { state }) => orderOut(state, event as MockOrder),
    },
  },
}

// Kept for the control API: every product, flat.
export const productsOf = (state: MockState) => allProducts(state.catalog)
