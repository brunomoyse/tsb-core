// V-reveal — IntersectionObserver-based scroll-reveal for marketing sections.
// Registered universally: the server side is a no-op (getSSRProps) so SSR can
// Resolve the directive and content renders visible for crawlers/no-JS; the
// Hidden state is only applied client-side on mount. Usage:
//   <div v-reveal>…</div>            fades/slides in when scrolled into view
//   <div v-reveal="2">…</div>        staggered delay step (0.12s × n)
// Respects prefers-reduced-motion (reveals immediately).
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) {
    nuxtApp.vueApp.directive('reveal', {
      getSSRProps: () => ({}),
    })
    return
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  )

  nuxtApp.vueApp.directive('reveal', {
    mounted(el: HTMLElement, binding) {
      if (reduced) return
      // Already on screen at hydration (the hero): never hide what the visitor is looking at, it would flash.
      if (el.getBoundingClientRect().top < window.innerHeight) return
      el.classList.add('reveal-init')
      const delay = Number(binding.value) || 0
      if (delay > 0) el.style.transitionDelay = `${delay * 0.12}s`
      observer.observe(el)
    },
    unmounted(el: HTMLElement) {
      observer.unobserve(el)
    },
  })
})
