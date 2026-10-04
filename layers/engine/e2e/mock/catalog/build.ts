/*
 * Builders for the catalogs: a product literal only states what is special about it, the rest takes the defaults of an
 * ordinary visible, available, discountable product. Prices are decimal strings ("12.50"), as the API sends them.
 */

export interface MockChoice {
  id: string
  productId: string
  choiceGroupId: string
  priceModifier: string
  sortOrder: number
  name: string
}

export interface MockChoiceGroup {
  id: string
  productId: string
  minSelections: number
  maxSelections: number
  sortOrder: number
  name: string
  choices: MockChoice[]
}

export interface MockCategoryRef {
  id: string
  name: string
  slug: string
  order: number
}

export interface MockProduct {
  id: string
  name: string
  slug: string
  price: string
  description: string | null
  code: string | null
  pieceCount: number | null
  isVisible: boolean
  isAvailable: boolean
  isHalal: boolean
  isLunchOnly: boolean
  isSpicy: boolean
  isVegetarian: boolean
  isDiscountable: boolean
  categoryId: string
  category: MockCategoryRef
  choices: MockChoice[]
  choiceGroups: MockChoiceGroup[]
}

export interface MockCategory extends MockCategoryRef {
  products: MockProduct[]
}

/** `[id, name, priceModifier]` */
export type ChoiceSpec = [id: string, name: string, priceModifier: string]

export interface GroupSpec {
  id: string
  name: string
  min: number
  max: number
  choices: ChoiceSpec[]
}

export type ProductSpec = Partial<
  Omit<MockProduct, 'category' | 'categoryId' | 'choices' | 'choiceGroups'>
> &
  Pick<MockProduct, 'id' | 'name' | 'slug' | 'price'> & { groups?: GroupSpec[] }

export class CatalogBuilder {
  readonly categories: MockCategory[] = []

  category(id: string, name: string, slug: string, products: ProductSpec[] = []): this {
    const ref: MockCategoryRef = { id, name, slug, order: this.categories.length + 1 }
    this.categories.push({ ...ref, products: products.map((spec) => buildProduct(ref, spec)) })
    return this
  }
}

function buildProduct(category: MockCategoryRef, spec: ProductSpec): MockProduct {
  const { groups = [], ...rest } = spec
  const choiceGroups: MockChoiceGroup[] = groups.map((group, groupIndex) => ({
    id: group.id,
    productId: spec.id,
    minSelections: group.min,
    maxSelections: group.max,
    sortOrder: groupIndex,
    name: group.name,
    choices: group.choices.map(([id, name, priceModifier], choiceIndex) => ({
      id,
      productId: spec.id,
      choiceGroupId: group.id,
      priceModifier,
      sortOrder: choiceIndex,
      name,
    })),
  }))
  return {
    description: null,
    code: null,
    pieceCount: null,
    isVisible: true,
    isAvailable: true,
    isHalal: false,
    isLunchOnly: false,
    isSpicy: false,
    isVegetarian: false,
    isDiscountable: true,
    ...rest,
    categoryId: category.id,
    category,
    choiceGroups,
    choices: choiceGroups.flatMap((group) => group.choices),
  }
}
