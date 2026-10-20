import type { NextRequest } from "next/server";

/**
 * Read the caller IP from the platform-provided headers.
 *
 * Vercel sets x-real-ip to the address observed by its edge. Prefer that
 * canonical value over x-forwarded-for, whose earlier entries may be supplied
 * by a client when requests pass through an additional proxy. If x-real-ip is
 * unavailable, use the rightmost x-forwarded-for entry (the value added by the
 * closest trusted proxy), never the leftmost entry.
 */
export function getClientIp(req: Pick<NextRequest, "headers">): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const candidates = forwarded.split(",").map((value) => value.trim()).filter(Boolean);
    if (candidates.length > 0) return candidates[candidates.length - 1];
  }

  return "unknown";
}
