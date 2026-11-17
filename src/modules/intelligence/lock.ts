import "server-only";

import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { getServerEnv } from "@/server/env";

export interface JobLockBackend {
  acquire(key: string, ttlSeconds: number): Promise<string | null>;
  release(key: string, token: string): Promise<void>;
}

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export function createUpstashLockBackend(): JobLockBackend | null {
  const env = getServerEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return {
    async acquire(key, ttlSeconds) {
      const token = randomUUID();
      const result = await redis.set(`bonuvo:lock:${key}`, token, {
        nx: true,
        ex: ttlSeconds,
      });
      return result === "OK" ? token : null;
    },

    async release(key, token) {
      await redis.eval(RELEASE_SCRIPT, [`bonuvo:lock:${key}`], [token]);
    },
  };
}

const localLocks = new Map<string, { token: string; expiresAt: number }>();

export function createInMemoryLockBackend(nowFn: () => number = () => Date.now()): JobLockBackend {
  return {
    async acquire(key, ttlSeconds) {
      const now = nowFn();
      const current = localLocks.get(key);
      if (current && current.expiresAt > now) {
        return null;
      }
      const token = randomUUID();
      localLocks.set(key, { token, expiresAt: now + ttlSeconds * 1000 });
      return token;
    },

    async release(key, token) {
      const current = localLocks.get(key);
      if (current && current.token === token) {
        localLocks.delete(key);
      }
    },
  };
}

export function resolveJobLockBackend(): JobLockBackend | null {
  const upstash = createUpstashLockBackend();
  if (upstash) return upstash;
  const env = getServerEnv();
  if (env.APP_ENV === "preview" || env.APP_ENV === "production") {
    return null;
  }
  return createInMemoryLockBackend();
}
