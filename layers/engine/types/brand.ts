// BrandConfig is the per-restaurant identity consumed across the app via
// `useAppConfig().brand`. Each brand app supplies one of these from its own
// root (`apps/<brand>/brand.ts` → `apps/<brand>/app.config.ts`), reachable in
// engine server routes via the `#brand` alias. Non-secret, build-time data.

/**
 * Free extras a customer can tick at checkout. Each is sent on the order as
 * `{ name: <key> }` (sauce also carries its option) and printed as is on the
 * kitchen ticket, so keys are stable identifiers, never display text.
 */
export type OrderExtraKey = 'chopsticks' | 'cutlery' | 'wasabi' | 'ginger' | 'sauce'

export interface OrderExtrasConfig {
    /** Extras offered at checkout, in display order. */
    available: OrderExtraKey[]
    /** Ticked when the customer first reaches checkout with a cart. */
    preselected?: OrderExtraKey[]
    /**
     * Category slugs whose items take no condiments (wasabi, ginger, sauce):
     * a cart made only of them gets those extras disabled and unticked.
     */
    condimentFreeCategories?: string[]
}

export interface BrandConfig {
    /** Customer-facing display name, e.g. "Tokyo Sushi Bar". */
    name: string
    /**
     * Registered legal entity, e.g. "Tokyo Sushi Bar — SRL". Use the plain
     * trading name until the legal form is confirmed — never guess "— SRL".
     */
    legalName: string
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
    /** Legal representatives listed on the terms page. Omit when unconfirmed. */
    administrators?: string[]
    /** schema.org servesCuisine value, e.g. "Japanese". */
    cuisine: string
    /** schema.org Menu description (one English sentence about the menu). */
    menuDescription?: string
    /** schema.org priceRange value, e.g. "€€". */
    priceRange: string
    /**
     * Whether home delivery is offered. Defaults to true when omitted. Set
     * false for a takeaway-only launch: the brand's UI disables the delivery
     * toggles ("available soon") and the cart is kept on PICKUP.
     */
    deliveryEnabled?: boolean
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
    /** Checkout extras. Omit to offer chopsticks only, unticked. */
    orderExtras?: OrderExtrasConfig
}
