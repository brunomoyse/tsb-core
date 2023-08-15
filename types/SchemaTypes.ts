// types/SchemaTypes.ts

interface Address {
    "@type": string;
    streetAddress: string;
    addressLocality: string;
    addressCountry: string;
}

interface RestaurantSchema {
    "@context": string;
    "@type": string;
    name: string;
    address: Address;
    telephone: string;
    menu: string;
    acceptsReservations: boolean;
    servesCuisine: string;
    priceRange: string;
}
