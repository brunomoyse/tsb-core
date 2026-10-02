/*
 * GraphQL fragments shared by every document that reads the items of an order (the /me widget,
 * /me/orders and the confirmation page, both brands), so they cannot drift apart.
 *
 * `selections` carries only ids and the line-wide quantity: the API's `OrderItemSelection.choice` and
 * `.group` are non-null but never filled by the backend, so asking for them fails the whole order.
 * The choice names, prices and the group rules (min/max, which reorder checks) come from the product
 * itself: `choices { choiceGroupId ... }` and `choiceGroups { ... }`.
 */
export const ORDER_ITEMS_SELECTION = `items {
        unitPrice
        quantity
        totalPrice
        product {
          id name code slug price pieceCount isAvailable isDiscountable isHalal isLunchOnly isSpicy isVegetarian isVisible
          category { id name order }
          choices { id productId choiceGroupId priceModifier sortOrder name }
          choiceGroups { id productId minSelections maxSelections sortOrder name }
        }
        choice { id productId choiceGroupId priceModifier sortOrder name }
        selections { groupId choiceId quantity }
      }`
