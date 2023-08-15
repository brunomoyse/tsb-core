// graphql/queries.ts

import { gql } from "@apollo/client";

export const PRODUCTS_QUERY = gql`
    query ($first: Int!, $lang: Language!, $tags: [ID!], $search: String) {
        products(
            first: $first
            lang: $lang
            tags: $tags
            search: $search
        ) {
            data {
                id
                price
                code
                slug
                productTranslations(language: $lang) {
                    name
                    language
                }
            }
        }
    }
`;

export const ORDER_QUERY = gql`
    query ($lang: Language) {
        order (
            id: "99e3b686-6cb6-4281-b3cb-83479eb5b440"
        ) {
            id
            createdAt
            updatedAt
            paymentMode
            status
            stripeSessionId
            stripeCheckoutUrl
            user {
                id
            }
            products {
                id
                productTranslations (language: $lang) {
                    name
                }
                pivot {
                    quantity
                }

            }
        }
    }
`;
