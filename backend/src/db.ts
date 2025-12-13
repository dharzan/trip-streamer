import { Pool } from 'pg';
import { appConfig } from './config';

export const dbPool = new Pool(appConfig.pg);

export async function ensureSchema() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS deals (
      id UUID PRIMARY KEY,
      destination TEXT NOT NULL,
      price NUMERIC NOT NULL,
      airline TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export interface DealRow {
  id: string;
  destination: string;
  price: string;
  airline: string;
  created_at: Date;
}
