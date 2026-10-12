import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Tiny JSON cache over Redis. Entirely optional: if REDIS_URL isn't set, or
 * Redis is down, every call falls through to the database. A cache outage must
 * never break the API.
 */
let client: Redis | null = null;

function getClient(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on('error', (err) => console.warn('[cache] redis error:', err.message));
  }
  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* cache is best-effort */
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    /* cache is best-effort */
  }
}

export async function closeCache(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}

export const CACHE_KEYS = {
  liveCampaigns: 'campaigns:live',
} as const;
