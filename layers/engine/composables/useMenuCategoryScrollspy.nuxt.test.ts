// useMenuCategoryScrollspy: the active category follows the sections crossing the observer band (topmost in menu order
// wins), jumps mute the spy while the smooth scroll runs, the page end forces the last category, a measured header moves
// the band, and the active chip is kept in view in the row. IntersectionObserver / ResizeObserver are controllable fakes
// (happy-dom has no layout); everything else (DOM, events, timers) is real.
import { DEFAULT_BAND_MARGIN, bandRootMargin } from '#engine/utils/menuScrollspy'
import {
  FakeIntersectionObserver,
  FakeResizeObserver,
  stubIntersectionObserver,
  stubResizeObserver,
} from '../../../test/helpers/fakeObservers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountComposable } from '../../../test/helpers/mountComposable'
import { setViewport } from '../../../test/helpers/viewport'
import { useMenuCategoryScrollspy } from '#engine/composables/useMenuCategoryScrollspy'

const cleanups: (() => void)[] = []
const sections = new Map<string, HTMLElement>()
const scrolled = new Map<string, ReturnType<typeof vi.fn>>()

function addSection(id: string) {
  const el = document.createElement('section')
  el.id = `category-${id}`
  const spy = vi.fn()
  el.scrollIntoView = spy
  scrolled.set(id, spy)
  document.body.append(el)
  sections.set(id, el)
  return el
}

function mountSpy(
  ids: string[],
  options: Parameters<typeof useMenuCategoryScrollspy>[1] = {},
  render = true,
) {
  if (render) for (const id of ids) addSection(id)
  const categoryIds = ref(ids)
  const mounted = mountComposable(() => useMenuCategoryScrollspy(categoryIds, options))
  cleanups.push(mounted.unmount)
  return { categoryIds, ...mounted.result, observer: () => latest() }
}

const latest = () => FakeIntersectionObserver.instances.at(-1)!
const enter = (id: string) => {
  latest().emit([{ target: sections.get(id)!, isIntersecting: true }])
}
const leave = (id: string) => {
  latest().emit([{ target: sections.get(id)!, isIntersecting: false }])
}

const setPage = setViewport
const scroll = () => window.dispatchEvent(new Event('scroll'))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-04T12:00:00+02:00'))
  stubIntersectionObserver()
  stubResizeObserver()
  setPage({ inner: 800, scrollY: 0, height: 5000 })
})

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  sections.clear()
  scrolled.clear()
})

describe('observing', () => {
  it('observes every rendered section with the default band, threshold 0', () => {
    mountSpy(['a', 'b', 'c'])
    expect(latest().options).toEqual({ rootMargin: DEFAULT_BAND_MARGIN, threshold: 0 })
    expect([...latest().observed].map((el) => el.id)).toEqual([
      'category-a',
      'category-b',
      'category-c',
    ])
  })

  it('skips a category whose section is not rendered', () => {
    addSection('a')
    mountSpy(['a', 'ghost'], {}, false)
    expect([...latest().observed].map((el) => el.id)).toEqual(['category-a'])
  })

  it('starts with nothing active', () => {
    expect(mountSpy(['a', 'b']).activeCategoryId.value).toBeNull()
  })

  it('disconnects on unmount', () => {
    const mounted = mountComposable(() => useMenuCategoryScrollspy(ref([]), {}))
    const observer = latest()
    mounted.unmount()
    expect(observer.disconnected).toBe(true)
  })
})

describe('active category', () => {
  it('the topmost section in menu order that crosses the band wins', () => {
    const { activeCategoryId } = mountSpy(['a', 'b', 'c'])
    enter('c')
    expect(activeCategoryId.value).toBe('c')
    enter('b')
    expect(activeCategoryId.value).toBe('b')
    enter('a')
    expect(activeCategoryId.value).toBe('a')
    leave('a')
    expect(activeCategoryId.value).toBe('b')
  })

  it('several entries in one callback are all taken into account', () => {
    const { activeCategoryId } = mountSpy(['a', 'b', 'c'])
    latest().emit([
      { target: sections.get('c')!, isIntersecting: true },
      { target: sections.get('b')!, isIntersecting: true },
      { target: sections.get('a')!, isIntersecting: false },
    ])
    expect(activeCategoryId.value).toBe('b')
  })

  it('keeps the last active category while nothing crosses the band', () => {
    const { activeCategoryId } = mountSpy(['a', 'b'])
    enter('a')
    leave('a')
    expect(activeCategoryId.value).toBe('a')
  })
})

