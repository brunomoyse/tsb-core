import { brand } from '#brand/brand'
import { isMenuOpen, isShopEnabledValue } from '#engine/utils/shopGate'
import { useRuntimeConfig } from '#imports'

const PRODUCTION_BASE_URL = `https://${brand.domain}`

export default defineEventHandler((event) => {
  // Same source as the sitemap and robots.txt: the public runtime config's baseUrl.
  const config = useRuntimeConfig(event).public
  const baseUrl = (config.baseUrl ?? '').replace(/\/+$/u, '')
  const isProduction = baseUrl === PRODUCTION_BASE_URL

  if (!isProduction) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  // While the shop is switched off (utils/shopGate.ts) the menu page shows the static menu (staticMenuWhenShopClosed):
  // Broths, ingredients and the price by weight, no online ordering.
  const shopEnabled = isShopEnabledValue(config.shopEnabled)
  const ordering = shopEnabled ? ' Livraison et à emporter, commande en ligne.' : ''
  const menuDescription = shopEnabled
    ? 'Carte complète (bols malatang, bouillons signatures, nouilles, entrées et boissons).'
    : 'Les cinq bouillons signatures, les ingrédients frais et le prix au poids.'
  const menuLine = isMenuOpen(shopEnabled, brand.staticMenuWhenShopClosed)
    ? `- [Menu](${PRODUCTION_BASE_URL}/fr/menu): ${menuDescription}\n`
    : ''

  return `# ${brand.name}

> Restaurant de malatang (麻辣烫) à Liège (Belgique), franchise Yangguofu. Composez votre bol : bouillon aux herbes cuit à la minute, produits frais.${ordering}

## Menu et commande

${menuLine}- [Accueil](${PRODUCTION_BASE_URL}/fr): Statut d'ouverture en direct, choix livraison/à emporter, présentation du restaurant.
- [Le concept](${PRODUCTION_BASE_URL}/fr/concept): Le malatang expliqué en 4 étapes, le bouillon aux herbes (草本骨汤), questions fréquentes.

## Informations pratiques

- [Contact](${PRODUCTION_BASE_URL}/fr/contact): Adresse (${brand.address.street}, ${brand.address.postal} ${brand.address.city}), téléphone (${brand.phone}), horaires d'ouverture, plan d'accès.
- [À propos](${PRODUCTION_BASE_URL}/fr/about): L'histoire Yangguofu, de Harbin (2003) à Liège (2026).
- [FAQ](${PRODUCTION_BASE_URL}/fr/faq): Questions fréquentes (malatang, piquant, options végétariennes, livraison, paiement, allergènes).

## Mentions légales

- [Conditions générales de vente](${PRODUCTION_BASE_URL}/fr/terms): Livraison, paiement, retours, mentions légales.
- [Politique de confidentialité](${PRODUCTION_BASE_URL}/fr/privacy): RGPD, cookies, données collectées.

## Autres langues

- English: ${PRODUCTION_BASE_URL}/en
- 中文: ${PRODUCTION_BASE_URL}/zh
- Nederlands: ${PRODUCTION_BASE_URL}/nl
`
})
