import { NextRequest, NextResponse } from "next/server";
import { adminAuth, initializationError } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ADMIN_UID = "admin-stable-uid";

/**
 * ADMIN ARCHITECTURE NOTE:
 *
 * This implementation uses a SINGLE STABLE FIREBASE UID ("admin-stable-uid") for all admin sessions.
 *
 * CONSTRAINT: This architecture INTENTIONALLY SUPPORTS ONLY ONE ADMIN ACCOUNT.
 *
 * Implications:
 * - All admin logins share the same Firebase Auth identity (admin-stable-uid)
 * - Admin sessions cannot be individually tracked or revoked per admin user
 * - Audit trails will show all admin actions under the same UID
 * - If multiple people need admin access, they must share the ADMIN_SECRET
 * - Session revocation (logout) affects all admin sessions simultaneously
 *
 * If multiple distinct admin accounts are needed in the future, this must be redesigned to:
 * 1. Create individual Firebase Auth users for each admin
 * 2. Set custom claims (admin: true) on each admin user
 * 3. Use their actual Firebase UIDs for session tracking and audit logs
 * 4. Remove the ADMIN_UID constant and ADMIN_SECRET-based login
 *
 * SECURITY: ADMIN_SECRET must remain server-side only. Never expose to client.
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || initializationError) {
      return NextResponse.json(
        { error: initializationError || "Server configuration error" },
        { status: 500 },
      );
    }

    if (!ADMIN_SECRET) {
      return NextResponse.json(
        { error: "Admin secret not configured" },
        { status: 500 },
      );
    }

    const clientIp = getClientIp(req);
    const rateLimitKey = `admin-login:${clientIp}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 300),
          },
        },
      );
    }

    let body: { password?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    if (password !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 },
      );
    }

    let customToken: string;
    try {
      customToken = await adminAuth.createCustomToken(ADMIN_UID, {
        admin: true,
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to create auth token" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      customToken,
      message: "Admin authentication successful",
    });
  } catch (error: unknown) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
