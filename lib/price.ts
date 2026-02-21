export function formatPrice(price: number | string): string {
    return new Intl.NumberFormat("fr-BE", {
        style: "currency",
        currency: "EUR",
    }).format(Number(price));
}
