// lib/server/client.js
import { HttpLink } from "@apollo/client";
import {
    NextSSRInMemoryCache,
    NextSSRApolloClient,
} from "@apollo/experimental-nextjs-app-support/ssr";
import { registerApolloClient } from "@apollo/experimental-nextjs-app-support/rsc";

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_SERVER_ENDPOINT;
new NextSSRApolloClient({
    cache: new NextSSRInMemoryCache(),
    link: new HttpLink({
        uri: GRAPHQL_URL,
    }),
});

export const { getClient } = registerApolloClient(() => {
    return new NextSSRApolloClient({
        cache: new NextSSRInMemoryCache(),
        link: new HttpLink({
            uri: GRAPHQL_URL,
        }),
    });
});
