// POST /api/sentry-tunnel: forwards the browser's Sentry envelopes through our own origin (ad-blockers cannot match it),
// but only for the configured DSN, so it cannot be used as an open proxy. $fetch (Sentry's ingest) is the boundary.
// Run: `vp test run layers/engine/server/api/sentry-tunnel.post.server.test.ts`.
import { $fetch as $fetchMock, setRuntimeConfig } from '../../../../test/nitro/imports'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { callHandler } from '../../../../test/nitro/callHandler'
import handler from './sentry-tunnel.post'

const DSN = 'https://publickey@o123.ingest.sentry.io/456'
const envelope = (header: unknown = { dsn: DSN }) =>
  `${JSON.stringify(header)}\n{"type":"event"}\n{"message":"boom"}`

const post = (body?: string) =>
  callHandler(handler, { path: '/api/sentry-tunnel', method: 'POST', body })

beforeEach(() => {
  setRuntimeConfig({ public: { sentryDsn: DSN } })
  $fetchMock.mockResolvedValue('ok')
})

describe('an envelope for the configured DSN', () => {
  it("is forwarded to the project's ingest endpoint as it came, and answered with an empty 204", async () => {
    const body = envelope()
    const response = await post(body)

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://o123.ingest.sentry.io/api/456/envelope/',
      {
        method: 'POST',
        body: expect.any(Buffer),
        headers: { 'content-type': 'application/x-sentry-envelope' },
        responseType: 'text',
        timeout: 5000,
      },
    )
    const sent = $fetchMock.mock.calls[0]![1] as { body: Buffer }
    expect(sent.body.toString('utf-8')).toBe(body)
  })

  it('is accepted whatever the public key of the DSN, as long as host and project match', async () => {
    const response = await post(envelope({ dsn: 'https://otherkey@o123.ingest.sentry.io/456' }))
    expect(response.status).toBe(204)
    expect($fetchMock).toHaveBeenCalledOnce()
  })

  it('is answered 204 even when Sentry is down (the tunnel is best-effort and never fails the client)', async () => {
    $fetchMock.mockRejectedValue(new Error('timeout'))
    const response = await post(envelope())
    expect(response.status).toBe(204)
    expect($fetchMock).toHaveBeenCalledOnce()
  })
})

describe('a request that is refused', () => {
  const refuse = async (body: string | undefined, status: number, message: string) => {
    const response = await post(body)
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ statusMessage: message })
    expect($fetchMock).not.toHaveBeenCalled()
  }

  it('400: no body', async () => {
    await refuse(undefined, 400, 'Empty envelope')
  })

  it('400: an empty body', async () => {
    await refuse('', 400, 'Empty envelope')
  })

  it('400: no newline, so no header line', async () => {
    await refuse(JSON.stringify({ dsn: DSN }), 400, 'Malformed envelope')
  })

  it('400: the header line is not JSON', async () => {
    await refuse('not json\n{}', 400, 'Invalid envelope header')
  })

  it('400: the header names no DSN', async () => {
    await refuse(envelope({ sent_at: 'now' }), 400, 'Missing DSN')
  })

  it('400: the DSN of the header is not a URL', async () => {
    await refuse(envelope({ dsn: 'not a url' }), 400, 'Invalid DSN')
  })

  it('400: the configured DSN is not a URL', async () => {
    setRuntimeConfig({ public: { sentryDsn: 'not a url' } })
    await refuse(envelope(), 400, 'Invalid DSN')
  })

  it('503: Sentry is not configured for this shop', async () => {
    setRuntimeConfig({ public: {} })
    await refuse(envelope(), 503, 'Sentry disabled')
  })

  it('403: the DSN points to another Sentry host (no open proxy)', async () => {
    await refuse(envelope({ dsn: 'https://publickey@evil.example/456' }), 403, 'DSN mismatch')
  })

  it('403: the DSN points to another project of the same host', async () => {
    await refuse(
      envelope({ dsn: 'https://publickey@o123.ingest.sentry.io/999' }),
      403,
      'DSN mismatch',
    )
  })
})
