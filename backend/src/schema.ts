// backend/src/schema.ts
import { gql } from 'apollo-server';

export const typeDefs = gql`
  enum DealSort {
    NEWEST
    PRICE_ASC
  }

  type Deal {
    id: ID!
    destination: String!
    price: Float!
    airline: String!
    createdAt: String!
  }

  type Query {
    activeDeals(destination: String, maxPrice: Float, sortBy: DealSort): [Deal!]!
    deal(id: ID!): Deal
  }

  type Mutation {
    createAlertRule(destination: String!, maxPrice: Float!): Boolean!
  }
`;
