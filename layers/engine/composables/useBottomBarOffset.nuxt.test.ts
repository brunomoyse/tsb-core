// UseBottomBarOffset: fixed bottom bars publish --bottom-bar-h (the tallest) and, when they reserve space,
// --page-bottom-pad on <html>.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { useBottomBarOffset } from '#engine/composables/useBottomBarOffset'
import { setFlags } from '../../../test/flags'
import { FakeResizeObserver, stubResizeObserver } from '../../../test/helpers/fakeObservers'
import { mountComposable } from '../../../test/helpers/mountComposable'

const bar = () => document.documentElement.style.getPropertyValue('--bottom-bar-h')
const pad = () => document.documentElement.style.getPropertyValue('--page-bottom-pad')

function stubbed(initial: number) {
  const state = { height: initial }
  const el = document.createElement('div')
  Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => state.height })
  document.body.append(el)
  return { el, state }
}

beforeEach(() => {
  stubResizeObserver()
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('useBottomBarOffset', () => {
  it('publishes the bar height and follows resizes', async () => {
    const { el, state } = stubbed(64)
    const mounted = mountComposable(() => {
      useBottomBarOffset(ref(el))
    })
    await nextTick()
    expect(bar()).toBe('64px')
    expect(pad()).toBe('')
    state.height = 80
    FakeResizeObserver.live[0]!.trigger()
    expect(bar()).toBe('80px')
    mounted.unmount()
    expect(bar()).toBe('')
  })

  it('a bar hidden at this breakpoint does not count', async () => {
    const { el, state } = stubbed(64)
    const mounted = mountComposable(() => {
      useBottomBarOffset(ref(el))
    })
    await nextTick()
    state.height = 0
    FakeResizeObserver.live[0]!.trigger()
    expect(bar()).toBe('')
    mounted.unmount()
  })

  it('several bars: the variable holds the tallest and falls back when it leaves', async () => {
    const small = stubbed(48)
    const tall = stubbed(120)
    const a = mountComposable(() => {
      useBottomBarOffset(ref(small.el))
    })
    const b = mountComposable(() => {
      useBottomBarOffset(ref(tall.el))
    })
    await nextTick()
    expect(bar()).toBe('120px')
    b.unmount()
    expect(bar()).toBe('48px')
    a.unmount()
    expect(bar()).toBe('')
  })

  it('reserveSpace publishes --page-bottom-pad for that bar only', async () => {
    const overlay = stubbed(200)
    const page = stubbed(60)
    const a = mountComposable(() => {
      useBottomBarOffset(ref(overlay.el))
    })
    const b = mountComposable(() => {
      useBottomBarOffset(ref(page.el), { reserveSpace: true })
    })
    await nextTick()
    expect(bar()).toBe('200px')
    expect(pad()).toBe('60px')
    b.unmount()
    expect(pad()).toBe('')
    a.unmount()
  })

  it('clears the variable when the target goes away and disconnects the observer', async () => {
    const { el } = stubbed(64)
    const target = ref<HTMLElement | null>(el)
    const mounted = mountComposable(() => {
      useBottomBarOffset(target)
    })
    await nextTick()
    const observer = FakeResizeObserver.live[0]!
    target.value = null
    await nextTick()
    expect(bar()).toBe('')
    expect(observer.disconnected).toBe(true)
    mounted.unmount()
  })

  it('re-measures when the target is replaced', async () => {
    const a = stubbed(40)
    const b = stubbed(90)
    const target = ref<HTMLElement | null>(a.el)
    const mounted = mountComposable(() => {
      useBottomBarOffset(target)
    })
    await nextTick()
    target.value = b.el
    await nextTick()
    expect(bar()).toBe('90px')
    mounted.unmount()
  })

  it('does nothing on the server', async () => {
    setFlags({ server: true })
    mountComposable(() => {
      useBottomBarOffset(ref(stubbed(64).el))
    })
    await nextTick()
    expect(bar()).toBe('')
    expect(FakeResizeObserver.instances).toHaveLength(0)
  })
})
