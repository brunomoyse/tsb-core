import { createError, defineEventHandler, readRawBody, setResponseStatus } from 'h3'

/*
 * Sentry tunnel — forwards envelopes from the browser to Sentry's ingest endpoint
 * via our own origin. Ad-blockers and privacy extensions that block *.ingest.sentry.io
 * cannot match our domain, so events get through.
 * https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
 */

export default defineEventHandler(async (event) => {
    const envelope = await readRawBody(event, false)
    if (!envelope || envelope.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'Empty envelope' })
    }

    const text = envelope.toString('utf-8')
    const newlineIdx = text.indexOf('\n')
    if (newlineIdx === -1) {
        throw createError({ statusCode: 400, statusMessage: 'Malformed envelope' })
    }

    let header: { dsn?: string }
    try {
        header = JSON.parse(text.slice(0, newlineIdx))
    } catch {
        throw createError({ statusCode: 400, statusMessage: 'Invalid envelope header' })
    }

    if (!header.dsn) {
        throw createError({ statusCode: 400, statusMessage: 'Missing DSN' })
    }

    const cfg = useRuntimeConfig(event)
    const allowedDsn = cfg.public.sentryDsn as string
    if (!allowedDsn) {
        throw createError({ statusCode: 503, statusMessage: 'Sentry disabled' })
    }

    let incoming: URL
    let allowed: URL
    try {
        incoming = new URL(header.dsn)
        allowed = new URL(allowedDsn)
    } catch {
        throw createError({ statusCode: 400, statusMessage: 'Invalid DSN' })
    }

    // Only forward envelopes targeted at the configured DSN.
    // Prevents this endpoint from being used as an open proxy to arbitrary Sentry projects.
    if (incoming.hostname !== allowed.hostname || incoming.pathname !== allowed.pathname) {
        throw createError({ statusCode: 403, statusMessage: 'DSN mismatch' })
    }

    const projectId = incoming.pathname.replace(/^\//u, '')
    const ingestUrl = `https://${incoming.hostname}/api/${projectId}/envelope/`

    try {
        await $fetch(ingestUrl, {
            method: 'POST',
            body: envelope,
            headers: { 'content-type': 'application/x-sentry-envelope' },
            responseType: 'text',
            timeout: 5000,
        })
    } catch {
        // Sentry ingest is best-effort — never surface failures to the client.
    }

    setResponseStatus(event, 204)
    return ''
})
