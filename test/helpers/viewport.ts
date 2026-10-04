// happy-dom has no layout: a test that depends on the window's size or scroll position states it. The properties it
// overrides are put back after every test (an override that stays would change the next test of the file).
import { afterEach } from 'vite-plus/test'

type Target = Window | HTMLElement
const original = new Map<Target, Map<string, PropertyDescriptor | undefined>>()

function override(target: Target, key: string, value: number) {
  let saved = original.get(target)
  if (!saved) original.set(target, (saved = new Map()))
  if (!saved.has(key)) saved.set(key, Object.getOwnPropertyDescriptor(target, key))
  Object.defineProperty(target, key, { configurable: true, value })
}

/** The window's inner height, its scroll position and the document's total height. Any of them may be left out. */
export function setViewport({
  inner,
  scrollY,
  height,
}: {
  inner?: number
  scrollY?: number
  height?: number
}) {
  if (inner !== undefined) override(window, 'innerHeight', inner)
  if (scrollY !== undefined) override(window, 'scrollY', scrollY)
  if (height !== undefined) override(document.documentElement, 'scrollHeight', height)
}

afterEach(() => {
  for (const [target, saved] of original) {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(target, key, descriptor)
      else Reflect.deleteProperty(target, key)
    }
  }
  original.clear()
})
