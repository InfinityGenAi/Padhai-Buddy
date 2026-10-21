import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * Apply an authenticated-user/IP rate limit consistently across API routes.
 * Store failures are reported as 503 and fail closed; actual quota exhaustion
 * is reported as 429. Both responses are non-cacheable and include Retry-After.
 */
export async function enforceRateLimit(
  identifier: string,
  maxRequests: number,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(identifier, maxRequests);
  if (result.allowed) return null;

  const unavailable = result.unavailable === true;
  const retryAfter = Math.max(1, result.retryAfter ?? 60);

  return NextResponse.json(
    {
      error: unavailable
        ? "Rate limiting is temporarily unavailable. Please try again shortly."
        : "Too many requests. Please wait before trying again.",
      code: unavailable ? "RATE_LIMIT_UNAVAILABLE" : "RATE_LIMITED",
      retryAfter,
    },
    {
      status: unavailable ? 503 : 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    },
  );
}
