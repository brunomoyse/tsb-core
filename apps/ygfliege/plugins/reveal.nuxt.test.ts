// v-reveal plugin: scroll-reveal directive. IntersectionObserver is a controllable fake; classes, styles and the
// directive hooks are the real thing. The server side is a no-op that renders content visible.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../test/flags'
import {
  FakeIntersectionObserver,
  stubIntersectionObserver,
} from '../../../test/helpers/fakeObservers'

import plugin from './reveal'

interface Directive {
  mounted?: (el: HTMLElement, binding: { value?: unknown }) => void
  unmounted?: (el: HTMLElement) => void
  getSSRProps?: () => unknown
}

function install(reducedMotion = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reducedMotion && query.includes('reduce'),
  }))
  const directives = new Map<string, Directive>()
  ;(plugin as unknown as (app: unknown) => void)({
    vueApp: { directive: (name: string, directive: Directive) => directives.set(name, directive) },
  })
  return directives.get('reveal')!
}

/** An element at `top` px from the viewport top (happy-dom has no layout). */
function element(top: number) {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({ top }) as DOMRect
  document.body.append(el)
  return el
}

beforeEach(() => {
  stubIntersectionObserver()
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('on the server', () => {
  it('registers a directive that adds no SSR props, so crawlers get visible content', () => {
    setFlags({ server: true })
    const directive = install()
    expect(directive.getSSRProps?.()).toEqual({})
    expect(directive.mounted).toBeUndefined()
    expect(FakeIntersectionObserver.instances).toHaveLength(0)
  })
})

describe('in the browser', () => {
  it('hides a section below the fold and reveals it when it scrolls into view, then stops watching', () => {
    const directive = install()
    const el = element(1500)
    directive.mounted!(el, {})
    expect(el.classList.contains('reveal-init')).toBe(true)
    const observer = FakeIntersectionObserver.instances[0]!
    expect(observer.options).toEqual({ threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    expect(observer.observed.has(el)).toBe(true)
    observer.emit([{ target: el, isIntersecting: true }])
    expect(el.classList.contains('reveal-visible')).toBe(true)
    expect(observer.observed.has(el)).toBe(false)
  })

  it('does not reveal on an entry that is not intersecting', () => {
    const directive = install()
    const el = element(1500)
    directive.mounted!(el, {})
    FakeIntersectionObserver.instances[0]!.emit([{ target: el, isIntersecting: false }])
    expect(el.classList.contains('reveal-visible')).toBe(false)
    expect(FakeIntersectionObserver.instances[0]!.observed.has(el)).toBe(true)
  })

  it('never hides what is already on screen at hydration (no flash)', () => {
    const directive = install()
    const el = element(100)
    directive.mounted!(el, {})
    expect(el.classList.contains('reveal-init')).toBe(false)
    expect(FakeIntersectionObserver.instances[0]!.observed.size).toBe(0)
  })

  it('reveals everything immediately for visitors who prefer reduced motion', () => {
    const directive = install(true)
    const el = element(1500)
    directive.mounted!(el, {})
    expect(el.classList.contains('reveal-init')).toBe(false)
    expect(FakeIntersectionObserver.instances[0]!.observed.size).toBe(0)
  })

  it('a numeric binding staggers the transition by 0.12 s per step', () => {
    const directive = install()
    const el = element(1500)
    directive.mounted!(el, { value: 3 })
    expect(el.style.transitionDelay).toBe('0.36s')
  })

  it.each([undefined, 0, 'abc', null])('binding %j sets no delay', (value) => {
    const directive = install()
    const el = element(1500)
    directive.mounted!(el, { value })
    expect(el.style.transitionDelay).toBe('')
  })

  it('stops observing an element that is unmounted before it was revealed', () => {
    const directive = install()
    const el = element(1500)
    directive.mounted!(el, {})
    directive.unmounted!(el)
    expect(FakeIntersectionObserver.instances[0]!.observed.has(el)).toBe(false)
  })
})