describe('scrollToCategory', () => {
  it('activates the category and scrolls its section to the top, smoothly', () => {
    const { activeCategoryId, scrollToCategory } = mountSpy(['a', 'b'])
    scrollToCategory('b')
    expect(activeCategoryId.value).toBe('b')
    expect(scrolled.get('b')).toHaveBeenCalledExactlyOnceWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('jumps instantly under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }))
    const { scrollToCategory } = mountSpy(['a'])
    scrollToCategory('a')
    expect(scrolled.get('a')).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
  })

  it('still activates a category with no section in the page, without scrolling', () => {
    const { activeCategoryId, scrollToCategory } = mountSpy(['a'])
    expect(() => {
      scrollToCategory('missing')
    }).not.toThrow()
    expect(activeCategoryId.value).toBe('missing')
  })

  it('mutes the observer while the smooth scroll runs (800 ms), then listens again', () => {
    const { activeCategoryId, scrollToCategory } = mountSpy(['a', 'b', 'c'])
    scrollToCategory('c')
    enter('a')
    expect(activeCategoryId.value).toBe('c')
    vi.advanceTimersByTime(799)
    leave('a')
    enter('b')
    expect(activeCategoryId.value).toBe('c')
    vi.advanceTimersByTime(1)
    leave('b')
    enter('a')
    expect(activeCategoryId.value).toBe('a')
  })

  it('what crossed the band while muted counts afterwards', () => {
    const { activeCategoryId, scrollToCategory } = mountSpy(['a', 'b', 'c'])
    scrollToCategory('c')
    enter('b')
    vi.advanceTimersByTime(800)
    enter('c')
    expect(activeCategoryId.value).toBe('b')
  })
})

describe('page end', () => {
  it('reaching the bottom makes the last category active, even if the band never reached it', () => {
    const { activeCategoryId } = mountSpy(['a', 'b', 'c'])
    enter('a')
    setPage({ inner: 800, scrollY: 4200, height: 5000 })
    scroll()
    expect(activeCategoryId.value).toBe('c')
  })

  it('tolerates the 2px rounding of the browser', () => {
    const { activeCategoryId } = mountSpy(['a', 'b'])
    setPage({ inner: 800, scrollY: 4198, height: 5000 })
    scroll()
    expect(activeCategoryId.value).toBe('b')
  })

  it('a single category is never forced', () => {
    const { activeCategoryId } = mountSpy(['a'])
    setPage({ inner: 800, scrollY: 4200, height: 5000 })
    scroll()
    expect(activeCategoryId.value).toBeNull()
  })

  it('an empty menu is left alone', () => {
    const { activeCategoryId } = mountSpy([])
    setPage({ inner: 800, scrollY: 4200, height: 5000 })
    scroll()
    expect(activeCategoryId.value).toBeNull()
  })

  it('while at the end the observer is muted; leaving the end takes the band answer', () => {
    const { activeCategoryId } = mountSpy(['a', 'b', 'c'])
    setPage({ inner: 800, scrollY: 4200, height: 5000 })
    scroll()
    expect(activeCategoryId.value).toBe('c')
    enter('b')
    expect(activeCategoryId.value).toBe('c')
    setPage({ inner: 800, scrollY: 3000, height: 5000 })
    scroll()
    expect(activeCategoryId.value).toBe('b')
  })

  it('leaving the end with nothing in the band keeps the current category', () => {
    const { activeCategoryId } = mountSpy(['a', 'b'])
    setPage({ inner: 800, scrollY: 4200, height: 5000 })
    scroll()
    setPage({ inner: 800, scrollY: 100, height: 5000 })
    scroll()
    expect(activeCategoryId.value).toBe('b')
  })

  it('scrolling in the middle of the page changes nothing', () => {
    const { activeCategoryId } = mountSpy(['a', 'b'])
    enter('a')
    scroll()
    scroll()
    expect(activeCategoryId.value).toBe('a')
  })

  it('does not fight a jump in flight: the end is not applied until the scroll settled', () => {
    const { activeCategoryId, scrollToCategory } = mountSpy(['a', 'b', 'c'])
    scrollToCategory('a')
    setPage({ inner: 800, scrollY: 4200, height: 5000 })
    scroll()
    expect(activeCategoryId.value).toBe('a')
  })
})

describe('selectFirst', () => {
  it('marks the first category active before any scroll', () => {
    expect(mountSpy(['a', 'b'], { selectFirst: true }).activeCategoryId.value).toBe('a')
  })

  it('does not override a category already active', async () => {
    const { activeCategoryId, categoryIds, scrollToCategory } = mountSpy(['a', 'b'], {
      selectFirst: true,
    })
    scrollToCategory('b')
    categoryIds.value = ['x', 'y']
    // The watcher on the ids runs on the next tick: assert after it, or the check cannot fail.
    await nextTick()
    expect(activeCategoryId.value).toBe('b')
  })

  it('waits for the categories to load', async () => {
    const { activeCategoryId, categoryIds } = mountSpy([], { selectFirst: true }, false)
    expect(activeCategoryId.value).toBeNull()
    categoryIds.value = ['a', 'b']
    await nextTick()
    expect(activeCategoryId.value).toBe('a')
  })

  it('is off by default', async () => {
    const { activeCategoryId, categoryIds } = mountSpy([], {}, false)
    categoryIds.value = ['a']
    await nextTick()
    expect(activeCategoryId.value).toBeNull()
  })
})

describe('the list of categories changes (search filter)', () => {
  it('observes the new sections with a fresh observer and forgets the old ones', async () => {
    const { categoryIds, activeCategoryId } = mountSpy(['a', 'b'])
    const first = latest()
    enter('a')
    categoryIds.value = ['b', 'c']
    addSection('c')
    await nextTick()
    await nextTick()
    const second = latest()
    expect(second).not.toBe(first)
    expect(first.disconnected).toBe(true)
    expect([...second.observed].map((el) => el.id)).toEqual(['category-b', 'category-c'])
    // "a" was in the band of the old observer; the new one starts clean.
    second.emit([{ target: sections.get('c')!, isIntersecting: true }])
    expect(activeCategoryId.value).toBe('c')
  })

  it('does not create an observer after unmount', async () => {
    const mounted = mountComposable(() => useMenuCategoryScrollspy(ref(['a']), {}))
    const count = FakeIntersectionObserver.instances.length
    mounted.unmount()
    await nextTick()
    expect(FakeIntersectionObserver.instances.length).toBe(count)
  })
})

describe('with a measured header', () => {
  function stubHeader(top: string, height: number) {
    const state = { height }
    const el = document.createElement('div')
    el.style.top = top
    Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => state.height })
    document.body.append(el)
    return { el, state }
  }

  it('starts the band just under the header', () => {
    const { el } = stubHeader('64px', 56)
    mountSpy(['a'], { header: ref(el) })
    expect(latest().options.rootMargin).toBe(bandRootMargin(120, 800))
    expect(latest().options.rootMargin).not.toBe(DEFAULT_BAND_MARGIN)
  })

  it('falls back to the default band while the header is not rendered', () => {
    mountSpy(['a'], { header: ref(null) })
    expect(latest().options.rootMargin).toBe(DEFAULT_BAND_MARGIN)
  })

  it('makes a new observer when the header changes height (resize observer)', () => {
    const { el, state } = stubHeader('0px', 56)
    mountSpy(['a'], { header: ref(el) })
    const before = latest()
    state.height = 112
    FakeResizeObserver.live.find((o) => o.observed.includes(el))!.trigger()
    expect(latest()).not.toBe(before)
    expect(before.disconnected).toBe(true)
    expect(latest().options.rootMargin).toBe(bandRootMargin(112, 800))
  })

  it('makes a new observer when the viewport changes (rotation)', () => {
    const { el } = stubHeader('0px', 56)
    mountSpy(['a'], { header: ref(el) })
    const before = latest()
    setPage({ inner: 400, scrollY: 0, height: 5000 })
    window.dispatchEvent(new Event('resize'))
    expect(latest()).not.toBe(before)
    expect(latest().options.rootMargin).toBe(bandRootMargin(56, 400))
  })

  it('keeps the observer when the band did not move', () => {
    const { el } = stubHeader('0px', 56)
    mountSpy(['a'], { header: ref(el) })
    const before = latest()
    const count = FakeIntersectionObserver.instances.length
    window.dispatchEvent(new Event('resize'))
    FakeResizeObserver.live.find((o) => o.observed.includes(el))!.trigger()
    expect(latest()).toBe(before)
    expect(FakeIntersectionObserver.instances.length).toBe(count)
  })

  it('without a header the viewport is not watched', () => {
    mountSpy(['a'])
    const count = FakeIntersectionObserver.instances.length
    window.dispatchEvent(new Event('resize'))
    expect(FakeIntersectionObserver.instances.length).toBe(count)
  })

  it('a resize after unmount does not rebuild anything', () => {
    const { el } = stubHeader('0px', 56)
    const mounted = mountComposable(() => useMenuCategoryScrollspy(ref(['a']), { header: ref(el) }))
    mounted.unmount()
    const count = FakeIntersectionObserver.instances.length
    setPage({ inner: 400, scrollY: 0, height: 5000 })
    window.dispatchEvent(new Event('resize'))
    expect(FakeIntersectionObserver.instances.length).toBe(count)
  })
})

