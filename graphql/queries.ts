// graphql/queries.ts

import { gql } from "@apollo/client";

export const PRODUCTS_QUERY = gql`
    query ($first: Int!, $page: Int!, $lang: Language!, $tags: [ID!], $search: String) {
        products(
            first: $first
            page: $page
            lang: $lang
            tags: $tags
            search: $search
        ) {
            paginatorInfo {
                count
                currentPage
                firstItem
                hasMorePages
                lastItem
                lastPage
                perPage
                total
            }
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
    query ($lang: Language, $id: ID!) {
        order (
            id: $id
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

export const TAGS_WITH_PRODUCTS_QUERY = gql`
    query ($lang: Language!) {
        tags {
            id
            productTagTranslations(language: $lang) {
                name
            }
            products {
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

