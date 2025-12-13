import { config as loadEnv } from 'dotenv';

loadEnv();

export const ragConfig = {
  port: Number(process.env.RAG_PORT ?? 7070),
  pg: {
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? 'tripstreamer',
    password: process.env.PGPASSWORD ?? 'tripstreamer',
    database: process.env.PGDATABASE ?? 'tripstreamer',
  },
  collection: process.env.RAG_COLLECTION ?? 'default',
  maxDocuments: Number(process.env.RAG_MAX_DOCS ?? 5000),
};
