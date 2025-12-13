import Redis from 'ioredis';
import { appConfig } from './config';

export const redis = new Redis(appConfig.redisUrl);

redis.on('error', (error) => {
  console.error('[backend] Redis error', error);
});
