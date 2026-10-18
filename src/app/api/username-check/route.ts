import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";

const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "api",
  "www",
  "mail",
  "email",
  "contact",
  "privacy",
  "terms",
  "about",
  "blog",
  "docs",
  "status",
  "login",
  "signup",
  "signin",
  "logout",
  "auth",
  "dashboard",
  "profile",
  "settings",
  "padhai",
  "padhaibuddy",
  "system",
  "null",
  "undefined",
  "true",
  "false",
]);

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function GET(req: NextRequest) {
  try {
    if (!adminDb || initializationError) {
      return NextResponse.json({ available: false, error: "Server not initialized" }, { status: 500 });
    }

    const ip = getClientIp(req);
    const rateLimitResult = await checkRateLimit(`username-check:${ip}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { available: false, error: "Too many requests. Please try again later.", retryAfter: rateLimitResult.retryAfter },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter || 60) } },
      );
    }

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ available: false, error: "Username is required" }, { status: 400 });
    }

    // Normalize username to lowercase for case-insensitive comparison
    const normalizedUsername = username.toLowerCase().trim();

    // Validate username format: 3-20 chars, lowercase letters, numbers, underscores, periods only
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return NextResponse.json({ available: false, error: "Invalid username format" }, { status: 400 });
    }

    // Check reserved usernames
    if (RESERVED_USERNAMES.has(normalizedUsername)) {
      return NextResponse.json({ available: false, error: "Username is reserved" }, { status: 409 });
    }

    // Check if username already exists in Firestore
    const usernameRef = adminDb.collection("usernameMappings").doc(normalizedUsername);
    const usernameSnap = await usernameRef.get();

    if (usernameSnap.exists) {
      // Username already taken - do NOT reveal which UID owns it
      return NextResponse.json({ available: false, error: "Username already taken" }, { status: 409 });
    }

    return NextResponse.json({ available: true });
  } catch (error: unknown) {
    console.error("[USERNAME_CHECK] unexpected error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ available: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
