import { gql } from '@apollo/client';

export const ActiveDealsDocument = gql`
  query ActiveDeals($destination: String, $maxPrice: Float, $sortBy: DealSort) {
    activeDeals(destination: $destination, maxPrice: $maxPrice, sortBy: $sortBy) {
      id
      destination
      price
      airline
      createdAt
    }
  }
`;

export interface Deal {
  id: string;
  destination: string;
  price: number;
  airline: string;
  createdAt: string;
}

export interface ActiveDealsQueryResult {
  activeDeals: Deal[];
}

export type DealSort = 'NEWEST' | 'PRICE_ASC';
