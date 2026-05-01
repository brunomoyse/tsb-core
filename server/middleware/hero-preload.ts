const HERO_LINK = [
    '</images/restaurant-illustrated-mobile.avif>; rel=preload; as=image; type="image/avif"; media="(max-width: 640px)"; fetchpriority="high"',
    '</images/restaurant-illustrated.avif>; rel=preload; as=image; type="image/avif"; media="(min-width: 641px)"; fetchpriority="high"',
].join(', ')

const HOMEPAGE_PATH = /^\/(?:(?:fr|en|zh|nl)\/?)?$/

export default defineEventHandler((event) => {
    const [pathname] = (event.path || '').split('?')
    if (HOMEPAGE_PATH.test(pathname)) {
        appendResponseHeader(event, 'Link', HERO_LINK)
    }
})
