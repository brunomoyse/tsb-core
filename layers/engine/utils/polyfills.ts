/*
 * The recent built-ins the shop code relies on, added where the browser lacks them. Vite only lowers syntax, never
 * library calls, so `toSorted` (Chrome 110, Safari 16) and `Map.groupBy` (Chrome 117, Safari 17.4) threw on older
 * phones that still run the site, such as Android 7 on Chrome 101 or iPhones stuck on iOS 16 (TSB-CORE-F).
 *
 * Only what the code uses, each one a plain copy of the standard behaviour. A new recent built-in in client code
 * belongs here too.
 */

type Compare<T> = (a: T, b: T) => number

const define = (target: object, name: string, value: unknown): void => {
  if (name in target) return
  // Same flags as the native methods: writable, configurable, not enumerable (a `for...in` on an array stays clean).
  Object.defineProperty(target, name, {
    value,
    writable: true,
    configurable: true,
    enumerable: false,
  })
}

function toSorted<T>(this: T[], compare?: Compare<T>): T[] {
  // oxlint-disable-next-line unicorn/no-array-sort -- sorts a fresh copy, which is what toSorted is
  return Array.from(this).sort(compare)
}

function toReversed<T>(this: T[]): T[] {
  // oxlint-disable-next-line unicorn/no-array-reverse -- reverses a fresh copy, which is what toReversed is
  return Array.from(this).reverse()
}

function mapGroupBy<T, K>(items: Iterable<T>, keyOf: (item: T, index: number) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  let index = 0
  for (const item of items) {
    const key = keyOf(item, index)
    index += 1
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return groups
}

function objectGroupBy<T>(
  items: Iterable<T>,
  keyOf: (item: T, index: number) => PropertyKey,
): Record<string, T[]> {
  const groups = Object.fromEntries(mapGroupBy(items, keyOf))
  // Like the native one: a bare object, so a key such as "constructor" is just a group.
  Reflect.setPrototypeOf(groups, null)
  return groups
}

/** Adds the missing built-ins; a browser that has them keeps its own. */
export const installPolyfills = (): void => {
  define(Array.prototype, 'toSorted', toSorted)
  define(Array.prototype, 'toReversed', toReversed)
  define(Map, 'groupBy', mapGroupBy)
  define(Object, 'groupBy', objectGroupBy)
}
