import en from './locales/en.json'
import fr from './locales/fr.json'
import zh from './locales/zh.json'

import { defineI18nConfig } from '#imports'

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
    ],
    messages: {
        en,
        fr,
        zh
    }
}));
