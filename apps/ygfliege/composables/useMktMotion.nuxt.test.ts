// Motion of the old ygfliege.be on the Web Animations API: hero parallax and pop-in, magnetic CTA, parallax frame with
// its clip-path reveal, pop-in on view. happy-dom has no layout and no animation engine: positions come from stubbed
// getBoundingClientRect, Element.animate is a recording fake, IntersectionObserver is controllable.
import {
  FakeIntersectionObserver,
  stubIntersectionObserver,
} from '../../../test/helpers/fakeObservers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { mountComposable } from '../../../test/helpers/mountComposable'
import { setViewport } from '../../../test/helpers/viewport'
import { useHeroMotion, useMagnetic, useParallaxFrame, usePopInOnView } from './useMktMotion'

interface FakeAnimation {
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
  cancel: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  play: ReturnType<typeof vi.fn>
}

let animations: FakeAnimation[] = []
let media = { reduce: false, finePointer: true }

beforeEach(() => {
  animations = []
  media = { reduce: false, finePointer: true }
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') ? media.reduce : media.finePointer,
  }))
  HTMLElement.prototype.animate = function animate(
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    const animation: FakeAnimation = {
      keyframes,
      options,
      cancel: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
    }
    animations.push(animation)
    return animation as unknown as Animation
  } as HTMLElement['animate']
  stubIntersectionObserver()
  setViewport({ inner: 800 })
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** An element whose box (happy-dom has no layout) is `top` px from the viewport top and `height` px tall. */
const box = (top: number, height = 400, tag = 'div') => {
  const el = document.createElement(tag)
  const rect = { top, height, left: 0, width: 200 }
  el.getBoundingClientRect = () => rect as DOMRect
  document.body.append(el)
  return { el, rect }
}

/** Lets the scroll handler's frame run (it was scheduled before this one). */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve()
    })
  })

const scrollTo = async (rect: { top: number }, top: number) => {
  rect.top = top
  window.dispatchEvent(new Event('scroll'))
  await nextFrame()
}

describe('useHeroMotion', () => {
  const heroSetup = () => {
    const hero = box(0, 800)
    const refs = {
      hero: ref<HTMLElement | null>(hero.el),
      bowl: ref<HTMLElement | null>(box(0).el),
      bowlPop: ref<HTMLElement | null>(box(0).el),
      content: ref<HTMLElement | null>(box(0).el),
    }
    return { hero, refs }
  }

  it('pops the bowl in, then moves bowl and text against each other while the hero scrolls out', async () => {
    const { hero, refs } = heroSetup()
    const { unmount } = mountComposable(() => {
      useHeroMotion(refs)
    })

    expect(animations).toHaveLength(1)
    expect(animations[0]!.keyframes[0]).toEqual({ transform: 'scale(0.86)', opacity: 0 })
    expect(animations[0]!.options).toMatchObject({ duration: 900, delay: 150, fill: 'backwards' })
    expect(refs.bowl.value!.style.transform).toBe('translateY(0%) rotate(0deg)')
    expect(refs.content.value!.style.opacity).toBe('1')

    await scrollTo(hero.rect, -400)
    expect(refs.bowl.value!.style.transform).toBe('translateY(7%) rotate(1.5deg)')
    expect(refs.content.value!.style.transform).toBe('translateY(-7%)')
    expect(refs.content.value!.style.opacity).toBe('0.5')

    unmount()
    expect(animations[0]!.cancel).toHaveBeenCalled()
    expect(refs.bowl.value!.style.transform).toBe('')
    expect(refs.content.value!.style.opacity).toBe('')
    await scrollTo(hero.rect, -800)
    expect(refs.bowl.value!.style.transform).toBe('')
  })

  it('still runs the parallax without a pop-in wrapper or a text block', () => {
    const { refs } = heroSetup()
    refs.bowlPop.value = null
    refs.content.value = null
    mountComposable(() => {
      useHeroMotion(refs)
    }).unmount()
    expect(animations).toHaveLength(0)
  })

  it('does nothing without the hero or the bowl', () => {
    const { refs } = heroSetup()
    refs.hero.value = null
    mountComposable(() => {
      useHeroMotion(refs)
    })
    expect(animations).toHaveLength(0)
    expect(refs.bowl.value!.style.transform).toBe('')
  })

  it('does nothing at all under reduced motion', () => {
    media.reduce = true
    const { refs } = heroSetup()
    mountComposable(() => {
      useHeroMotion(refs)
    })
    expect(animations).toHaveLength(0)
    expect(refs.bowl.value!.style.transform).toBe('')
  })
})

