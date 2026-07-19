import { brand } from './brand'

// Merged into the app config by Nuxt's layer system and read app-wide via
// `useAppConfig().brand`. The data lives in ./brand.ts so Nitro server routes
// can import it too (via the #brand alias).
export default defineAppConfig({ brand })
