import { NextRequest, NextResponse } from "next/server";
import { adminAuth, initializationError } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getDashboardStreak } from "@/lib/streak";

export async function GET(req: NextRequest) {
  try {
    if (!adminAuth || initializationError) {
      return NextResponse.json(
        { error: initializationError || "Server configuration error" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(`streak:${decoded.uid}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    const streak = await getDashboardStreak(decoded.uid);

    return NextResponse.json({
      streak,
    }, {
      headers: {
        "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      },
    });
  } catch (error: unknown) {
    console.error("[STREAK] unexpected error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: "An unexpected error occurred", _dev: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}