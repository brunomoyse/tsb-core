/**
 * French counts 0 as singular ("0 article"), where vue-i18n's default for a two-form message ("article | articles")
 * picks the plural for 0. Three-form messages ("aucun | 1 | {count}") keep the default zero / one / many split.
 */
export const frenchPlural = (choice: number, choicesLength: number): number => {
  const n = Math.abs(choice)
  if (choicesLength === 2) return n >= 2 ? 1 : 0
  return Math.min(n, 2)
}
