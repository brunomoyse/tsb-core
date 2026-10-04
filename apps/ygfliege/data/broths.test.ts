import { BROTHS, brothPhotoSlugs, brothSlugForName } from './broths'
import { describe, expect, it } from 'vite-plus/test'

describe('BROTHS', () => {
  it('lists the five signature broths with unique keys and slugs', () => {
    expect(BROTHS).toHaveLength(5)
    expect(new Set(BROTHS.map((b) => b.key)).size).toBe(5)
    expect(new Set(BROTHS.map((b) => b.slug)).size).toBe(5)
  })
})

describe('brothSlugForName', () => {
  it.each([
    // French, English, Dutch and Chinese names of the seed.
    ['Bouillon Tom Yum', 'tom-yum'],
    ['Tomyum-bouillon', 'tom-yum'],
    ['冬阴功', 'tom-yum'],
    ['Bouillon Tomate', 'tomato'],
    ['Tomato broth', 'tomato'],
    ['Tomatenbouillon', 'tomato'],
    ['番茄汤', 'tomato'],
    ['Bouillon de bœuf', 'beef-bone'],
    ['Bouillon de boeuf', 'beef-bone'],
    ['Beef bone', 'beef-bone'],
    ['Runderbottenbouillon', 'beef-bone'],
    ['牛骨汤', 'beef-bone'],
    ['Champignons', 'mushroom'],
    ['Mushroom', 'mushroom'],
    ['Paddenstoelen', 'mushroom'],
    ['菌汤', 'mushroom'],
    ['Mala sec', 'mala-dry-mix'],
    ['麻辣拌', 'mala-dry-mix'],
  ])('%s -> %s', (name, slug) => {
    expect(brothSlugForName(name)).toBe(slug)
  })

  it('tests tom yum before tomato, so "tomyum" never lands in the tomato bucket', () => {
    expect(brothSlugForName('Tom yum tomate')).toBe('tom-yum')
  })

  it('is case-insensitive and undefined for an unknown name', () => {
    expect(brothSlugForName('TOMATO')).toBe('tomato')
    expect(brothSlugForName('Eau plate')).toBeUndefined()
    expect(brothSlugForName('')).toBeUndefined()
  })
})

describe('brothPhotoSlugs', () => {
  it('maps every choice id to its photo slug for a fully recognised group', () => {
    expect(
      brothPhotoSlugs([
        { id: 'c1', name: 'Tomate' },
        { id: 'c2', name: 'Bœuf' },
        { id: 'c3', name: 'Champignons' },
      ]),
    ).toEqual({ c1: 'tomato', c2: 'beef-bone', c3: 'mushroom' })
  })

  it('an empty group gets no photos', () => {
    expect(brothPhotoSlugs([])).toBeNull()
  })

  it('all-or-nothing: one unrecognised choice turns the whole group into text chips', () => {
    expect(
      brothPhotoSlugs([
        { id: 'c1', name: 'Tomate' },
        { id: 'c2', name: 'Eau' },
      ]),
    ).toBeNull()
  })

  it('all-or-nothing: two choices resolving to the same broth give no photos either', () => {
    expect(
      brothPhotoSlugs([
        { id: 'c1', name: 'Tomate' },
        { id: 'c2', name: 'Tomato' },
      ]),
    ).toBeNull()
  })
})
