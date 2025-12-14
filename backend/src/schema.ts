// backend/src/schema.ts
import { gql } from 'apollo-server';

export const typeDefs = gql`
  type Deal {
    id: ID!
    destination: String!
    price: Float!
    airline: String!
    createdAt: String!
  }

  type Query {
    activeDeals(destination: String, maxPrice: Float): [Deal!]!
    deal(id: ID!): Deal
  }

  type Mutation {
    createAlertRule(destination: String!, maxPrice: Float!): Boolean!
  }
`;
