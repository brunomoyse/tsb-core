// graphql/queries.ts

import { gql } from "@apollo/client";

export const PRODUCTS_QUERY = gql`
    query ($first: Int!, $page: Int!, $locale: Locale!, $tags: [ID!], $search: String) {
        products(
            first: $first
            page: $page
            locale: $locale
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
                productTranslations(locale: $locale) {
                    name
                    locale
                }
            }
        }
    }
`;

export const ORDER_QUERY = gql`
    query ($locale: Locale, $id: ID!) {
        order (
            id: $id
        ) {
            id
            createdAt
            updatedAt
            paymentMode
            status
            # stripeSessionId
            # stripeCheckoutUrl
            molliePaymentId
            molliePaymentUrl
            user {
                id
            }
            products {
                id
                productTranslations (locale: $locale) {
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
    query ($locale: Locale!) {
        tags {
            id
            productTagTranslations(locale: $locale) {
                name
            }
            products {
                id
                price
                code
                slug
                productTranslations(locale: $locale) {
                    name
                    locale
                }
            }
        }
    }
`;

