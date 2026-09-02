import { NextRequest, NextResponse } from "next/server";
import { adminAuth, initializationError } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

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

    const rateLimitResult = checkRateLimit("admin-login");
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

    const adminUid = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let customToken: string;
    try {
      customToken = await adminAuth.createCustomToken(adminUid, {
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
