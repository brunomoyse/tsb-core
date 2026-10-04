import {
  type DocumentNode,
  type FragmentDefinitionNode,
  Kind,
  type SelectionSetNode,
  type ValueNode,
  parse,
} from 'graphql'
import type { MockState } from './state.ts'

/*
 * A tiny GraphQL executor for the mock. There is no schema: resolvers are plain functions keyed by root field, and the
 * request's selection set is projected onto whatever the resolver returned (aliases, fragments, lists, nesting), so
 * every field the app asks for comes back as long as the returned object has it. A field the object lacks answers
 * `null` and is recorded as a "gap" (the mock lags the app): the Playwright `backend` fixture fails the test on gaps.
 */

export interface RequestContext {
  state: MockState
  /** The request carried a bearer token (the mock never validates it; a scenario can reject it). */
  authenticated: boolean
  /** Origin of the page that sent the request (the Origin header of the browser). */
  origin: string | null
  /** The `Accept-Language` the app sent: its locale. */
  locale: string
  /** Where this mock is reachable, for links it hands out (the fake Mollie checkout). */
  selfUrl: string
}

export class GraphQLFailure extends Error {
  readonly code: string
  readonly extensions: Record<string, unknown>
  constructor(code: string, message = code, extensions: Record<string, unknown> = {}) {
    super(message)
    this.code = code
    this.extensions = { code, ...extensions }
  }
}

export type Resolver = (context: RequestContext, args: Record<string, unknown>) => unknown

export interface SubscriptionDef {
  /** Topic published by MockState for these arguments. */
  topic: (args: Record<string, unknown>) => string
  /** The object the selection set is projected on, for an event published on that topic. */
  payload: (event: unknown, context: RequestContext) => unknown
}

export interface Operations {
  queries: Record<string, Resolver>
  mutations: Record<string, Resolver>
  subscriptions: Record<string, SubscriptionDef>
}

type Fragments = Record<string, FragmentDefinitionNode>

const fragmentsOf = (doc: DocumentNode): Fragments =>
  Object.fromEntries(
    doc.definitions
      .filter(
        (definition): definition is FragmentDefinitionNode =>
          definition.kind === Kind.FRAGMENT_DEFINITION,
      )
      .map((definition) => [definition.name.value, definition]),
  )

function literal(node: ValueNode, variables: Record<string, unknown>): unknown {
  switch (node.kind) {
    case Kind.VARIABLE:
      return variables[node.name.value]
    case Kind.INT:
      return Number(node.value)
    case Kind.FLOAT:
      return Number(node.value)
    case Kind.NULL:
      return null
    case Kind.LIST:
      return node.values.map((value) => literal(value, variables))
    case Kind.OBJECT:
      return Object.fromEntries(
        node.fields.map((field) => [field.name.value, literal(field.value, variables)]),
      )
    default:
      return node.value
  }
}

/** Projects `selectionSet` onto `value`. `where` names the root field, for gap reports. */
function project(
  selectionSet: SelectionSetNode | undefined,
  value: unknown,
  fragments: Fragments,
  state: MockState,
  where: string,
): unknown {
  if (value === null || value === undefined) return null
  if (Array.isArray(value))
    return value.map((item) => project(selectionSet, item, fragments, state, where))
  if (!selectionSet || typeof value !== 'object') return value
  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  const visit = (set: SelectionSetNode) => {
    for (const selection of set.selections) {
      if (selection.kind === Kind.FIELD) {
        const name = selection.name.value
        const key = selection.alias?.value ?? name
        if (name === '__typename') {
          out[key] = 'Object'
          continue
        }
        let field = source[name]
        if (!(name in source)) {
          state.noteGap(`field ${where}.${name}`)
          field = null
        }
        out[key] = project(selection.selectionSet, field, fragments, state, `${where}.${name}`)
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        visit(selection.selectionSet)
      } else {
        const fragment = fragments[selection.name.value]
        if (fragment) visit(fragment.selectionSet)
      }
    }
  }
  visit(selectionSet)
  return out
}

export interface GraphQLRequest {
  query: string
  variables?: Record<string, unknown>
}

