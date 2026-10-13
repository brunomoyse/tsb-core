/*
 * The old ygfliege.be motion layer (GSAP + ScrollTrigger in its utils/motion.ts), rebuilt on the Web Animations API and
 * plain scroll listeners: hero bowl pop-in and scroll parallax, magnetic hero CTA, parallax media frames with their
 * clip-path reveal, and the pop-in of the menu's pricing steps. Everything starts in onMounted and is torn down in
 * onBeforeUnmount (route changes included); nothing runs on the server, and nothing at all under reduced motion.
 */
import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import {
  MOTION_EASE,
  magneticOffset,
  scrollOutProgress,
  viewportCrossProgress,
} from '~/utils/motion'

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Runs `update` on scroll and resize, at most once per frame, and once right away. Returns the teardown. */
const onScrollFrame = (update: () => void): (() => void) => {
  let frame = 0
  const schedule = () => {
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      update()
    })
  }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  update()
  return () => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    if (frame !== 0) cancelAnimationFrame(frame)
  }
}

/** Sets up on mount unless reduced motion is asked for; the returned teardown runs before unmount. */
const useClientMotion = (setup: () => (() => void) | undefined): void => {
  let teardown: (() => void) | undefined
  onMounted(() => {
    if (prefersReducedMotion()) return
    teardown = setup()
  })
  onBeforeUnmount(() => {
    teardown?.()
    teardown = undefined
  })
}

export interface HeroMotionRefs {
  /** The hero section: the scrub runs while it scrolls out at the top. */
  hero: Ref<HTMLElement | null>
  /** Bowl wrapper moved by the scroll parallax (down 14% of its height, turned 3deg). */
  bowl: Ref<HTMLElement | null>
  /** Inner bowl wrapper that pops in (the levitation runs in CSS on the image inside it). */
  bowlPop: Ref<HTMLElement | null>
  /** Hero text, lifted 14% and faded out over the same scrub. */
  content: Ref<HTMLElement | null>
}

/** Hero "floating bowl": pop-in, then a scroll-scrubbed parallax of the bowl against the text. */
export const useHeroMotion = ({ hero, bowl, bowlPop, content }: HeroMotionRefs): void => {
  useClientMotion(() => {
    const heroEl = hero.value
    const bowlEl = bowl.value
    if (heroEl === null || bowlEl === null) return undefined

    const pop = bowlPop.value?.animate(
      [
        { transform: 'scale(0.86)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 900, delay: 150, easing: MOTION_EASE.power3Out, fill: 'backwards' },
    )

    const contentEl = content.value
    const stopScroll = onScrollFrame(() => {
      const rect = heroEl.getBoundingClientRect()
      const progress = scrollOutProgress(rect.top, rect.height)
      bowlEl.style.transform = `translateY(${14 * progress}%) rotate(${3 * progress}deg)`
      if (contentEl !== null) {
        contentEl.style.transform = `translateY(${-14 * progress}%)`
        contentEl.style.opacity = String(1 - progress)
      }
    })

    return () => {
      stopScroll()
      pop?.cancel()
      bowlEl.style.removeProperty('transform')
      contentEl?.style.removeProperty('transform')
      contentEl?.style.removeProperty('opacity')
    }
  })
}

/** Magnetic element: drifts toward the pointer (a quarter of the distance) and settles back when it leaves. */
export const useMagnetic = (target: Ref<HTMLElement | null>): void => {
  useClientMotion(() => {
    const el = target.value
    // Desktop, fine pointer only: no hover on touch screens.
    if (el === null || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return undefined
    }
    el.style.transition = `transform 0.4s ${MOTION_EASE.power3Out}`
    const move = (event: MouseEvent) => {
      const { x, y } = magneticOffset(
        { x: event.clientX, y: event.clientY },
        el.getBoundingClientRect(),
      )
      el.style.transform = `translate(${x}px, ${y}px)`
    }
    const leave = () => {
      el.style.transform = 'translate(0px, 0px)'
    }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
      el.style.removeProperty('transition')
      el.style.removeProperty('transform')
    }
  })
}

/**
 * Media frame (overflow hidden): its image is revealed by a clip-path wipe from the bottom when the frame scrolls into
 * view, and drifts from -10% to 10% of its height (held at scale 1.2 so the frame never shows a gap) while the frame
 * crosses the viewport.
 */
export const useParallaxFrame = (frame: Ref<HTMLElement | null>): void => {
  useClientMotion(() => {
    const frameEl = frame.value
    const inner = frameEl?.querySelector<HTMLElement>('img') ?? null
    if (frameEl === null || inner === null) return undefined

    const revealed =
      frameEl.firstElementChild instanceof HTMLElement ? frameEl.firstElementChild : inner
    let observer: IntersectionObserver | undefined
    // Already on screen when the page opens: no wipe, never hide what the visitor is looking at.
    if (frameEl.getBoundingClientRect().top >= window.innerHeight) {
      revealed.style.clipPath = 'inset(100% 0 0 0)'
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return
          observer?.disconnect()
          revealed.style.transition = `clip-path 0.9s ${MOTION_EASE.power3Out} 0.15s`
          revealed.style.clipPath = 'inset(0)'
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
      )
      observer.observe(frameEl)
    }

    const stopScroll = onScrollFrame(() => {
      const rect = frameEl.getBoundingClientRect()
      const progress = viewportCrossProgress(rect.top, rect.height, window.innerHeight)
      inner.style.transform = `translateY(${-10 + 20 * progress}%) scale(1.2)`
    })

    return () => {
      observer?.disconnect()
      stopScroll()
      inner.style.removeProperty('transform')
      revealed.style.removeProperty('clip-path')
      revealed.style.removeProperty('transition')
    }
  })
}

/**
 * Pop-in of a row of items (`[data-pop-in]` inside the container) once the container's top reaches 80% of the
 * viewport: each scales up from 0.85 with a little overshoot, 0.12s after the previous one.
 */
export const usePopInOnView = (container: Ref<HTMLElement | null>): void => {
  useClientMotion(() => {
    const containerEl = container.value
    if (containerEl === null) return undefined
    const animations = [...containerEl.querySelectorAll<HTMLElement>('[data-pop-in]')].map(
      (item, index) => {
        const animation = item.animate(
          [
            { transform: 'scale(0.85)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 500, delay: index * 120, easing: MOTION_EASE.backOut, fill: 'backwards' },
        )
        animation.pause()
        return animation
      },
    )
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        for (const animation of animations) animation.play()
      },
      { rootMargin: '0px 0px -20% 0px' },
    )
    observer.observe(containerEl)
    return () => {
      observer.disconnect()
      for (const animation of animations) animation.cancel()
    }
  })
}
