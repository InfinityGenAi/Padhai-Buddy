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
  consume(
    key: string,
    now: number,
    windowMs: number,
    maxRequests: number,
  ): Promise<RateLimitResult>;
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

  async consume(
    key: string,
    now: number,
    windowMs: number,
    maxRequests: number,
  ): Promise<RateLimitResult> {
    // No await between read and write: this is atomic within this Node process.
    const existing = this.store.get(key);
    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: maxRequests - 1, resetAt };
    }

    if (existing.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;
    this.store.set(key, existing);
    return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt };
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

  async consume(
    key: string,
    now: number,
    windowMs: number,
    maxRequests: number,
  ): Promise<RateLimitResult> {
    await this.ensureConnected();

    // A single Redis Lua script makes read/increment/expiry atomic across
    // serverless instances. A GET followed by SET can lose concurrent updates
    // and let bursts exceed the configured limit.
    const script = `
      local now = tonumber(ARGV[1])
      local windowMs = tonumber(ARGV[2])
      local maxRequests = tonumber(ARGV[3])
      local raw = redis.call('GET', KEYS[1])
      local entry = nil

      if raw then
        entry = cjson.decode(raw)
        if tonumber(entry.resetAt) <= now then
          entry = nil
        end
      end

      if not entry then
        local resetAt = now + windowMs
        entry = { count = 1, resetAt = resetAt }
        redis.call('SET', KEYS[1], cjson.encode(entry), 'PX', windowMs)
        return { 1, maxRequests - 1, resetAt, 0 }
      end

      if tonumber(entry.count) >= maxRequests then
        local retryAfter = math.max(1, math.ceil((tonumber(entry.resetAt) - now) / 1000))
        return { 0, 0, tonumber(entry.resetAt), retryAfter }
      end

      entry.count = tonumber(entry.count) + 1
      local ttl = math.max(1, tonumber(entry.resetAt) - now)
      redis.call('SET', KEYS[1], cjson.encode(entry), 'PX', ttl)
      return { 1, maxRequests - tonumber(entry.count), tonumber(entry.resetAt), 0 }
    `;

    const redis = this.redis as {
      eval: (script: string, keys: string[], args: string[]) => Promise<unknown>;
    };
    // Unlike the legacy get/set helpers, do not suppress eval failures. The
    // caller fails closed when the shared limiter cannot make a decision.
    const rawResult = await redis.eval(
      script,
      [`ratelimit:${key}`],
      [String(now), String(windowMs), String(maxRequests)],
    );
    if (!Array.isArray(rawResult) || rawResult.length < 4) {
      throw new Error("Rate-limit store returned an invalid atomic result");
    }

    const [allowed, remaining, resetAt, retryAfter] = rawResult.map(Number);
    if (![allowed, remaining, resetAt, retryAfter].every(Number.isFinite)) {
      throw new Error("Rate-limit store returned non-numeric values");
    }
    return {
      allowed: allowed === 1,
      remaining,
      resetAt,
      ...(retryAfter > 0 ? { retryAfter } : {}),
    };
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
    // InMemoryRateLimitStore keeps entries in a private `store` Map; iterate
    // that map directly rather than pretending the store is a Map itself.
    const store = (rateLimitStore as unknown as { store: Map<string, RateLimitEntry> }).store;
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        await store.delete(key);
      }
    }
  }
}

export async function checkRateLimit(identifier: string, maxRequests?: number): Promise<RateLimitResult> {
  const now = Date.now();
  const maxReq = maxRequests ?? RATE_LIMIT_MAX_REQUESTS;

  if (now - lastCleanup > RATE_LIMIT_CLEANUP_MS) {
    await cleanup();
    lastCleanup = now;
  }

  try {
    return await rateLimitStore.consume(
      identifier,
      now,
      RATE_LIMIT_WINDOW_MS,
      Math.max(1, Math.floor(maxReq)),
    );
  } catch {
    // Fail closed whenever the store cannot make an atomic decision.
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      retryAfter: 60,
    };
  }
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
