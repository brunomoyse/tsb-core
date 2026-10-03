/**
 * Runs `task` once the browser has nothing better to do (a timeout for browsers without requestIdleCallback, Safari),
 * never before the page is interactive. For loading code the visitor is likely to need soon (a modal's chunk) without
 * putting it on the way of the first paint. Browser only; returns a cancel function.
 */
export function whenIdle(task: () => void, timeoutMs = 3000): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(task, { timeout: timeoutMs })
    return () => {
      window.cancelIdleCallback(id)
    }
  }
  const id = window.setTimeout(task, 1000)
  return () => {
    window.clearTimeout(id)
  }
}
