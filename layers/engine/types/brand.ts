// BrandConfig is the per-restaurant identity consumed across the app via
// `useAppConfig().brand`. Each brand app supplies one of these from its own
// Root (`apps/<brand>/brand.ts` → `apps/<brand>/app.config.ts`), reachable in
// Engine server routes via the `#brand` alias. Non-secret, build-time data.

/**
 * A free extra the customer can attach to an order at checkout (cutlery, condiments).
 * `name` is what the API, the dashboard and the kitchen receive in `orderExtra[].name`.
 */
export interface OrderExtraConfig {
  name: string
  /** Ticked on a fresh cart (and re-ticked at checkout when it is category-restricted). */
  preselected: boolean
  /** Choices for an extra that has a variant (soy sauce: sweet, salty, both). */
  options?: string[]
  /** The option sent when the extra is pre-selected; defaults to the first option. */
  defaultOption?: string
  /**
   * Not offered, and cleared, while every cart item belongs to one of these
   * category slugs (e.g. no wasabi with a hot-dishes-only cart).
   */
  unavailableWhenCartOnlyIn?: string[]
}

/** One day of opening hours, "HH:MM" in the restaurant's time zone; the dinner pair is for a split day. */
export interface BrandDayHours {
  open: string
  close: string
  dinnerOpen?: string
  dinnerClose?: string
}

/** Keyed by monday..sunday (what restaurantConfig.openingHours uses); null or absent means closed. */
export type BrandOpeningHours = Partial<
  Record<
    'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
    BrandDayHours | null
  >
>

export interface BrandConfig {
  /** Customer-facing display name, e.g. "Tokyo Sushi Bar". */
  name: string
  /**
   * Registered legal entity, e.g. "Tokyo Sushi Bar — SRL". Use the plain
   * trading name until the legal form is confirmed — never guess "— SRL".
   */
  legalName: string
  /**
   * Legal form as it prefixes the name in running legal text ("la SRL Tokyo Sushi Bar").
   * Omit until the form is confirmed: the text then uses the plain trading name.
   */
  legalForm?: string
  /**
   * VAT / company registration number. Omit until the real number is known:
   * the legal pages then drop the line rather than publishing a placeholder,
   * which would be a false company identifier on a public site.
   */
  vat?: string
  address: {
    street: string
    city: string
    postal: string
    region: string
    /** ISO 3166-1 alpha-2 country code, e.g. "BE". */
    country: string
  }
  phone: string
  email: string
  /** Public website domain (no scheme), e.g. "tokyosushibarliege.be". */
  domain: string
  /**
   * Social profiles; all optional — each brand sets the networks it has.
   * Values feed schema.org sameAs and the app's own footer/contact links.
   */
  socials: {
    instagram?: string
    facebook?: string
    tiktok?: string
    rednote?: string
  }
  geo: {
    lat: number
    lng: number
  }
  /** Deep link to the restaurant on Google Maps. */
  mapsUrl: string
  /** Year the restaurant opened; drives "X years" copy on the homepage. */
  foundingYear: number
  /**
   * What the restaurant sells, as it reads in running text ("plats japonais" in the terms of sale).
   * `fr` is required (the legal pages are French); the other languages are for copy that is translated.
   */
  dishesLabel: { fr: string; en?: string; nl?: string; zh?: string }
  /** Legal representatives listed on the terms page. Omit when unconfirmed. */
  administrators?: string[]
  /** Schema.org servesCuisine value(s), e.g. ["Japanese", "Sushi"]. */
  cuisine: string | string[]
  /** Whether the restaurant takes table bookings (by phone): the schema.org acceptsReservations. */
  acceptsReservations: boolean
  /**
   * Opening hours published in the schema.org Restaurant JSON-LD when the live restaurantConfig is not available
   * (the API is down while the page renders). The live hours always win: this is only the fallback, so keep it
   * in line with what the restaurant has configured.
   */
  openingHours?: BrandOpeningHours
  /** Logo as a path under public/ (square, at least 112x112 px): the schema.org `logo`. */
  logo: string
  /** Schema.org priceRange value, e.g. "€€". */
  priceRange: string
  /**
   * Whether home delivery is offered. Defaults to true when omitted. Set
   * false for a takeaway-only launch: the brand's UI disables the delivery
   * toggles ("available soon") and the cart is kept on PICKUP.
   */
  deliveryEnabled?: boolean
  /**
   * Whether the brand publishes a customer mobile app. The privacy policy describes the app (push notifications, live
   * activities, device tokens) only when it does; a brand without one gets the web-only text.
   */
  hasMobileApp: boolean
  /**
   * Real, publicly verifiable review aggregate. Omit entirely for a brand
   * with no reviews yet — schema.org then drops aggregateRating rather than
   * publishing invented numbers, which would be fabricated review data in
   * search results (a structured-data policy violation).
   */
  rating?: {
    value: number
    count: number
  }
  /** Email address handling account-deletion requests. */
  deletionEmail: string
  /**
   * Show the internal menu code ("E1") next to the category on cart and
   * order lines. Defaults to false: on a menu without printed codes it
   * reads like debug output.
   */
  showProductCode?: boolean
  /**
   * Display names for the choice groups of a category's products, by category slug, as i18n keys: the group of a
   * "menu-plateau" product is shown as its soup ("1 soupe", "2 soupes") whatever the catalog calls it. Omit for
   * a brand that shows the catalog's group names.
   */
  choiceGroupLabels?: Record<string, { one: string; other: string }>
  /**
   * Decorative Japanese accents (kanji watermarks, hanko seal, torii
   * divider, falling petals) in the shared shop components. Off by default.
   */
  japaneseAccents?: boolean
  /** Illustration on the order-completed page (paths under /public, no extension for the avif/webp pair). */
  orderCompletedImage?: {
    avif: string
    webp: string
    fallback: string
  }
  /** Keys under `faq.questions` to list on the FAQ page, in order. */
  faqQuestions?: string[]
  /**
   * Free extras offered at checkout, in display order. Anything not listed is
   * neither shown nor sent: a persisted cart's other entries are dropped on load.
   */
  orderExtras: OrderExtraConfig[]
  /**
   * Slug of the category whose cheap products are sold as paid extras at the checkout (sauce cups, rice, ...).
   * Omit for a brand without paid extras: the section is then not offered.
   */
  paidExtrasCategorySlug?: string
}
