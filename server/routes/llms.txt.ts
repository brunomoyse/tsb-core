const PRODUCTION_BASE_URL = 'https://tokyosushibarliege.be'

export default defineEventHandler((event) => {
    const isProduction = process.env.BASE_URL === PRODUCTION_BASE_URL

    if (!isProduction) {
        throw createError({ statusCode: 404, statusMessage: 'Not Found' })
    }

    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

    return `# Tokyo Sushi Bar

> Restaurant japonais à Liège (Belgique). Sushi frais, sashimi et cuisine japonaise authentique. Livraison et à emporter, commande en ligne.

## Menu et commande

- [Menu](${PRODUCTION_BASE_URL}/fr/menu): Carte complète — sushi, sashimi, makis, plats chauds. Filtres halal et végétarien.
- [Accueil](${PRODUCTION_BASE_URL}/fr): Statut d'ouverture en direct, choix livraison/à emporter, présentation du restaurant.

## Informations pratiques

- [Contact](${PRODUCTION_BASE_URL}/fr/contact): Adresse (Rue de la Cathédrale 59, 4000 Liège), téléphone (+32 4 222 98 88), horaires d'ouverture, plan d'accès.
- [FAQ](${PRODUCTION_BASE_URL}/fr/faq): Questions fréquentes — livraison, options halal, allergies, paiement.

## Mentions légales

- [Conditions générales de vente](${PRODUCTION_BASE_URL}/fr/terms): Livraison, paiement, retours, mentions légales.
- [Politique de confidentialité](${PRODUCTION_BASE_URL}/fr/privacy): RGPD, cookies, données collectées.

## Autres langues

- English: ${PRODUCTION_BASE_URL}/en
- 中文: ${PRODUCTION_BASE_URL}/zh
- Nederlands: ${PRODUCTION_BASE_URL}/nl
`
})
