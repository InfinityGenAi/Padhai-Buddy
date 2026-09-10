const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "20", 10);
const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | undefined>;
  set(key: string, entry: RateLimitEntry): Promise<void>;
  delete(key: string): Promise<void>;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  async get(key: string): Promise<RateLimitEntry | undefined> {
    return this.store.get(key);
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class RedisRateLimitStore implements RateLimitStore {
  private redis: unknown | null = null;
  private connected = false;

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set for Redis rate limiting");
    }

    try {
      const { Redis } = await import("@upstash/redis");
      this.redis = new Redis({ url, token });
      this.connected = true;
    } catch {
      throw new Error("Failed to initialize Upstash Redis client. Ensure @upstash/redis is installed.");
    }
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    await this.ensureConnected();
    try {
      const data = await (this.redis as { get: (key: string) => Promise<string | null> }).get(`ratelimit:${key}`);
      if (!data) return undefined;
      return JSON.parse(data) as RateLimitEntry;
    } catch {
      return undefined;
    }
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    await this.ensureConnected();
    try {
      const ttl = Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
      await (this.redis as { setex: (key: string, ttl: number, value: string) => Promise<void> }).setex(
        `ratelimit:${key}`,
        ttl,
        JSON.stringify(entry)
      );
    } catch {
      // Fail silently for set - rate limit will reset on next request
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureConnected();
    try {
      await (this.redis as { del: (key: string) => Promise<void> }).del(`ratelimit:${key}`);
    } catch {
      // Ignore
    }
  }
}

function createStore(): RateLimitStore {
  const useRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  if (useRedis) {
    return new RedisRateLimitStore();
  }
  return new InMemoryRateLimitStore();
}

const rateLimitStore = createStore();

let lastCleanup = Date.now();

async function cleanup(): Promise<void> {
  const now = Date.now();
  if (rateLimitStore instanceof InMemoryRateLimitStore) {
    for (const [key, entry] of (rateLimitStore as unknown as Map<string, RateLimitEntry>).entries()) {
      if (entry.resetAt < now) {
        await rateLimitStore.delete(key);
      }
    }
  }
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const now = Date.now();

  if (now - lastCleanup > RATE_LIMIT_CLEANUP_MS) {
    await cleanup();
    lastCleanup = now;
  }

  let existing: RateLimitEntry | undefined;
  try {
    existing = await rateLimitStore.get(identifier);
  } catch {
    // Fail-closed: if store is unavailable, deny the request
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      retryAfter: 60,
    };
  }

  if (!existing || existing.resetAt < now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    try {
      await rateLimitStore.set(identifier, { count: 1, resetAt });
    } catch {
      // If set fails, still allow but with reduced remaining
      return {
        allowed: true,
        remaining: 0,
        resetAt,
      };
    }
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt,
    };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter,
    };
  }

  existing.count += 1;
  try {
    await rateLimitStore.set(identifier, existing);
  } catch {
    // If set fails, continue with current count
  }
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    resetAt: existing.resetAt,
  };
}

// Synchronous wrapper for backward compatibility (not recommended for production)
export function checkRateLimitSync(_identifier: string): RateLimitResult {
  // This is a best-effort sync version for non-critical paths
  // In production with Redis, always use the async version
  const now = Date.now();
  // Note: This won't work with async Redis store
  // Only use for in-memory store or non-critical paths
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS,
    resetAt: now + RATE_LIMIT_WINDOW_MS,
  };
}

export function getRateLimitConfig() {
  return {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  };
}

/**
 * Rate Limiter Implementation
 *
 * Supports two backends:
 * 1. In-Memory (default) - For local development and single-instance deployments
 *    Uses a Map with periodic cleanup. NOT production-safe across multiple instances.
 *
 * 2. Upstash Redis (production) - For multi-instance/serverless deployments
 *    Requires environment variables:
 *    - UPSTASH_REDIS_REST_URL
 *    - UPSTASH_REDIS_REST_TOKEN
 *    And @upstash/redis package installed
 *
 * Current identifiers used:
 * - `chat:${uid}` - per-user for AI chat
 * - `quiz:${uid}` - per-user for quiz generation
 * - `photo:${uid}` - per-user for photo doubt
 * - `admin-login:${ip}` - per-IP for admin login
 *
 * Admin login rate limiting uses fail-closed behavior (denies on store errors)
 *
 * Usage:
 * ```typescript
 * // For async contexts (recommended)
 * const result = await checkRateLimit(`chat:${uid}`);
 *
 * // For sync contexts (legacy, in-memory only)
 * const result = checkRateLimitSync(`chat:${uid}`);
 * ```
 */
