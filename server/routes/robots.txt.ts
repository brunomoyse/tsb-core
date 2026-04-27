const PRODUCTION_BASE_URL = 'https://tokyosushibarliege.be'

export default defineEventHandler((event) => {
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

    const baseUrl = process.env.BASE_URL
    const isProduction = baseUrl === PRODUCTION_BASE_URL

    if (!isProduction) {
        return 'User-agent: *\nDisallow: /\n'
    }

    // Disallow paths must stay aligned with `sitemap.exclude` in nuxt.config.ts.
    return [
        'User-agent: *',
        'Allow: /',
        'Disallow: /auth/',
        'Disallow: /checkout',
        'Disallow: /me',
        'Disallow: /me/',
        'Disallow: /order-completed/',
        '',
        `Sitemap: ${baseUrl}/sitemap.xml`,
        '',
    ].join('\n')
})
