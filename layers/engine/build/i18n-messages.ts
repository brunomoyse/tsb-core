import { type Messages, buildLocaleMessages } from '../utils/localeMessages'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createJiti } from 'jiti'
import { defineNuxtModule } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'

/*
 * Writes the finished messages of the brand being built, one JSON file per language, and hands them to @nuxtjs/i18n
 * (audit PR 6.2, P11). They used to be four static imports of the engine's and the brand's files in i18n.config.ts,
 * merged and given the brand's name and phone in the browser, so every visitor downloaded and parsed all four
 * languages. As files registered with the language module they are loaded lazily: only the visitor's language (and
 * the French fallback) is fetched, already merged, so nothing is merged or replaced at run time.
 *
 * Must be listed BEFORE '@nuxtjs/i18n' in the engine's modules: that module asks for registered locales while it sets
 * itself up. The files go to node_modules/.cache of the brand app (.nuxt is emptied after the modules have run).
 */

const engineLocales = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales')

const readJson = (path: string): Messages => {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path} is not a JSON object`)
  }
  return parsed as Messages // oxlint-disable-line typescript/no-unsafe-type-assertion -- the shape is the locale tree, checked by the tests of the messages
}

const brandPhone = (loaded: unknown): string => {
  const brand =
    typeof loaded === 'object' && loaded !== null && 'brand' in loaded ? loaded.brand : undefined
  if (
    typeof brand === 'object' &&
    brand !== null &&
    'phone' in brand &&
    typeof brand.phone === 'string'
  ) {
    return brand.phone
  }
  throw new Error('brand.ts must export a `brand` with a `phone`')
}

export default defineNuxtModule({
  meta: { name: 'tsb-i18n-messages' },
  async setup(_options, nuxt) {
    const appRoot = nuxt.options.rootDir
    const outDir = resolve(appRoot, 'node_modules/.cache/tsb-i18n-messages')
    const locales = (nuxt.options.i18n?.locales ?? []).filter(
      (locale) => typeof locale !== 'string',
    )

    const generate = async (): Promise<void> => {
      // The brand's own identity (`#brand` is the app root): only the phone number is needed here.
      const jiti = createJiti(import.meta.url, { moduleCache: false })
      const loaded: unknown = await jiti.import(join(appRoot, 'brand.ts'))
      const phone = brandPhone(loaded)
      mkdirSync(outDir, { recursive: true })
      for (const { code } of locales) {
        const messages = buildLocaleMessages(
          readJson(join(engineLocales, `${code}.json`)),
          readJson(join(appRoot, 'locales', `${code}.json`)),
          phone,
        )
        const file = join(outDir, `${code}.json`)
        const next = `${JSON.stringify(messages)}\n`
        let current = ''
        try {
          current = readFileSync(file, 'utf8')
        } catch {
          // First build: nothing to compare with.
        }
        // Only a real change rewrites the file, so the watchers of the dev server are left alone.
        if (current !== next) writeFileSync(file, next)
      }
    }
    await generate()

    nuxt.hook('i18n:registerModule', (register) => {
      const moduleLocales = locales.map(({ code, language }) => ({
        code,
        language: language ?? code,
        file: `${code}.json`,
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see the comment above `register`
      })) as Parameters<typeof register>[0]['locales']
      register({
        langDir: outDir,
        // The module types its locale codes from the project's own config: ours are the same four, as plain strings.
        locales: moduleLocales,
      })
    })

    /*
     * The address of each language file, for the page to preload (middleware/preload-messages.global.ts). The module
     * names them `/_i18n/<hash of the files' content>/<locale>/messages.json` and only keeps the hash in its own bundle;
     * it adds those addresses to the routes Nitro prerenders, which is where they are read from. Private runtime config:
     * only the server render needs it.
     */
    nuxt.hook('nitro:init', (nitro) => {
      const urls: Record<string, string> = {}
      for (const route of nitro.options.prerender.routes ?? []) {
        const match = /^\/_i18n\/[^/]+\/(?<code>[^/]+)\/messages\.json$/u.exec(route)
        const code = match?.groups?.code
        if (code !== undefined && code !== '') urls[code] = route
      }
      ;(nitro.options.runtimeConfig as Record<string, unknown>).tsbI18nMessageUrls = urls
    })

    // Dev: a locale file of the engine or of the brand changed.
    nuxt.hook('builder:watch', async (_event, path) => {
      if (/(?:^|\/)locales\/[a-z]{2}\.json$/u.test(path) || path.endsWith('brand.ts'))
        await generate()
    })
  },
})
