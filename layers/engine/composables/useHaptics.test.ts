// UseHaptics is a stable no-op interface (the web has no haptics API): callers need no guards and nothing throws.
import { describe, expect, it } from 'vite-plus/test'
import { useHaptics } from '#engine/composables/useHaptics'

describe('useHaptics', () => {
  it('exposes impact, notification and selection that resolve with nothing, with or without a style', async () => {
    const { impact, notification, selection } = useHaptics()
    await expect(impact()).resolves.toBeUndefined()
    await expect(impact('Heavy')).resolves.toBeUndefined()
    await expect(notification()).resolves.toBeUndefined()
    await expect(notification('Error')).resolves.toBeUndefined()
    await expect(selection()).resolves.toBeUndefined()
  })
})
