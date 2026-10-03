import type { BrandConfig } from '#engine/types/brand'

// Single source of truth for Tokyo Sushi Bar identity. Consumed by app.config
// (Vue side, via useAppConfig().brand) and by Nitro server routes (via the
// #brand alias) so both render from the same data.
export const brand: BrandConfig = {
  name: 'Tokyo Sushi Bar',
  legalName: 'Tokyo Sushi Bar — SRL',
  legalForm: 'SRL',
  vat: 'BE0772.499.585',
  address: {
    street: 'Rue de la Cathédrale 59',
    city: 'Liège',
    postal: '4000',
    region: 'Wallonie',
    country: 'BE',
  },
  phone: '+32 4 222 98 88',
  email: 'tokyosushibar888@gmail.com',
  domain: 'tokyosushibarliege.be',
  socials: {
    instagram: 'https://www.instagram.com/tokyo_sushi_bar_liege/',
    facebook: 'https://www.facebook.com/sushiliege',
  },
  geo: {
    lat: 50.64245770697728,
    lng: 5.574703166758179,
  },
  mapsUrl: 'https://maps.app.goo.gl/XFqBuvzaAPzev7Tn7',
  foundingYear: 2016,
  administrators: ['Cheng Yanjie', 'Xu Sa', 'Zhu Mengmeng'],
  cuisine: ['Japanese', 'Sushi'],
  dishesLabel: {
    fr: 'plats japonais',
    en: 'Japanese dishes',
    nl: 'Japanse gerechten',
    zh: '日本料理',
  },
  // The customer iOS/Android app (tsb-mobile) is Tokyo Sushi's.
  hasMobileApp: true,
  // To book a table, customers phone the restaurant (see the contact page).
  acceptsReservations: true,
  // Square logo for the schema.org `logo` (public/).
  logo: '/android-chrome-512x512.png',
  // Fallback for the JSON-LD only (the live restaurantConfig wins): the hours this site has always published.
  openingHours: {
    monday: { open: '12:00', close: '14:30', dinnerOpen: '18:00', dinnerClose: '22:30' },
    tuesday: null,
    wednesday: { open: '12:00', close: '14:30', dinnerOpen: '18:00', dinnerClose: '22:30' },
    thursday: { open: '12:00', close: '14:30', dinnerOpen: '18:00', dinnerClose: '22:30' },
    friday: { open: '12:00', close: '14:30', dinnerOpen: '18:00', dinnerClose: '22:30' },
    saturday: { open: '12:00', close: '15:00', dinnerOpen: '18:00', dinnerClose: '23:00' },
    sunday: { open: '12:00', close: '15:00', dinnerOpen: '18:00', dinnerClose: '23:00' },
  },
  priceRange: '€€',
  rating: {
    value: 4.7,
    count: 248,
  },
  deletionEmail: 'cloud@nuagemagique.dev',
  showProductCode: true,
  // The choice groups of the "menu-plateau" menus are the soups, whatever the catalog calls them.
  choiceGroupLabels: { 'menu-plateau': { one: 'menu.soup', other: 'menu.soups' } },
  japaneseAccents: true,
  faqQuestions: [
    'delivery',
    'hours',
    'halal',
    'discount',
    'payment',
    'allergens',
    'invoice',
    'freshness',
    'parking',
  ],
  // Hot dishes ("tokyo-hot") are not eaten with wasabi, ginger or soy sauce.
  // Cheap products of this category are offered as paid extras at the checkout.
  paidExtrasCategorySlug: 'accompagnement',
  orderExtras: [
    { name: 'chopsticks', preselected: true },
    { name: 'wasabi', preselected: true, unavailableWhenCartOnlyIn: ['tokyo-hot'] },
    { name: 'ginger', preselected: true, unavailableWhenCartOnlyIn: ['tokyo-hot'] },
    {
      name: 'sauce',
      preselected: true,
      options: ['sweet', 'salty', 'both'],
      defaultOption: 'both',
      unavailableWhenCartOnlyIn: ['tokyo-hot'],
    },
  ],
}
