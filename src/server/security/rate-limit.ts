import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getServerEnv } from "@/server/env";

export type RateLimitRuleKey =
  | "login_ip"
  | "login_account"
  | "signup_ip"
  | "forgot_password"
  | "reset_password"
  | "otp_account"
  | "resend_verification"
  | "media_upload"
  | "go_redirect"
  | "public_events";

export interface RateLimitRuleSpec {
  limit: number;
  windowSeconds: number;
  lockSeconds: number;
}

export const AUTH_RATE_LIMIT_RULES: Record<RateLimitRuleKey, RateLimitRuleSpec> = {
  login_ip: { limit: 5, windowSeconds: 60, lockSeconds: 900 },
  login_account: { limit: 10, windowSeconds: 3600, lockSeconds: 3600 },
  signup_ip: { limit: 3, windowSeconds: 3600, lockSeconds: 0 },
  forgot_password: { limit: 3, windowSeconds: 3600, lockSeconds: 0 },
  reset_password: { limit: 5, windowSeconds: 3600, lockSeconds: 0 },
  otp_account: { limit: 5, windowSeconds: 600, lockSeconds: 900 },
  resend_verification: { limit: 3, windowSeconds: 3600, lockSeconds: 0 },
  media_upload: { limit: 20, windowSeconds: 3600, lockSeconds: 0 },
  go_redirect: { limit: 30, windowSeconds: 60, lockSeconds: 0 },
  public_events: { limit: 60, windowSeconds: 60, lockSeconds: 0 },
} as const;

export interface RateLimitDecision {
  allowed: boolean;
  configured: boolean;
  remaining: number;
  retryAfterSeconds: number;
  newlyLocked: boolean;
}

export interface RateLimitBackend {
  checkLock(rule: RateLimitRuleKey, identifier: string): Promise<number>;
  consume(rule: RateLimitRuleKey, identifier: string): Promise<RateLimitDecision>;
  markKeyInvalidated(key: string, ttlSeconds: number): Promise<void>;
  isKeyInvalidated(key: string): Promise<boolean>;
  consumeOneTimeKey(key: string, ttlSeconds: number): Promise<boolean>;
  resetRule(rule: RateLimitRuleKey, identifier: string): Promise<void>;
}

function lockKey(rule: RateLimitRuleKey, identifier: string): string {
  return `bonuvo:rl:lock:${rule}:${identifier}`;
}

export function createUpstashRateLimitBackend(): RateLimitBackend | null {
  const env = getServerEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  const limiters = new Map<RateLimitRuleKey, Ratelimit>();
  for (const [key, spec] of Object.entries(AUTH_RATE_LIMIT_RULES) as Array<
    [RateLimitRuleKey, RateLimitRuleSpec]
  >) {
    limiters.set(
      key,
      new Ratelimit({
        redis,
        prefix: `bonuvo:rl:${key}`,
        limiter: Ratelimit.slidingWindow(spec.limit, `${spec.windowSeconds} s`),
        ephemeralCache: false,
      }),
    );
  }

  return {
    async checkLock(rule, identifier) {
      const ttl = await redis.ttl(lockKey(rule, identifier));
      return ttl > 0 ? ttl : 0;
    },

    async consume(rule, identifier) {
      const spec = AUTH_RATE_LIMIT_RULES[rule];
      const activeLockTtl = spec.lockSeconds > 0 ? await redis.ttl(lockKey(rule, identifier)) : -2;
      if (activeLockTtl > 0) {
        return {
          allowed: false,
          configured: true,
          remaining: 0,
          retryAfterSeconds: activeLockTtl,
          newlyLocked: false,
        };
      }

      const limiter = limiters.get(rule)!;
      const result = await limiter.limit(identifier);
      if (result.success) {
        return {
          allowed: true,
          configured: true,
          remaining: result.remaining,
          retryAfterSeconds: 0,
          newlyLocked: false,
        };
      }

      let newlyLocked = false;
      let retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      if (spec.lockSeconds > 0) {
        const setResult = await redis.set(lockKey(rule, identifier), "1", {
          ex: spec.lockSeconds,
          nx: true,
        });
        newlyLocked = setResult === "OK";
        retryAfterSeconds = spec.lockSeconds;
      }

      return {
        allowed: false,
        configured: true,
        remaining: 0,
        retryAfterSeconds,
        newlyLocked,
      };
    },

    async markKeyInvalidated(key, ttlSeconds) {
      await redis.set(`bonuvo:token:invalid:${key}`, "1", { ex: ttlSeconds });
    },

    async isKeyInvalidated(key) {
      const val = await redis.get<string>(`bonuvo:token:invalid:${key}`);
      return val === "1";
    },

    async consumeOneTimeKey(key, ttlSeconds) {
      const setResult = await redis.set(`bonuvo:token:used:${key}`, "1", {
        ex: ttlSeconds,
        nx: true,
      });
      return setResult === "OK";
    },

    async resetRule(rule, identifier) {
      const limiter = limiters.get(rule);
      if (limiter) {
        await limiter.resetUsedTokens(identifier);
      }
      await redis.del(lockKey(rule, identifier));
    },
  };
}

