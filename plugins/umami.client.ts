import { defineNuxtPlugin, useHead, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const websiteId = config.public.umamiWebsiteId as string
    const host = config.public.umamiHost as string

    if (!websiteId || !host) return

    useHead({
        script: [
            {
                src: `${host}/script.js`,
                async: true,
                defer: true,
                'data-website-id': websiteId,
            },
        ],
    })
})
