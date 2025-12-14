import { gql } from '@apollo/client';

export const ActiveDealsDocument = gql`
  query ActiveDeals($destination: String, $maxPrice: Float) {
    activeDeals(destination: $destination, maxPrice: $maxPrice) {
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
