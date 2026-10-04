// useStickyTopOffset: publishes --sticky-top-h on <html> (the bottom edge a sticky header covers) and follows resizes.
import { FakeResizeObserver, stubResizeObserver } from '../../../test/helpers/fakeObservers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { stickyBottom, useStickyTopOffset } from '#engine/composables/useStickyTopOffset'
import { mountComposable } from '../../../test/helpers/mountComposable'
import { setFlags } from '../../../test/flags'

const read = () => document.documentElement.style.getPropertyValue('--sticky-top-h')

/** A header whose layout is stubbed (happy-dom has no layout engine). */
function header(top: string, height: number) {
  const el = document.createElement('header')
  el.style.top = top
  Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => height })
  document.body.append(el)
  return el
}

beforeEach(() => {
  stubResizeObserver()
  document.documentElement.style.removeProperty('--sticky-top-h')
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('stickyBottom', () => {
  it('is the stuck top plus the height', () => {
    expect(stickyBottom(header('64px', 56))).toBe(120)
  })

  it('treats a non-numeric top (auto) as 0', () => {
    expect(stickyBottom(header('auto', 40))).toBe(40)
  })
})

describe('useStickyTopOffset', () => {
  it('publishes the rounded bottom edge once the target exists, and follows its size', async () => {
    let height = 56
    const el = header('64.4px', 0)
    Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => height })
    const target = ref<HTMLElement | null>(null)
    mountComposable(() => {
      useStickyTopOffset(target)
    })
    expect(read()).toBe('')
    target.value = el
    await nextTick()
    expect(read()).toBe('120px')
    expect(FakeResizeObserver.live[0]!.observed).toEqual([el])
    height = 90
    FakeResizeObserver.live[0]!.trigger()
    expect(read()).toBe('154px')
  })

  it('a header hidden at this breakpoint (height 0) publishes nothing', async () => {
    const el = header('64px', 0)
    mountComposable(() => {
      useStickyTopOffset(ref(el))
    })
    await nextTick()
    expect(read()).toBe('')
  })

  it('removes the variable when the header collapses to 0 on resize', async () => {
    let height = 50
    const el = header('0px', 0)
    Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => height })
    mountComposable(() => {
      useStickyTopOffset(ref(el))
    })
    await nextTick()
    expect(read()).toBe('50px')
    height = 0
    FakeResizeObserver.live[0]!.trigger()
    expect(read()).toBe('')
  })

  it('clears the variable and the observer when the target goes away', async () => {
    const el = header('10px', 40)
    const target = ref<HTMLElement | null | undefined>(el)
    mountComposable(() => {
      useStickyTopOffset(target)
    })
    await nextTick()
    expect(read()).toBe('50px')
    const observer = FakeResizeObserver.live[0]!
    target.value = undefined
    await nextTick()
    expect(read()).toBe('')
    expect(observer.disconnected).toBe(true)
  })

  it('replacing the target disconnects the previous observer', async () => {
    const a = header('0px', 30)
    const b = header('0px', 70)
    const target = ref<HTMLElement | null>(a)
    mountComposable(() => {
      useStickyTopOffset(target)
    })
    await nextTick()
    const first = FakeResizeObserver.live[0]!
    target.value = b
    await nextTick()
    expect(first.disconnected).toBe(true)
    expect(read()).toBe('70px')
  })

  it('cleans up on unmount', async () => {
    const el = header('0px', 30)
    const { unmount } = mountComposable(() => {
      useStickyTopOffset(ref(el))
    })
    await nextTick()
    const observer = FakeResizeObserver.live[0]!
    unmount()
    expect(read()).toBe('')
    expect(observer.disconnected).toBe(true)
  })

  it('does nothing on the server', async () => {
    setFlags({ server: true })
    mountComposable(() => {
      useStickyTopOffset(ref(header('0px', 30)))
    })
    await nextTick()
    expect(read()).toBe('')
    expect(FakeResizeObserver.instances).toHaveLength(0)
  })
})
