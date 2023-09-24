// graphql/mutations.ts

import { gql } from "@apollo/client";

export const CREATE_ORDER_MUTATION = gql`
    mutation ($orderProductInput: [OrderProductInput!]!) {
        createOrder(products: $orderProductInput) {
            molliePaymentId
            molliePaymentUrl
            products {
                id
                pivot {
                    quantity
                }
            }
        }
    }
`;

export const UPDATE_ORDER_MUTATION = gql`
    mutation ($status: OrderStatus!, $id: ID!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            status
        }
    }
`;