/**
 * Deterministic sliding-window backend strictly intended for automated unit/integration tests
 * where live Upstash network calls are prohibited (Plan.md section 12).
 */
export function createTestRateLimitBackend(
  nowFn: () => number = () => Date.now(),
): RateLimitBackend {
  const hits = new Map<string, number[]>();
  const locks = new Map<string, number>();
  const keys = new Map<string, number>();

  function getActiveTtlSeconds(storageKey: string, map: Map<string, number>): number {
    const expiresAt = map.get(storageKey);
    if (!expiresAt) return 0;
    const remainingMs = expiresAt - nowFn();
    if (remainingMs <= 0) {
      map.delete(storageKey);
      return 0;
    }
    return Math.max(1, Math.ceil(remainingMs / 1000));
  }

  return {
    async checkLock(rule, identifier) {
      return getActiveTtlSeconds(lockKey(rule, identifier), locks);
    },

    async consume(rule, identifier) {
      const spec = AUTH_RATE_LIMIT_RULES[rule];
      const keyLock = lockKey(rule, identifier);
      const currentLock = spec.lockSeconds > 0 ? getActiveTtlSeconds(keyLock, locks) : 0;
      if (currentLock > 0) {
        return {
          allowed: false,
          configured: true,
          remaining: 0,
          retryAfterSeconds: currentLock,
          newlyLocked: false,
        };
      }

      const now = nowFn();
      const windowMs = spec.windowSeconds * 1000;
      const hitKey = `${rule}:${identifier}`;
      const activeHits = (hits.get(hitKey) ?? []).filter((ts) => now - ts < windowMs);

      if (activeHits.length >= spec.limit) {
        hits.set(hitKey, activeHits);
        let newlyLocked = false;
        let retryAfterSeconds = Math.max(
          1,
          Math.ceil(((activeHits[0] ?? now) + windowMs - now) / 1000),
        );
        if (spec.lockSeconds > 0) {
          newlyLocked = getActiveTtlSeconds(keyLock, locks) === 0;
          locks.set(keyLock, now + spec.lockSeconds * 1000);
          retryAfterSeconds = spec.lockSeconds;
        }
        return {
          allowed: false,
          configured: true,
          remaining: 0,
          retryAfterSeconds,
          newlyLocked,
        };
      }

      activeHits.push(now);
      hits.set(hitKey, activeHits);
      return {
        allowed: true,
        configured: true,
        remaining: spec.limit - activeHits.length,
        retryAfterSeconds: 0,
        newlyLocked: false,
      };
    },

    async markKeyInvalidated(key, ttlSeconds) {
      keys.set(`invalid:${key}`, nowFn() + ttlSeconds * 1000);
    },

    async isKeyInvalidated(key) {
      return getActiveTtlSeconds(`invalid:${key}`, keys) > 0;
    },

    async consumeOneTimeKey(key, ttlSeconds) {
      const storageKey = `used:${key}`;
      if (getActiveTtlSeconds(storageKey, keys) > 0) {
        return false;
      }
      keys.set(storageKey, nowFn() + ttlSeconds * 1000);
      return true;
    },

    async resetRule(rule, identifier) {
      hits.delete(`${rule}:${identifier}`);
      locks.delete(lockKey(rule, identifier));
    },
  };
}
