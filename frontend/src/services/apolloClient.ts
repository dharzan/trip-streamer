import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

const uri = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/';

export const client = new ApolloClient({
  link: new HttpLink({ uri }),
  cache: new InMemoryCache(),
  connectToDevTools: import.meta.env.DEV,
});
