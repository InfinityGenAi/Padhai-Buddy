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
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
    }

    const ip = getClientIp(req);
    const rateLimitResult = await checkRateLimit(`username-claim:${ip}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfter: rateLimitResult.retryAfter },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter || 60) } },
      );
    }

    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
    }
    const db = adminDb;
    const auth = adminAuth;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    let body: { username?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { username } = body;
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const normalizedUsername = username.toLowerCase().trim();

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
    }

    if (RESERVED_USERNAMES.has(normalizedUsername)) {
      return NextResponse.json({ error: "Username is reserved" }, { status: 409 });
    }

    const uid = decoded.uid;

    // Atomic claim using Firestore transaction (admin SDK)
    const usernameRef = db.doc("usernameMappings/" + normalizedUsername);
    const userRef = db.doc("users/" + uid);

    try {
      await db.runTransaction(async (transaction) => {
        const usernameSnap = await transaction.get(usernameRef);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists) {
          throw new Error("User profile not found");
        }

        const userData = userSnap.data() as { username?: string } | undefined;

        // If user already has this username, it's idempotent success.
        // However, the mapping may be missing (e.g. created by an older client path).
        // Validate ownership and repair/create the mapping atomically rather than returning early.
        if (userData?.username === normalizedUsername) {
          if (!usernameSnap.exists) {
            // Mapping missing: create it atomically for this owning user.
            transaction.set(usernameRef, {
              uid,
              claimedAt: Date.now(),
              updatedAt: Date.now(),
            });
          } else {
            const existingData = usernameSnap.data() as { uid: string } | undefined;
            if (existingData?.uid && existingData?.uid !== uid) {
              throw new Error("USERNAME_TAKEN");
            }
          }
          return;
        }

        // If username mapping exists and belongs to a different user, fail
        if (usernameSnap.exists) {
          const existingData = usernameSnap.data() as { uid: string } | undefined;
          if (existingData?.uid !== uid) {
            throw new Error("USERNAME_TAKEN");
          }
        }

        // Release old username mapping if exists
        const oldUsername = userData?.username;
        if (oldUsername && oldUsername !== normalizedUsername) {
          const oldRef = db.doc("usernameMappings/" + oldUsername.toLowerCase());
          const oldSnap = await transaction.get(oldRef);
          if (oldSnap.exists) {
            const oldData = oldSnap.data() as { uid: string } | undefined;
            if (oldData?.uid === uid) {
              transaction.delete(oldRef);
            }
          }
        }

        // Claim the new username
        transaction.set(usernameRef, {
          uid,
          claimedAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Update user profile
        transaction.update(userRef, { username: normalizedUsername });
      });

      return NextResponse.json({ success: true, username: normalizedUsername });
    } catch (txErr: unknown) {
      const msg = txErr instanceof Error ? txErr.message : "Transaction failed";
      if (msg === "USERNAME_TAKEN") {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      throw txErr;
    }
  } catch (error: unknown) {
    console.error("[USERNAME_CLAIM] unexpected error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
