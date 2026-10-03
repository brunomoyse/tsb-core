import { type Ref, computed, nextTick, ref, useId } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useSwitchLocalePath } from '#i18n'
import { useTracking } from '#engine/composables/useTracking'

/** Each language is named in itself, so the link carries its own `lang` (a screen reader reads "中文" with a Chinese voice). */
const LANGUAGES = [
    { code: 'fr', label: 'Français', short: 'FR' },
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'nl', label: 'Nederlands', short: 'NL' },
    { code: 'zh', label: '中文', short: '中文' },
] as const

/**
 * The language picker is a disclosure (audit A13): a button with aria-expanded / aria-controls that reveals a plain list
 * of links, one per language, the current one marked aria-current. No listbox or option roles: those promise a widget
 * with arrow-key selection, while these are navigation links. Escape closes it and gives focus back to the button; a click
 * outside closes it; Tab moves through the links like through any list.
 *
 * Each brand owns the markup (button, panel, styles) and wires these refs: `rootRef` on the wrapper (click outside),
 * `buttonRef` on the button, `panelId` on the list. The wrapper also carries `data-language-picker` so the mobile menu,
 * which closes itself on Escape, leaves the key to an open picker.
 */
export function useLanguagePicker(): {
    open: Ref<boolean>
    rootRef: Ref<HTMLElement | null>
    buttonRef: Ref<HTMLElement | null>
    panelId: string
    languages: Readonly<Ref<{ code: string, label: string, short: string, to: string, current: boolean }[]>>
    current: Readonly<Ref<{ code: string, label: string, short: string }>>
    toggle: () => void
    close: (restoreFocus?: boolean) => void
    choose: (code: string) => void
} {
    const { locale, availableLocales } = useI18n()
    const switchLocalePath = useSwitchLocalePath()
    const { trackEvent } = useTracking()

    const open = ref(false)
    const rootRef = ref<HTMLElement | null>(null)
    const buttonRef = ref<HTMLElement | null>(null)
    const panelId = `language-panel-${useId()}`

    const languages = computed(() => LANGUAGES
        .filter((lang) => availableLocales.includes(lang.code))
        .map((lang) => ({ ...lang, to: switchLocalePath(lang.code), current: lang.code === locale.value })))

    const current = computed(() => LANGUAGES.find((lang) => lang.code === locale.value) ?? LANGUAGES[0])

    const close = (restoreFocus = false): void => {
        const wasOpen = open.value
        open.value = false
        if (restoreFocus && wasOpen) void nextTick(() => buttonRef.value?.focus())
    }
    const toggle = (): void => { open.value = !open.value }

    const choose = (code: string): void => {
        if (code !== locale.value) trackEvent('language_changed', { from_locale: locale.value, to_locale: code })
        close()
    }

    if (import.meta.client) {
        // Escape from the button or from a link in the list.
        useEventListener(rootRef, 'keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape' && open.value) {
                event.stopPropagation()
                close(true)
            }
        })
        onClickOutside(rootRef, () => { close() })
    }

    return { open, rootRef, buttonRef, panelId, languages, current, toggle, close, choose }
}
