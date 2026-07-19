export default defineNuxtPlugin(() => {
    if (!('orientation' in screen)) return

    const orientationApi = screen.orientation as ScreenOrientation & {
        lock?: (orientation: OrientationLockType) => Promise<void>
    }

    if (typeof orientationApi.lock !== 'function') return

    const tryLockPortrait = async () => {
        try {
            await orientationApi.lock('portrait')
        } catch {
            // Some browsers require fullscreen or user gesture; ignore failures.
        }
    }

    void tryLockPortrait()

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            void tryLockPortrait()
        }
    })
})
