const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('fr-BE', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
};

export { formatPrice };
