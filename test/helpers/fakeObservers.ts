// Controllable stand-ins for the browser observers happy-dom does not drive (no layout engine).
import { vi } from 'vite-plus/test'

export class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  observed: Element[] = []
  disconnected = false
  constructor(public callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
  /** The element changed size: runs the callback as the browser would. */
  trigger() {
    this.callback([], this)
  }
  static reset() {
    FakeResizeObserver.instances = []
  }
  static get live() {
    return FakeResizeObserver.instances.filter((i) => !i.disconnected)
  }
}

export function stubResizeObserver() {
  FakeResizeObserver.reset()
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
}

export interface IntersectionCall {
  target: Element
  isIntersecting: boolean
  top?: number
  ratio?: number
}

export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  observed = new Set<Element>()
  disconnected = false
  constructor(
    public callback: IntersectionObserverCallback,
    public options: IntersectionObserverInit = {},
  ) {
    FakeIntersectionObserver.instances.push(this)
  }
  observe(el: Element) {
    this.observed.add(el)
  }
  unobserve(el: Element) {
    this.observed.delete(el)
  }
  disconnect() {
    this.disconnected = true
    this.observed.clear()
  }
  takeRecords() {
    return []
  }
  /** Delivers entries to the callback as the browser would. */
  emit(entries: IntersectionCall[]) {
    this.callback(
      entries.map(
        (e) =>
          ({
            target: e.target,
            isIntersecting: e.isIntersecting,
            intersectionRatio: e.ratio ?? (e.isIntersecting ? 1 : 0),
            boundingClientRect: { top: e.top ?? 0 } as DOMRectReadOnly,
          }) as IntersectionObserverEntry,
      ),
      this as unknown as IntersectionObserver,
    )
  }
  static reset() {
    FakeIntersectionObserver.instances = []
  }
}

export function stubIntersectionObserver() {
  FakeIntersectionObserver.reset()
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
}
