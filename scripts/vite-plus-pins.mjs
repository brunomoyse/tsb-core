// Dependabot bumps vite-plus and @voidzero-dev/* as one group, but two pins stay behind: the `overrides.vite` alias
// (vite-plus-core of the same release) and @vitest/coverage-v8 (peer-pinned to the vitest vite-plus bundles).
// .github/workflows/dependabot-vite-plus.yml moves them on the Dependabot PR with sync-vite-plus-pins.mjs.

/**
 * @typedef {object} Manifest
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 * @property {Record<string, string>} [overrides]
 */

/**
 * @typedef {object} Lockfile
 * @property {Record<string, Manifest>} [packages]
 */

/**
 * @param {string} text JSON text
 * @returns {Record<string, unknown>}
 */
function parseObject(text) {
  /** @type {unknown} */
  const value = JSON.parse(text)
  return typeof value === 'object' && value !== null ? { ...value } : {}
}

/**
 * Replaces the one `"name": "from"` entry of a package.json text, keeping the rest of the file byte for byte.
 * @param {string} text package.json
 * @param {string} name entry name
 * @param {{ from: string, to: string }} change current and new value
 * @returns {string}
 */
function replaceEntry(text, name, { from, to }) {
  const entry = `${JSON.stringify(name)}: ${JSON.stringify(from)}`
  if (text.split(entry).length !== 2) {
    throw new Error(`expected one ${entry} in package.json`)
  }
  return text.replace(entry, `${JSON.stringify(name)}: ${JSON.stringify(to)}`)
}

/**
 * package.json text with `overrides.vite` and @vitest/coverage-v8 moved to the vite-plus release it declares.
 * Returns the text unchanged when both pins already hold.
 * @param {string} pkgText package.json
 * @param {string} lockText package-lock.json, as Dependabot left it
 * @returns {string}
 */
export function syncedPins(pkgText, lockText) {
  /** @type {Manifest} */
  const pkg = parseObject(pkgText)
  /** @type {Lockfile} */
  const lock = parseObject(lockText)
  const declared = pkg.devDependencies?.['vite-plus']
  const override = pkg.overrides?.vite
  if (declared === undefined || override === undefined) {
    throw new Error('package.json needs devDependencies.vite-plus and overrides.vite')
  }

  let text = pkgText
  const core = `npm:@voidzero-dev/vite-plus-core@${declared}`
  if (override !== core) {
    text = replaceEntry(text, 'vite', { from: override, to: core })
  }

  const coverage = pkg.devDependencies?.['@vitest/coverage-v8']
  if (coverage !== undefined) {
    const vitest = lock.packages?.['node_modules/vite-plus']?.dependencies?.vitest
    if (vitest === undefined) {
      throw new Error('package-lock.json has no vitest dependency for node_modules/vite-plus')
    }
    if (coverage !== vitest) {
      text = replaceEntry(text, '@vitest/coverage-v8', { from: coverage, to: vitest })
    }
  }
  return text
}
