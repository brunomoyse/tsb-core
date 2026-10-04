// Plain-data builders for the catalogue types, shared by the unit tests. Every builder takes overrides, so a test
// States only what it cares about. Prices are decimal strings as the API sends them.
import type {
  CartItem,
  Product,
  ProductChoice,
  ProductChoiceSelection,
} from '../../layers/engine/types'

export function makeChoice(overrides: Partial<ProductChoice> = {}): ProductChoice {
  return {
    id: 'choice-1',
    productId: 'product-1',
    choiceGroupId: 'group-1',
    priceModifier: '0.00',
    sortOrder: 0,
    name: 'Choice',
    ...overrides,
  }
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    categoryId: 'category-1',
    category: { id: 'category-1', name: 'Sushi', order: 1, slug: 'sushi', products: [] },
    choices: [],
    code: 'S1',
    description: null,
    isAvailable: true,
    isDiscountable: true,
    isHalal: false,
    isLunchOnly: false,
    isSpicy: false,
    isVegetarian: false,
    isVisible: true,
    name: 'Salmon nigiri',
    pieceCount: null,
    price: '10.00',
    slug: 'salmon-nigiri',
    ...overrides,
  }
}

export function makeCartItem(
  overrides: Partial<CartItem> & { selections?: ProductChoiceSelection[] } = {},
): CartItem {
  const { selections, ...item } = overrides
  return {
    product: makeProduct(),
    quantity: 1,
    selectedChoices: selections ?? [],
    selectedChoice: null,
    ...item,
  }
}
