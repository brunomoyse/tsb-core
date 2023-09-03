// client.js

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_SERVER_ENDPOINT;

const httpLink = new HttpLink({
    uri: GRAPHQL_URL,
});

const client: ApolloClient<any> = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache()
});

export default client;
