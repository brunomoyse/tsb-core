import { CatalogBuilder, type MockCategory } from './build.ts'

/*
 * Yangguofu (malatang): a bowl to compose (broth, at least 5 ingredients, spice) and fixed sets whose groups are all
 * pick-one. Numbers match the specs: the bowl is 2,50 + 1,00 per vegetable + 1,20 for udon; "Menu Découverte" is 20,80.
 */
export function ygfliegeCatalog(): MockCategory[] {
  const spice = (prefix: string) =>
    [
      [`${prefix}-doux`, 'Doux', '0.00'],
      [`${prefix}-moyen`, 'Moyen', '0.00'],
      [`${prefix}-fort`, 'Fort', '0.00'],
    ] as [string, string, string][]
  return new CatalogBuilder()
    .category('c-menus', 'Menus', 'menus', [
      {
        id: 'p-decouverte',
        name: 'Menu Découverte',
        slug: 'menu-decouverte',
        price: '20.80',
        description: 'Un set avec bouillon et piment au choix.',
        groups: [
          {
            id: 'g-set-base',
            name: 'Bouillon',
            min: 1,
            max: 1,
            choices: [
              ['ch-s-boeuf', "Bouillon d'os de bœuf épicé", '0.00'],
              ['ch-s-tomate', 'Bouillon tomate mijoté', '0.00'],
            ],
          },
          { id: 'g-set-spice', name: 'Niveau de piment', min: 1, max: 1, choices: spice('ch-s') },
        ],
      },
    ])
    .category('c-malatang', 'Malatang', 'malatang', [
      {
        id: 'p-bowl',
        name: 'Malatang sur mesure',
        slug: 'malatang-sur-mesure',
        price: '2.50',
        description: 'Composez votre bol.',
        groups: [
          {
            id: 'g-base',
            name: 'Bouillon',
            min: 1,
            max: 1,
            choices: [
              ['ch-tomate', 'Bouillon tomate mijoté', '0.00'],
              ['ch-boeuf', "Bouillon d'os de bœuf épicé", '0.00'],
              ['ch-champi', 'Bouillon champignons', '0.00'],
            ],
          },
          {
            id: 'g-ingr',
            name: 'Ingrédients',
            min: 5,
            max: 20,
            choices: [
              ['ch-pak', 'Pak choï', '1.00'],
              ['ch-epi', 'Épinards', '1.00'],
              ['ch-broc', 'Brocoli', '1.00'],
              ['ch-tofu', 'Tofu frais', '1.00'],
              ['ch-mais', 'Maïs doux', '1.00'],
              ['ch-udon', 'Nouilles udon', '1.20'],
              ['ch-crev', 'Crevettes', '2.50'],
              [
                'ch-boul',
                'Boulettes de poisson farcies au fromage et à la ciboulette fraîche',
                '2.50',
              ],
            ],
          },
          { id: 'g-spice', name: 'Niveau de piment', min: 1, max: 1, choices: spice('ch') },
        ],
      },
    ])
    .category('c-autres', 'Boissons et desserts', 'boissons', [
      {
        id: 'p-the',
        name: 'Thé glacé maison à la pêche blanche et au jasmin (50cl)',
        slug: 'the-glace',
        price: '3.20',
        code: 'D1',
        isDiscountable: false,
      },
      { id: 'p-mochi', name: 'Mochi', slug: 'mochi', price: '3.90', code: 'D2' },
      {
        id: 'p-gyoza',
        name: 'Gyoza de bœuf (5 pièces)',
        slug: 'gyoza-boeuf',
        price: '5.50',
        code: 'D3',
        pieceCount: 5,
      },
    ])
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
}
