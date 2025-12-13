import { config as loadEnv } from 'dotenv';

loadEnv();

export const appConfig = {
  port: Number(process.env.PORT ?? 4000),
  pg: {
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? 'tripstreamer',
    password: process.env.PGPASSWORD ?? 'tripstreamer',
    database: process.env.PGDATABASE ?? 'tripstreamer',
  },
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  activeDealsTtlSeconds: Number(process.env.ACTIVE_DEALS_TTL ?? 20),
};
