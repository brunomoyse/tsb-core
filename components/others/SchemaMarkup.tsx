// components/SchemaMarkup.tsx

// @ts-ignore
import { RestaurantSchema } from '../../types/SchemaTypes';

const SchemaMarkup: React.FC = () => {
    const schema: RestaurantSchema = {
        "@context": "http://schema.org",
        "@type": "Restaurant",
        name: "[Your Restaurant Name]",
        address: {
            "@type": "PostalAddress",
            streetAddress: "[Your Street Address]",
            addressLocality: "Liège",
            addressCountry: "Belgium"
        },
        telephone: "[Your Phone Number]",
        menu: "https://tokyosushibarliege.be/menu",
        acceptsReservations: true,
        servesCuisine: "Sushi, Japanese",
        priceRange: "€€"
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        ></script>
    );
};

export default SchemaMarkup;