describe('useMagnetic', () => {
  it('drifts toward a fine pointer and settles back when it leaves', () => {
    const { el } = box(100, 40)
    const { unmount } = mountComposable(() => {
      useMagnetic(ref(el))
    })
    expect(el.style.transition).toContain('transform 0.4s')
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 140 }))
    expect(el.style.transform).toBe('translate(25px, 5px)')
    el.dispatchEvent(new MouseEvent('mouseleave'))
    expect(el.style.transform).toBe('translate(0px, 0px)')

    unmount()
    expect(el.style.transition).toBe('')
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 140 }))
    expect(el.style.transform).toBe('')
  })

  it('stays put on a touch screen', () => {
    media.finePointer = false
    const { el } = box(100, 40)
    mountComposable(() => {
      useMagnetic(ref(el))
    })
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 140 }))
    expect(el.style.transform).toBe('')
  })
})

describe('useParallaxFrame', () => {
  const frame = (top: number) => {
    const { el, rect } = box(top, 400)
    const picture = document.createElement('picture')
    const img = document.createElement('img')
    picture.append(img)
    el.append(picture)
    return { el, rect, picture, img }
  }

  it('wipes in a frame below the fold once it scrolls into view, and drifts its image across the viewport', async () => {
    const { el, rect, picture, img } = frame(1200)
    const { unmount } = mountComposable(() => {
      useParallaxFrame(ref(el))
    })
    expect(picture.style.clipPath).toBe('inset(100% 0 0 0)')
    expect(img.style.transform).toBe('translateY(-10%) scale(1.2)')

    const observer = FakeIntersectionObserver.instances[0]!
    expect(observer.observed.has(el)).toBe(true)
    observer.emit([{ target: el, isIntersecting: false }])
    expect(picture.style.clipPath).toBe('inset(100% 0 0 0)')
    observer.emit([{ target: el, isIntersecting: true }])
    expect(picture.style.clipPath).toBe('inset(0)')
    expect(picture.style.transition).toContain('clip-path 0.9s')
    expect(observer.disconnected).toBe(true)

    await scrollTo(rect, 200)
    expect(img.style.transform).toBe('translateY(0%) scale(1.2)')

    unmount()
    expect(img.style.transform).toBe('')
    expect(picture.style.clipPath).toBe('')
  })

  it('never hides a frame that is on screen when the page opens', () => {
    const { el, picture } = frame(100)
    mountComposable(() => {
      useParallaxFrame(ref(el))
    })
    expect(picture.style.clipPath).toBe('')
    expect(FakeIntersectionObserver.instances).toHaveLength(0)
  })

  it('wipes the image itself when it is the frame child', () => {
    const { el } = box(1200, 400)
    const img = document.createElement('img')
    el.append(img)
    mountComposable(() => {
      useParallaxFrame(ref(el))
    })
    expect(img.style.clipPath).toBe('inset(100% 0 0 0)')
  })

  it('does nothing without an image', () => {
    const { el } = box(1200, 400)
    mountComposable(() => {
      useParallaxFrame(ref(el))
    })
    expect(FakeIntersectionObserver.instances).toHaveLength(0)
  })
})

describe('usePopInOnView', () => {
  const row = () => {
    const { el } = box(1200, 200)
    for (let i = 0; i < 3; i++) {
      const item = document.createElement('div')
      item.dataset.popIn = ''
      el.append(item)
    }
    el.append(document.createElement('span'))
    return el
  }

  it('pops the items in one after the other once the row is in view', () => {
    const el = row()
    const { unmount } = mountComposable(() => {
      usePopInOnView(ref(el))
    })
    expect(animations).toHaveLength(3)
    expect(animations.map((a) => a.options.delay)).toEqual([0, 120, 240])
    expect(animations.every((a) => a.pause.mock.calls.length === 1)).toBe(true)

    const observer = FakeIntersectionObserver.instances[0]!
    expect(observer.options).toEqual({ rootMargin: '0px 0px -20% 0px' })
    observer.emit([{ target: el, isIntersecting: false }])
    expect(animations[0]!.play).not.toHaveBeenCalled()
    observer.emit([{ target: el, isIntersecting: true }])
    expect(animations.every((a) => a.play.mock.calls.length === 1)).toBe(true)

    unmount()
    expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(true)
  })

  it('does nothing without a container', () => {
    mountComposable(() => {
      usePopInOnView(ref<HTMLElement | null>(null))
    })
    expect(FakeIntersectionObserver.instances).toHaveLength(0)
  })
})
