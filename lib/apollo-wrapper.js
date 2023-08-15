// lib/apollo-provider.js
"use client";

import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const client = new ApolloClient({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:404/graphql',
    cache: new InMemoryCache(),
});

export function ApolloWrapper({ children }) {
    return (
        <ApolloProvider client={client}>
            {children}
        </ApolloProvider>
    );
}
