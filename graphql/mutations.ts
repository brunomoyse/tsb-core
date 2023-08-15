// graphql/mutations.ts

import { gql } from "@apollo/client";

export const CREATE_ORDER_MUTATION = gql`
    mutation ($orderProductInput: [OrderProductInput!]!) {
        createOrder(products: $orderProductInput) {
            stripeCheckoutUrl
            products {
                id
                pivot {
                    quantity
                }
            }
        }
    }
`;
