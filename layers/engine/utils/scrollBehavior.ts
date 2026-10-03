/**
 * The `behavior` for a scripted scroll (`scrollIntoView`, `scrollTo`): 'smooth', unless the visitor asked their system for
 * reduced motion (WCAG 2.3.3, audit A19), then 'auto' (an instant jump). Read at call time, so a setting changed while the
 * page is open is honoured. Also 'auto' where there is no `window` (the server render), where nothing scrolls anyway.
 *
 * CSS smooth scrolling needs no helper: Tailwind's `scroll-smooth` is paired with `motion-reduce:scroll-auto`.
 */
export const scrollBehavior = (): ScrollBehavior => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'auto'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}
