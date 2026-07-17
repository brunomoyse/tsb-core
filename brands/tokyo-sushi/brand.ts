import type { BrandConfig } from '../../types/brand'

// Single source of truth for Tokyo Sushi Bar identity. Consumed by app.config
// (Vue side, via useAppConfig().brand) and by Nitro server routes (via the
// #brand alias) so both render from the same data.
export const brand: BrandConfig = {
    name: 'Tokyo Sushi Bar',
    legalName: 'Tokyo Sushi Bar — SRL',
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
    cuisine: 'Japanese',
    priceRange: '€€',
    rating: {
        value: 4.7,
        count: 248,
    },
    deletionEmail: 'cloud@nuagemagique.dev',
}
