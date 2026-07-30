import { Redis } from '@upstash/redis';

const MISSING_UPSTASH_ENV_MESSAGE =
  'Missing Upstash Redis environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(MISSING_UPSTASH_ENV_MESSAGE);
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}
