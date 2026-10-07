// The built-ins older phones lack: each polyfill behaves like the standard method, and a browser that has the method
// keeps its own. Run: `vp test run layers/engine/utils/polyfills.test.ts`.
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { installPolyfills } from './polyfills'

const targets = [
  [Array.prototype, 'toSorted'],
  [Array.prototype, 'toReversed'],
  [Map, 'groupBy'],
  [Object, 'groupBy'],
] as const

// What Node ships, put back after each test.
const natives = targets.map(
  ([target, name]) => [target, name, Object.getOwnPropertyDescriptor(target, name)] as const,
)

const removeNatives = () => {
  for (const [target, name] of targets) Reflect.deleteProperty(target, name)
}

afterEach(() => {
  for (const [target, name, descriptor] of natives) {
    Reflect.deleteProperty(target, name)
    if (descriptor) Object.defineProperty(target, name, descriptor)
  }
})

describe('on a browser without them', () => {
  beforeEach(() => {
    removeNatives()
    installPolyfills()
  })

  it('sorts and reverses a copy, leaving the array as it was', () => {
    const numbers = [3, 1, 2]
    expect(numbers.toSorted((a, b) => a - b)).toEqual([1, 2, 3])
    expect(['b', 'c', 'a'].toSorted()).toEqual(['a', 'b', 'c'])
    expect(numbers.toReversed()).toEqual([2, 1, 3])
    expect(numbers).toEqual([3, 1, 2])
  })

  it('groups into a Map in first-seen order, and into a plain object', () => {
    const words = ['apple', 'avocado', 'banana', 'cherry', 'blueberry']
    const byLetter = Map.groupBy(words, (word) => word.charAt(0))
    expect([...byLetter.keys()]).toEqual(['a', 'b', 'c'])
    expect(byLetter.get('b')).toEqual(['banana', 'blueberry'])
    expect(Map.groupBy([10, 20, 30], (_value, index) => index % 2).get(0)).toEqual([10, 30])

    const byLength = Object.groupBy(words, (word) => word.length)
    expect(byLength).toEqual({
      5: ['apple'],
      6: ['banana', 'cherry'],
      7: ['avocado'],
      9: ['blueberry'],
    })
    expect(Object.getPrototypeOf(byLength)).toBeNull()
  })

  it('adds them like the native ones: not enumerable', () => {
    expect(Object.getOwnPropertyDescriptor(Array.prototype, 'toSorted')).toMatchObject({
      writable: true,
      configurable: true,
      enumerable: false,
    })
  })
})

describe('on a browser that has them', () => {
  it('keeps its own', () => {
    const own = (target: object, name: string): unknown =>
      Object.getOwnPropertyDescriptor(target, name)?.value
    const before = targets.map(([target, name]) => own(target, name))
    installPolyfills()
    expect(targets.map(([target, name]) => own(target, name))).toEqual(before)
    expect(before.every((method) => typeof method === 'function')).toBe(true)
  })
})