describe('the chip row', () => {
  const rowScroll = vi.fn()
  beforeEach(() => rowScroll.mockClear())
  function chipRow(ids: string[]) {
    const row = document.createElement('div')
    row.scrollBy = rowScroll
    row.getBoundingClientRect = () => ({ left: 0, width: 300 }) as DOMRect
    for (const [index, id] of ids.entries()) {
      const chip = document.createElement('button')
      chip.dataset.chipCategory = id
      chip.getBoundingClientRect = () => ({ left: 100 * index + 400, width: 80 }) as DOMRect
      row.append(chip)
    }
    document.body.append(row)
    return row
  }

  it('scrolls the row sideways to centre the active chip, and only the row', async () => {
    const spy = mountSpy(['a', 'b'])
    const row = chipRow(['a', 'b'])
    spy.chipRowRef.value = row
    spy.scrollToCategory('b')
    await flushPromises()
    // Chip b: left 500, width 80 -> centre 540; row centre 150 -> shift 390.
    expect(rowScroll).toHaveBeenCalledExactlyOnceWith({ left: 390, behavior: 'smooth' })
    expect(scrolled.get('b')).toHaveBeenCalledOnce()
  })

  it('follows the observer too', async () => {
    const spy = mountSpy(['a', 'b'])
    const row = chipRow(['a', 'b'])
    spy.chipRowRef.value = row
    enter('a')
    await flushPromises()
    // Chip a: left 400, width 80 -> centre 440 - 150 = 290.
    expect(rowScroll).toHaveBeenCalledWith({ left: 290, behavior: 'smooth' })
  })

  it('does nothing when there is no row or no chip for that category', async () => {
    const spy = mountSpy(['a', 'b'])
    spy.scrollToCategory('a')
    await flushPromises()
    const row = chipRow(['a'])
    spy.chipRowRef.value = row
    // "b" has no chip in this row.
    spy.scrollToCategory('b')
    await flushPromises()
    expect(rowScroll).not.toHaveBeenCalled()
  })
})
