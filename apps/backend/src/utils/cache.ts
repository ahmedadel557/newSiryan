import { redisClient } from '../config/redis';

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!redisClient.isReady) return null;
    try {
      const raw = await redisClient.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      console.error(`[cache] get "${key}":`, err);
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!redisClient.isReady) return;
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.error(`[cache] set "${key}":`, err);
    }
  },

  async del(...keys: string[]): Promise<void> {
    if (!redisClient.isReady) return;
    try {
      if (keys.length === 1) {
        await redisClient.del(keys[0]);
      } else {
        await redisClient.del(keys);
      }
    } catch (err) {
      console.error(`[cache] del [${keys.join(', ')}]:`, err);
    }
  },
};
