import { CatalogBuilder, type MockCategory } from './build.ts'

/*
 * Tokyo Sushi: the menu shapes the specs rely on (a "gyoza" to search for, a pick-one product with a required sauce,
 * an unavailable item) plus the awkward ones the layout has to survive: very long names and descriptions, a group with
 * a dozen long choices, a multi-select group, a product that is not discountable. Prices and ids are stable: specs
 * assert totals computed from them.
 */
export function tokyosushiCatalog(): MockCategory[] {
  return (
    new CatalogBuilder()
      .category('c-entrees', 'Entrées', 'entrees', [
        {
          id: 'p-edamame',
          name: 'Edamame',
          slug: 'edamame',
          price: '4.50',
          code: 'E1',
          isVegetarian: true,
        },
        {
          id: 'p-miso',
          name: 'Soupe miso',
          slug: 'soupe-miso',
          price: '3.50',
          code: 'E2',
          isVegetarian: true,
        },
        {
          id: 'p-gyoza',
          name: 'Gyoza poulet et légumes (5 pièces)',
          slug: 'gyoza-poulet',
          price: '6.90',
          code: 'E3',
          pieceCount: 5,
        },
        {
          id: 'p-wakame',
          name: 'Salade de wakamé, concombre et graines de sésame torréfiées maison',
          slug: 'salade-wakame',
          price: '5.50',
          code: 'E4',
          isVegetarian: true,
          description:
            'Algues wakamé marinées, concombre croquant et graines de sésame grillées à la minute.',
        },
      ])
      .category('c-sushi', 'Sushi', 'sushi', [
        {
          id: 'p-maki',
          name: 'Maki saumon (6 pièces)',
          slug: 'maki-saumon',
          price: '6.50',
          code: 'S1',
          pieceCount: 6,
        },
        {
          id: 'p-nigiri',
          name: 'Nigiri thon (2 pièces)',
          slug: 'nigiri-thon',
          price: '5.90',
          code: 'S2',
          pieceCount: 2,
        },
        {
          id: 'p-long',
          name: 'Assortiment de sashimis premium du chef : saumon, thon rouge, dorade royale et daurade',
          slug: 'assortiment-sashimis',
          price: '24.90',
          code: 'S20',
          pieceCount: 18,
          description:
            'Un très long nom de produit pour vérifier la coupure du texte sur mobile, suivi d’une description qui dépasse largement deux lignes une fois affichée sur un écran étroit.',
        },
        {
          id: 'p-toro',
          name: 'Toro de thon rouge (rupture de stock)',
          slug: 'toro-thon-rouge',
          price: '14.00',
          code: 'S21',
          pieceCount: 4,
          isAvailable: false,
        },
      ])
      .category('c-chauds', 'Plats chauds', 'plats-chauds', [
        {
          id: 'p-teriyaki',
          name: 'Poulet teriyaki',
          slug: 'poulet-teriyaki',
          price: '12.90',
          code: 'P12',
          description: 'Poulet grillé, sauce au choix.',
          groups: [
            {
              id: 'g-sauce',
              name: 'Sauce',
              min: 1,
              max: 1,
              choices: [
                ['ch-teriyaki', 'Teriyaki', '0.00'],
                ['ch-piquante', 'Piquante', '0.50'],
                ['ch-aigre', 'Aigre-douce', '0.50'],
              ],
            },
          ],
        },
        {
          id: 'p-ramen',
          name: 'Ramen tonkotsu épicé',
          slug: 'ramen-tonkotsu',
          price: '14.50',
          code: 'P20',
          isSpicy: true,
        },
        {
          id: 'p-bento',
          name: 'Bento du chef : plat principal, accompagnements et boisson au choix',
          slug: 'bento-du-chef',
          price: '18.50',
          code: 'P30',
          description: 'Un plat, jusqu’à trois accompagnements et une boisson.',
          groups: [
            {
              id: 'g-bento-main',
              name: 'Plat principal',
              min: 1,
              max: 1,
              choices: [
                ['ch-b-saumon', 'Saumon grillé sauce teriyaki et riz parfumé au sésame', '0.00'],
                ['ch-b-poulet', 'Poulet karaage croustillant mayonnaise japonaise', '0.00'],
                ['ch-b-boeuf', 'Bœuf sauté aux oignons nouveaux et gingembre', '1.50'],
                ['ch-b-tofu', 'Tofu frit sauce ponzu et champignons shiitake', '0.00'],
              ],
            },
            {
              id: 'g-bento-sides',
              name: 'Accompagnements (jusqu’à 3)',
              min: 0,
              max: 3,
              choices: [
                ['ch-b-riz', 'Riz nature', '0.00'],
                ['ch-b-salade', 'Salade de chou', '0.50'],
                ['ch-b-edamame', 'Edamame', '1.00'],
                ['ch-b-gyoza', 'Gyoza (2 pièces)', '1.50'],
                [
                  'ch-b-kimchi',
                  'Kimchi maison très long nom pour tester le retour à la ligne',
                  '1.00',
                ],
              ],
            },
            {
              id: 'g-bento-drink',
              name: 'Boisson',
              min: 1,
              max: 1,
              choices: [
                ['ch-b-cola', 'Coca-Cola 33cl', '0.00'],
                ['ch-b-the', 'Thé vert glacé', '0.00'],
                ['ch-b-eau', 'Eau plate 50cl', '0.00'],
              ],
            },
          ],
        },
      ])
      .category('c-boissons', 'Boissons', 'boissons', [
        {
          id: 'p-cola',
          name: 'Coca-Cola 33cl',
          slug: 'coca-cola',
          price: '2.50',
          code: 'B1',
          isDiscountable: false,
        },
        {
          id: 'p-the',
          name: 'Thé vert glacé maison',
          slug: 'the-vert-glace',
          price: '3.00',
          code: 'B2',
          isDiscountable: false,
        },
      ])
      .category('c-desserts', 'Desserts', 'desserts', [
        {
          id: 'p-mochi',
          name: 'Mochi glacé (3 pièces)',
          slug: 'mochi-glace',
          price: '4.90',
          code: 'D1',
          pieceCount: 3,
          isVegetarian: true,
        },
      ])
      // The brand's paid extras (paidExtrasCategorySlug): cheap plain products offered as chips at checkout.
      .category('c-accomp', 'Accompagnements', 'accompagnement', [
        {
          id: 'p-x-soja',
          name: 'Sauce soja supplémentaire',
          slug: 'sauce-soja',
          price: '0.50',
          code: 'X1',
        },
        {
          id: 'p-x-baguettes',
          name: 'Baguettes supplémentaires',
          slug: 'baguettes',
          price: '0.30',
          code: 'X2',
        },
      ]).categories
  )
}
