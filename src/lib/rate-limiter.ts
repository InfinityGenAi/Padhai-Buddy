const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "20", 10);
const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

let lastCleanup = Date.now();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();

  if (now - lastCleanup > RATE_LIMIT_CLEANUP_MS) {
    cleanup();
    lastCleanup = now;
  }

  const existing = rateLimitStore.get(identifier);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(identifier, { count: 1, resetAt });
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
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    resetAt: existing.resetAt,
  };
}

export function getRateLimitConfig() {
  return {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  };
}
