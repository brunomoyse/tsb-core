import { type EventHandler, createApp, toWebHandler } from 'h3'

export interface HandlerRequest {
  path?: string
  method?: string
  headers?: Record<string, string>
  body?: BodyInit
}

/** Runs one h3 event handler through a real h3 app and returns the Web `Response` (status, headers, body). */
export function callHandler(
  handler: EventHandler,
  { path = '/', method = 'GET', headers, body }: HandlerRequest = {},
): Promise<Response> {
  const app = createApp()
  app.use(handler)
  return toWebHandler(app)(new Request(`http://localhost${path}`, { method, headers, body }))
}