interface GraphQLResult {
  data?: Record<string, unknown>
  errors?: { message: string; path?: string[]; extensions: Record<string, unknown> }[]
}

const errorEntry = (error: unknown, path: string[]) => {
  if (error instanceof GraphQLFailure)
    return { message: error.message, path, extensions: error.extensions }
  const message = error instanceof Error ? error.message : String(error)
  return { message, path, extensions: { code: 'INTERNAL' } }
}

export async function execute(
  operations: Operations,
  context: RequestContext,
  request: GraphQLRequest,
): Promise<GraphQLResult> {
  let doc: DocumentNode
  try {
    doc = parse(request.query)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      errors: [
        { message: `Parse error: ${message}`, extensions: { code: 'GRAPHQL_PARSE_FAILED' } },
      ],
    }
  }
  const fragments = fragmentsOf(doc)
  const operation = doc.definitions.find(
    (definition) => definition.kind === Kind.OPERATION_DEFINITION,
  )
  if (!operation || operation.kind !== Kind.OPERATION_DEFINITION) {
    return { errors: [{ message: 'no operation', extensions: { code: 'GRAPHQL_PARSE_FAILED' } }] }
  }
  const variables = request.variables ?? {}
  const table = operation.operation === 'mutation' ? operations.mutations : operations.queries
  const data: Record<string, unknown> = {}
  const errors: NonNullable<GraphQLResult['errors']> = []

  for (const selection of operation.selectionSet.selections) {
    if (selection.kind !== Kind.FIELD) continue
    const name = selection.name.value
    const key = selection.alias?.value ?? name
    const args = Object.fromEntries(
      (selection.arguments ?? []).map((argument) => [
        argument.name.value,
        literal(argument.value, variables),
      ]),
    )
    context.state.log({
      at: new Date().toISOString(),
      op: name,
      kind: operation.operation === 'mutation' ? 'mutation' : 'query',
      args,
      authenticated: context.authenticated,
    })
    const resolver = table[name]
    if (!resolver) {
      context.state.noteGap(`${operation.operation} ${name}`)
      data[key] = null
      errors.push({
        message: `mock: no resolver for ${operation.operation} ${name}`,
        path: [key],
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      })
      continue
    }
    try {
      const injected = context.state.scenario.operationFailures[name]
      if (injected) {
        throw new GraphQLFailure(injected.code, injected.message ?? injected.code)
      }
      const raw = await resolver(context, args)
      data[key] = project(selection.selectionSet, raw, fragments, context.state, name)
    } catch (error) {
      data[key] = null
      errors.push(errorEntry(error, [key]))
    }
  }
  return errors.length > 0 ? { data, errors } : { data }
}

/** What a `subscribe` message asks for, once parsed. */
export interface ParsedSubscription {
  name: string
  args: Record<string, unknown>
  definition: SubscriptionDef | undefined
  /** Projects an event payload onto the requested fields. */
  render: (payload: unknown) => unknown
}

export function parseSubscription(
  operations: Operations,
  state: MockState,
  request: GraphQLRequest,
): ParsedSubscription | null {
  let doc: DocumentNode
  try {
    doc = parse(request.query)
  } catch {
    return null
  }
  const operation = doc.definitions.find(
    (definition) => definition.kind === Kind.OPERATION_DEFINITION,
  )
  if (!operation || operation.kind !== Kind.OPERATION_DEFINITION) return null
  const field = operation.selectionSet.selections.find((selection) => selection.kind === Kind.FIELD)
  if (!field || field.kind !== Kind.FIELD) return null
  const variables = request.variables ?? {}
  const fragments = fragmentsOf(doc)
  const name = field.name.value
  const args = Object.fromEntries(
    (field.arguments ?? []).map((argument) => [
      argument.name.value,
      literal(argument.value, variables),
    ]),
  )
  const key = field.alias?.value ?? name
  return {
    name,
    args,
    definition: operations.subscriptions[name],
    render: (payload) => ({ [key]: project(field.selectionSet, payload, fragments, state, name) }),
  }
}
