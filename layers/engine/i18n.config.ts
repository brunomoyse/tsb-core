import { defineI18nConfig } from '#imports'
import en from './locales/en.json'
import fr from './locales/fr.json'
import nl from './locales/nl.json'
import zh from './locales/zh.json'
// The extending brand app's locale overrides (resolved via the #brand alias,
// which each app points at its own root). Each brand supplies at least `brandName`.
import brandEn from '#brand/locales/en.json'
import brandFr from '#brand/locales/fr.json'
import brandNl from '#brand/locales/nl.json'
import brandZh from '#brand/locales/zh.json'

type Messages = Record<string, unknown>

// Deep-merge brand overrides onto the base messages (brand wins on leaf keys).
function deepMerge(base: Messages, override: Messages): Messages {
    const out: Messages = { ...base }
    for (const [k, v] of Object.entries(override)) {
        const b = out[k]
        if (v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)) {
            out[k] = deepMerge(b as Messages, v as Messages)
        } else {
            out[k] = v
        }
    }
    return out
}

// Replace the `__BRAND__` token in every string with the resolved brand name,
// so base locale strings stay brand-neutral while rendering the active brand.
function applyBrand(node: unknown, brandName: string): unknown {
    if (typeof node === 'string') return node.replaceAll('__BRAND__', brandName)
    if (Array.isArray(node)) return node.map((n) => applyBrand(n, brandName))
    if (node && typeof node === 'object') {
        const out: Messages = {}
        for (const [k, v] of Object.entries(node as Messages)) out[k] = applyBrand(v, brandName)
        return out
    }
    return node
}

function build(base: Messages, brand: Messages): Messages {
    const merged = deepMerge(base, brand)
    const brandName = (merged.brandName as string) || ''
    return applyBrand(merged, brandName) as Messages
}

export default defineI18nConfig(() => ({
    legacy: false,
    locales: [
        {
            code: "fr",
            iso: "fr-BE",
            file: "fr-FR.js",
            name: "Français",
        },
        {
            code: "en",
            iso: "en-US",
            file: "en-US.js",
            name: "English",
        },
        {
            code: "zh",
            iso: "zh-CN",
            file: "zh-CN.js",
            name: "中文",
        },
        {
            code: "nl",
            iso: "nl-BE",
            file: "nl-BE.js",
            name: "Nederlands",
        },
    ],
    messages: {
        en: build(en, brandEn),
        fr: build(fr, brandFr),
        nl: build(nl, brandNl),
        zh: build(zh, brandZh),
    }
}));
