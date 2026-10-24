import { describe, expect, it } from 'vite-plus/test'
import { syncedPins } from './vite-plus-pins.mjs'

const core = (version: string) => `npm:@voidzero-dev/vite-plus-core@${version}`
const pkg = (vitePlus: string, override: string, coverage?: string) =>
  `${JSON.stringify(
    {
      name: 'app',
      devDependencies: {
        ...(coverage === undefined ? {} : { '@vitest/coverage-v8': coverage }),
        'vite-plus': vitePlus,
      },
      overrides: { vite: override },
    },
    null,
    2,
  )}\n`
const lock = (vitest: string) =>
  JSON.stringify({ packages: { 'node_modules/vite-plus': { dependencies: { vitest } } } })

describe('syncedPins', () => {
  it('moves the override and coverage-v8 to the release a Dependabot bump declared', () => {
    expect(syncedPins(pkg('1.5.0', core('1.4.0'), '5.0.5'), lock('5.1.0'))).toBe(
      pkg('1.5.0', core('1.5.0'), '5.1.0'),
    )
  })

  it('leaves pins that hold untouched', () => {
    const holding = pkg('1.4.0', core('1.4.0'), '5.0.5')
    expect(syncedPins(holding, lock('5.0.5'))).toBe(holding)
  })

  it('moves only the override when the bundled vitest did not change', () => {
    expect(syncedPins(pkg('1.4.1', core('1.4.0'), '5.0.5'), lock('5.0.5'))).toBe(
      pkg('1.4.1', core('1.4.1'), '5.0.5'),
    )
  })

  it('needs no lockfile entry without coverage-v8', () => {
    expect(syncedPins(pkg('1.5.0', core('1.4.0')), '{}')).toBe(pkg('1.5.0', core('1.5.0')))
  })

  it('refuses a package.json without the override', () => {
    expect(() =>
      syncedPins(JSON.stringify({ devDependencies: { 'vite-plus': '1.4.0' } }), '{}'),
    ).toThrow('needs devDependencies.vite-plus and overrides.vite')
  })

  it('refuses a lockfile without the bundled vitest', () => {
    expect(() => syncedPins(pkg('1.5.0', core('1.4.0'), '5.0.5'), '{}')).toThrow(
      'no vitest dependency for node_modules/vite-plus',
    )
  })

  it('refuses an ambiguous entry rather than guessing', () => {
    const twice = pkg('1.5.0', core('1.4.0')).replace(
      '"name": "app"',
      `"name": "app", "x": {"vite": "${core('1.4.0')}"}`,
    )
    expect(() => syncedPins(twice, '{}')).toThrow('expected one')
  })
})
