import type { MockBrand } from '../types.ts'
import type { MockCategory, MockProduct } from './build.ts'
import { tokyosushiCatalog } from './tokyosushi.ts'
import { ygfliegeCatalog } from './ygfliege.ts'

export type { MockCategory, MockProduct } from './build.ts'

/** A fresh catalog (mutable: a spec may flip `isAvailable` or a price through the control API). */
export const catalogFor = (brand: MockBrand): MockCategory[] =>
  brand === 'tokyosushi' ? tokyosushiCatalog() : ygfliegeCatalog()

export const allProducts = (catalog: MockCategory[]): MockProduct[] =>
  catalog.flatMap((category) => category.products)

export const findProduct = (catalog: MockCategory[], id: string): MockProduct | undefined =>
  allProducts(catalog).find((product) => product.id === id)
