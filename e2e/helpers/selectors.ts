export const SEL = {
  // Product cards
  productCard: '[data-testid="product-card"]',
  productName: '[data-testid="product-name"]',
  productAddToCart: '[data-testid="product-add-to-cart"]',
  simpleProduct: '[data-testid="product-card"][data-has-choices="false"]',
  choiceProduct: '[data-testid="product-card"][data-has-choices="true"]',

  // Product modal
  productModal: '[data-testid="product-modal"]',
  productModalAddToCart: '[data-testid="product-modal-add-to-cart"]',

  // SideCart (desktop)
  sideCart: '[data-testid="side-cart"]',
  cartOptionDelivery: '[data-testid="cart-option-delivery"]',
  cartOptionPickup: '[data-testid="cart-option-pickup"]',
  cartTotal: '[data-testid="cart-total"]',
  cartMinimumWarning: '[data-testid="cart-minimum-warning"]',
  cartCheckoutLink: '[data-testid="cart-checkout-link"]',
  cartItem: '[data-testid="cart-item"]',
  cartItemQuantity: '[data-testid="cart-item-quantity"]',
  cartItemDecrement: '[data-testid="cart-item-decrement"]',
  cartItemIncrement: '[data-testid="cart-item-increment"]',
  cartItemRemove: '[data-testid="cart-item-remove"]',

  // Cart page (mobile)
  cartEmpty: '[data-testid="cart-empty"]',

  // Checkout
  checkoutRestaurantClosed: '[data-testid="checkout-restaurant-closed"]',
  checkoutPlaceOrder: '[data-testid="checkout-place-order"]',
  checkoutOptionDelivery: '[data-testid="checkout-option-delivery"]',
  checkoutOptionPickup: '[data-testid="checkout-option-pickup"]',
  checkoutPreferredTime: '[data-testid="checkout-preferred-time"]',
  paymentOnline: '[data-testid="payment-online"]',
  paymentCash: '[data-testid="payment-cash"]',

  // Coupon
  couponInput: '[data-testid="coupon-input"]',
  couponApply: '[data-testid="coupon-apply"]',
  couponError: '[data-testid="coupon-error"]',
  couponApplied: '[data-testid="coupon-applied"]',
  couponRemove: '[data-testid="coupon-remove"]',

  // Auth
  loginSubmit: '[data-testid="login-submit"]',
  loginError: '[data-testid="login-error"]',

  // Order completed
  orderCompletedTitle: '[data-testid="order-completed-title"]',

  // Navigation
  categoryCard: '[data-testid="category-card"]',
  languagePicker: '[data-testid="language-picker"]',
} as const
